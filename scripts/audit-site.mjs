import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';

const DIST_DIR = path.resolve('dist');
const LOCAL_URL = 'http://localhost:4321';

console.log('=== STEP 1: STATIC BUILD AUDIT ===');

if (!fs.existsSync(DIST_DIR)) {
  console.error('Error: dist directory does not exist. Run npm run build first.');
  process.exit(1);
}

// 1. Collect all HTML files in dist/
function getAllFiles(dir, ext = '.html') {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, ext));
    } else if (file.endsWith(ext)) {
      results.push(fullPath);
    }
  });
  return results;
}

const htmlFiles = getAllFiles(DIST_DIR, '.html');
console.log(`Found ${htmlFiles.length} HTML pages in dist/`);

let brokenLinks = [];
let missingAssets = [];
let devToolbarFoundInDist = false;
let blenderFoundInDistTools = false;

htmlFiles.forEach((file) => {
  const content = fs.readFileSync(file, 'utf-8');
  const relPath = path.relative(DIST_DIR, file);

  // Check if Astro dev toolbar was included anywhere in dist
  if (content.includes('astro-dev-toolbar')) {
    devToolbarFoundInDist = true;
  }

  // Check if blender tool page exists in dist/tools/blender
  if (file.includes('tools/blender')) {
    blenderFoundInDistTools = true;
  }

  // Check all internal href links
  const hrefMatches = content.matchAll(/href="(\/[^"#?]*)/g);
  for (const match of hrefMatches) {
    const targetPath = match[1];
    if (targetPath.startsWith('/_astro/') || targetPath.startsWith('/favicon.')) {
      const assetPath = path.join(DIST_DIR, targetPath.slice(1));
      if (!fs.existsSync(assetPath)) {
        missingAssets.push({ page: relPath, asset: targetPath });
      }
      continue;
    }

    // Normalized file path for internal route
    let checkFile = path.join(DIST_DIR, targetPath, 'index.html');
    let directFile = path.join(DIST_DIR, targetPath);
    if (!fs.existsSync(checkFile) && !fs.existsSync(directFile)) {
      brokenLinks.push({ page: relPath, link: targetPath });
    }
  }

  // Check all img src attributes
  const srcMatches = content.matchAll(/src="(\/[^"?]*)/g);
  for (const match of srcMatches) {
    const srcPath = match[1];
    const assetPath = path.join(DIST_DIR, srcPath.slice(1));
    if (!fs.existsSync(assetPath)) {
      missingAssets.push({ page: relPath, asset: srcPath });
    }
  }
});

console.log(`✓ Broken internal links: ${brokenLinks.length}`);
if (brokenLinks.length > 0) {
  console.log('Broken links found:', brokenLinks);
}

console.log(`✓ Missing images or assets: ${missingAssets.length}`);
if (missingAssets.length > 0) {
  console.log('Missing assets found:', missingAssets);
}

console.log(`✓ Dev Toolbar in production dist: ${devToolbarFoundInDist ? 'FAIL (found)' : 'PASS (clean - completely omitted)'}`);
console.log(`✓ Blender in dist/tools/: ${blenderFoundInDistTools ? 'FAIL (found)' : 'PASS (removed)'}`);

console.log('\n=== STEP 2: CHROME HEADLESS & CDP INTERACTION TEST ===');

// Helper to query CDP endpoints
async function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const chromeProcess = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9222',
  '--no-first-run',
  '--no-default-browser-check',
  '--user-data-dir=/tmp/chrome-test-profile-' + Date.now()
]);

// Wait for Chrome CDP port to be active
async function waitForCdp(retries = 20) {
  for (let i = 0; i < retries; i++) {
    try {
      const version = await getJson('http://127.0.0.1:9222/json/version');
      if (version.webSocketDebuggerUrl) return version;
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('Chrome CDP did not become ready in time');
}

try {
  await waitForCdp();
  console.log('✓ Chrome launched in headless mode with CDP on port 9222');

  const targets = await getJson('http://127.0.0.1:9222/json/list');
  const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

  let msgId = 1;
  const pending = new Map();
  const consoleMessages = [];
  const pageErrors = [];

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
    }

    if (data.method === 'Runtime.consoleAPICalled') {
      consoleMessages.push(data.params);
    }
    if (data.method === 'Runtime.exceptionThrown') {
      pageErrors.push(data.params);
    }
  };

  await new Promise((r) => ws.onopen = r);

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  // Enable domains
  await send('Page.enable');
  await send('Runtime.enable');
  await send('DOM.enable');

  console.log(`Navigating to ${LOCAL_URL}...`);
  await send('Page.navigate', { url: LOCAL_URL });

  // Wait for page load
  await new Promise((r) => setTimeout(r, 2000));

  // Evaluate helper
  async function evalJs(expr) {
    const trimmed = expr.trim();
    const wrapped = (trimmed.includes(';') || trimmed.includes('return') || trimmed.includes('\n'))
      ? `(() => {\n${trimmed}\n})()`
      : trimmed;
    const res = await send('Runtime.evaluate', { expression: wrapped, returnByValue: true });
    if (res.exceptionDetails) {
      console.error('Eval exception:', res.exceptionDetails.text, res.exceptionDetails.exception?.description);
    }
    return res.result?.value;
  }

  // Test 1: Check Dev Toolbar on live dev page
  const devToolbarPresent = await evalJs(`!!document.querySelector('astro-dev-toolbar')`);
  console.log(`✓ Live devToolbar element present: ${devToolbarPresent ? 'YES' : 'NO (Disabled in config)'}`);

  // Test 2: Check total tool cards and tutorial cards
  const totalCards = await evalJs(`document.querySelectorAll('[data-tool-card]').length`);
  const toolCards = await evalJs(`document.querySelectorAll('[data-tool-card]:not([data-type="tutorial"])').length`);
  const tutorialCards = await evalJs(`document.querySelectorAll('[data-tool-card][data-type="tutorial"]').length`);
  console.log(`✓ Total cards on page: ${totalCards} (${toolCards} tools/plugins/utilities, ${tutorialCards} tutorials/channels)`);

  // Test 3: Test "Editing Softwares" Tab
  console.log('\nTesting "Editing Softwares" Tab...');
  await evalJs(`
    const btn = document.querySelector('[data-tab-type="software"]');
    btn?.click();
  `);
  await new Promise((r) => setTimeout(r, 300));

  const visibleSoftwares = await evalJs(`
    return Array.from(document.querySelectorAll('[data-tool-card]'))
      .filter(c => c.style.display !== 'none')
      .map(c => ({
        title: c.getAttribute('data-title'),
        type: c.getAttribute('data-type'),
        gem: c.getAttribute('data-gem')
      }));
  `);
  console.log(`✓ Visible cards in Editing Softwares: ${visibleSoftwares.length}`);
  const nonSoftwareInSoftwareTab = visibleSoftwares.filter(c => c.type !== 'software');
  console.log(`✓ Non-software items in Editing Softwares: ${nonSoftwareInSoftwareTab.length}`);
  const hasBlender = visibleSoftwares.some(c => c.title.includes('blender'));
  console.log(`✓ Blender in Editing Softwares: ${hasBlender ? 'FAIL (Blender is present)' : 'PASS (Blender removed)'}`);

  // Test 4: Test "Must Have Utilities" Tab
  console.log('\nTesting "Must Have Utilities" Tab...');
  await evalJs(`
    const btn = document.querySelector('[data-tab-type="gems"]');
    btn?.click();
  `);
  await new Promise((r) => setTimeout(r, 300));

  const visibleGems = await evalJs(`
    return Array.from(document.querySelectorAll('[data-tool-card]'))
      .filter(c => c.style.display !== 'none')
      .map(c => ({
        title: c.getAttribute('data-title'),
        type: c.getAttribute('data-type'),
        gem: c.getAttribute('data-gem')
      }));
  `);
  console.log(`✓ Visible cards in Must Have Utilities: ${visibleGems.length}`);
  const nonGemsInGemsTab = visibleGems.filter(c => c.gem !== 'true' || c.type === 'software' || c.type === 'tutorial');
  console.log(`✓ Non-gem/software/tutorial items in Must Have: ${nonGemsInGemsTab.length}`);

  // Test 5: Test "Plugins" Tab
  console.log('\nTesting "Plugins" Tab...');
  await evalJs(`
    const btn = document.querySelector('[data-tab-type="plugin"]');
    btn?.click();
  `);
  await new Promise((r) => setTimeout(r, 300));

  const visiblePlugins = await evalJs(`
    return Array.from(document.querySelectorAll('[data-tool-card]'))
      .filter(c => c.style.display !== 'none')
      .map(c => ({
        title: c.getAttribute('data-title'),
        type: c.getAttribute('data-type')
      }));
  `);
  console.log(`✓ Visible cards in Plugins: ${visiblePlugins.length}`);
  const nonPluginsInPluginsTab = visiblePlugins.filter(c => c.type !== 'plugin');
  console.log(`✓ Non-plugin items in Plugins tab: ${nonPluginsInPluginsTab.length}`);

  // Test 6: Test "Learning" Tab & Channel Sequence
  console.log('\nTesting "Learning" Tab & Niche Sequences...');
  await evalJs(`
    const btn = document.querySelector('[data-tab-type="tutorial"]');
    btn?.click();
  `);
  await new Promise((r) => setTimeout(r, 300));

  const nicheBarVisible = await evalJs(`
    const bar = document.getElementById('learning-niche-bar');
    return !bar?.classList.contains('hidden');
  `);
  console.log(`✓ Learning Niche Sub-Bar visible: ${nicheBarVisible ? 'YES' : 'NO'}`);

  // Test Premiere Pro sequence
  await evalJs(`
    const btn = document.querySelector('.niche-tab-btn[data-niche="Premiere Pro"]');
    btn?.click();
  `);
  await new Promise((r) => setTimeout(r, 300));

  const premCreators = await evalJs(`
    return Array.from(document.querySelectorAll('[data-tool-card]'))
      .filter(c => c.style.display !== 'none')
      .map(c => c.getAttribute('data-title'));
  `);
  console.log('✓ Premiere Pro channels order:', premCreators.slice(0, 8));

  // Test Filmmaking sequence (Skymography #1)
  await evalJs(`
    const btn = document.querySelector('.niche-tab-btn[data-niche="Filmmaking"]');
    btn?.click();
  `);
  await new Promise((r) => setTimeout(r, 300));

  const filmCreators = await evalJs(`
    return Array.from(document.querySelectorAll('[data-tool-card]'))
      .filter(c => c.style.display !== 'none')
      .map(c => c.getAttribute('data-title'));
  `);
  console.log('✓ Filmmaking channels top:', filmCreators.slice(0, 3));

  // Test 7: Test Search input with Fuse.js / text filter
  console.log('\nTesting Search functionality...');
  await evalJs(`
    const allBtn = document.querySelector('[data-tab-type=""]');
    allBtn?.click();
  `);
  await new Promise((r) => setTimeout(r, 300));

  await evalJs(`
    const search = document.getElementById('filter-search-input');
    if (search) {
      search.value = 'Javier';
      search.dispatchEvent(new Event('input'));
    }
  `);
  await new Promise((r) => setTimeout(r, 300));

  const searchResults = await evalJs(`
    return Array.from(document.querySelectorAll('[data-tool-card]'))
      .filter(c => c.style.display !== 'none')
      .map(c => c.getAttribute('data-title'));
  `);
  console.log(`✓ Search for "Javier" matched: ${searchResults.join(', ')}`);

  // Reset search
  await evalJs(`
    const search = document.getElementById('filter-search-input');
    if (search) {
      search.value = '';
      search.dispatchEvent(new Event('input'));
    }
    const allBtn = document.querySelector('[data-tab-type=""]');
    allBtn?.click();
  `);
  await new Promise((r) => setTimeout(r, 300));

  // Test 8: Check Command Palette Modal
  console.log('\nTesting Command Palette (Cmd + K)...');
  await evalJs(`
    const trigger = document.getElementById('search-palette-trigger');
    trigger?.click();
  `);
  await new Promise((r) => setTimeout(r, 300));

  const paletteOpen = await evalJs(`
    const modal = document.getElementById('command-palette-backdrop');
    return !modal?.classList.contains('hidden');
  `);
  console.log(`✓ Command palette opened on trigger click: ${paletteOpen ? 'PASS' : 'FAIL'}`);

  // Close palette with Escape
  await evalJs(`
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  `);
  await new Promise((r) => setTimeout(r, 300));

  // Test 9: Responsive Layout Check (375px mobile viewport)
  console.log('\nTesting Mobile Viewport (375px)...');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 375,
    height: 812,
    deviceScaleFactor: 2,
    mobile: true
  });
  await new Promise((r) => setTimeout(r, 500));

  const bodyScrollWidth = await evalJs(`document.body.scrollWidth`);
  const windowInnerWidth = await evalJs(`window.innerWidth`);
  const hasHorizontalScroll = bodyScrollWidth > windowInnerWidth;
  console.log(`✓ Mobile viewport: body.scrollWidth (${bodyScrollWidth}) vs window.innerWidth (${windowInnerWidth}) -> Horizontal overflow: ${hasHorizontalScroll ? 'WARNING (overflow detected)' : 'PASS (no overflow)'}`);

  // Test 10: Subpage Navigation & Runtime Checks
  console.log('\nTesting Subpage Navigations...');
  const testRoutes = [
    '/tools/adobe-premiere-pro',
    '/tutorials/skymography',
    '/dev-hub',
    '/submit'
  ];

  for (const route of testRoutes) {
    await send('Page.navigate', { url: LOCAL_URL + route });
    await new Promise((r) => setTimeout(r, 600));
    const title = await evalJs(`document.title`);
    console.log(`✓ Navigated to ${route} -> Page Title: "${title}"`);
  }

  // Test 11: Check Console Exceptions / Errors
  console.log(`\n✓ Uncaught runtime JS exceptions across all pages: ${pageErrors.length}`);
  if (pageErrors.length > 0) {
    console.log('Runtime exceptions:', JSON.stringify(pageErrors, null, 2));
  }

  ws.close();
} finally {
  chromeProcess.kill();
}

console.log('\n=== AUDIT COMPLETED ===');
