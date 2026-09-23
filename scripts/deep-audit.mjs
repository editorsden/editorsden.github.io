import http from 'node:http';
import { spawn } from 'node:child_process';

const LOCAL_URL = 'http://localhost:4321';

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
  '--remote-debugging-port=9223',
  '--no-first-run',
  '--no-default-browser-check',
  '--user-data-dir=/tmp/chrome-deep-audit-' + Date.now()
]);

async function waitForCdp(retries = 20) {
  for (let i = 0; i < retries; i++) {
    try {
      const version = await getJson('http://127.0.0.1:9223/json/version');
      if (version.webSocketDebuggerUrl) return version;
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('Chrome CDP did not become ready in time');
}

try {
  await waitForCdp();
  const targets = await getJson('http://127.0.0.1:9223/json/list');
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

  await send('Page.enable');
  await send('Runtime.enable');
  await send('DOM.enable');

  async function evalJs(expr) {
    const trimmed = expr.trim();
    const wrapped = (trimmed.includes(';') || trimmed.includes('return') || trimmed.includes('\n'))
      ? `(() => {\n${trimmed}\n})()`
      : trimmed;
    const res = await send('Runtime.evaluate', { expression: wrapped, returnByValue: true });
    if (res.exceptionDetails) {
      console.error('Eval error:', res.exceptionDetails.text, res.exceptionDetails.exception?.description);
    }
    return res.result?.value;
  }

  console.log('=== DEEP AUDIT SUITE ===');

  // Test 1: Load Home Page & Test Nested Interactive Elements
  console.log('\n--- Test 1: HTML Validation (Nested Interactive Elements) ---');
  await send('Page.navigate', { url: LOCAL_URL });
  await new Promise((r) => setTimeout(r, 1500));

  const nestedButtonsInLinks = await evalJs(`
    const links = document.querySelectorAll('a');
    let nested = [];
    links.forEach(a => {
      const buttons = a.querySelectorAll('button, a');
      if (buttons.length > 0) {
        nested.push({
          parentHref: a.getAttribute('href'),
          nestedTags: Array.from(buttons).map(b => b.tagName)
        });
      }
    });
    return nested;
  `);
  console.log(`Nested interactive elements inside <a> tags: ${nestedButtonsInLinks.length}`);
  if (nestedButtonsInLinks.length > 0) {
    console.log('Sample nested violations:', JSON.stringify(nestedButtonsInLinks.slice(0, 5), null, 2));
  }

  // Test 2: Test DOM XSS in Command Palette
  console.log('\n--- Test 2: Command Palette DOM XSS Test ---');
  await evalJs(`
    const trigger = document.getElementById('search-palette-trigger');
    trigger?.click();
  `);
  await new Promise((r) => setTimeout(r, 300));

  const xssTestString = '<img src=x onerror="window.__xss_fired=true">';
  await evalJs(`
    const input = document.getElementById('palette-search-input');
    if (input) {
      input.value = ${JSON.stringify(xssTestString)};
      input.dispatchEvent(new Event('input'));
    }
  `);
  await new Promise((r) => setTimeout(r, 300));

  const xssFired = await evalJs(`window.__xss_fired === true`);
  const rawHtmlInResults = await evalJs(`
    const resList = document.getElementById('palette-results-list');
    return resList ? resList.innerHTML : '';
  `);
  console.log(`XSS Fired: ${xssFired ? 'VULNERABLE (window.__xss_fired was executed!)' : 'SAFE'}`);
  console.log(`Results HTML includes raw tag: ${rawHtmlInResults.includes('<img src=x') ? 'YES (Unescaped HTML injection!)' : 'NO'}`);

  // Test 3: Test Reset Filters Button Bug
  console.log('\n--- Test 3: Reset Filters State Completeness ---');
  // Close palette
  await evalJs(`document.getElementById('command-palette-dialog')?.close()`);
  await new Promise((r) => setTimeout(r, 200));

  // Select "Learning", then "Premiere Pro"
  await evalJs(`
    document.querySelector('[data-tab-type="tutorial"]')?.click();
  `);
  await new Promise((r) => setTimeout(r, 200));
  await evalJs(`
    document.querySelector('.niche-tab-btn[data-niche="Premiere Pro"]')?.click();
  `);
  await new Promise((r) => setTimeout(r, 200));

  // Click clear filters button
  await evalJs(`
    document.getElementById('clear-filters-btn')?.click();
  `);
  await new Promise((r) => setTimeout(r, 200));

  const activeTabAfterReset = await evalJs(`
    const activeHero = document.querySelector('#hero-type-tabs .bg-slate-900')?.getAttribute('data-tab-type');
    const nicheActive = document.querySelector('.niche-tab-btn.bg-slate-900')?.getAttribute('data-niche');
    return { activeHero, nicheActive };
  `);
  console.log('State after Reset click:', activeTabAfterReset);

  // Test 4: Dev Hub Script Detail Code Copy Button
  console.log('\n--- Test 4: Dev Hub Script Detail Page Verification ---');
  await send('Page.navigate', { url: LOCAL_URL + '/dev-hub/ffmpeg-prores-proxy-transcoder' });
  await new Promise((r) => setTimeout(r, 1200));

  const copyButtonsOnCode = await evalJs(`
    return document.querySelectorAll('.copy-code-btn').length;
  `);
  console.log(`Code copy buttons mounted: ${copyButtonsOnCode}`);

  // Test 5: Tutorial Detail Page Related Channels
  console.log('\n--- Test 5: Tutorial Detail Page Related Channels ---');
  await send('Page.navigate', { url: LOCAL_URL + '/tutorials/film-riot-ryan-connolly' });
  await new Promise((r) => setTimeout(r, 800));

  const relatedTutorialsCount = await evalJs(`
    return document.querySelectorAll('.related-tutorial-item, [data-related-tutorial]').length;
  `);
  console.log(`Related tutorials on tutorial page: ${relatedTutorialsCount}`);

  // Test 6: Check Broken Links in Submit Page & Modal
  console.log('\n--- Test 6: GitHub Form Submission Links ---');
  await send('Page.navigate', { url: LOCAL_URL + '/submit' });
  await new Promise((r) => setTimeout(r, 800));

  const submitLinks = await evalJs(`
    return Array.from(document.querySelectorAll('a[href*="github.com"]')).map(a => a.href);
  `);
  console.log('GitHub links on /submit:', submitLinks);

  // Test 7: Mascot Badge Interaction
  console.log('\n--- Test 7: Mascot Badge Interactive Filtering ---');
  await send('Page.navigate', { url: LOCAL_URL });
  await new Promise((r) => setTimeout(r, 1200));

  const mascotResult = await evalJs(`
    const resolveBadge = document.querySelector('.mascot-badge[data-mascot-filter="DaVinci Resolve"]');
    if (!resolveBadge) return { foundBadge: false };
    resolveBadge.click();
    const activeNlePill = document.querySelector('.nle-pill.bg-slate-900')?.textContent?.trim();
    const visibleCards = Array.from(document.querySelectorAll('.tool-card-item')).filter(c => c.style.display !== 'none').length;
    return { foundBadge: true, activeNlePill, visibleCards };
  `);
  console.log('Mascot filter test result:', mascotResult);

  // Test 8: Mobile Drawer Toggle & "Show Results" Button
  console.log('\n--- Test 8: Mobile Drawer Toggle & Close ---');
  const drawerTest = await evalJs(`
    const trigger = document.getElementById('mobile-filters-trigger');
    const panel = document.getElementById('filter-sidebar-panel');
    const closeBtn = document.getElementById('mobile-close-filters-btn');
    if (!trigger || !panel || !closeBtn) return { hasElements: false };

    trigger.click();
    const openAfterTrigger = !panel.classList.contains('hidden');
    closeBtn.click();
    const closedAfterBtn = panel.classList.contains('hidden');
    return { hasElements: true, openAfterTrigger, closedAfterBtn };
  `);
  console.log('Mobile drawer test result:', drawerTest);

  // Test 9: URL Parameter State Restoration
  console.log('\n--- Test 9: URL Parameter State Restoration ---');
  await send('Page.navigate', { url: LOCAL_URL + '/?cat=Workflow%20%26%20Organization&os=macOS' });
  await new Promise((r) => setTimeout(r, 1200));

  const urlRestoreTest = await evalJs(`
    const catSelect = document.getElementById('filter-category-select');
    const osSelect = document.getElementById('filter-os-select');
    const visibleCount = Array.from(document.querySelectorAll('.tool-card-item')).filter(c => c.style.display !== 'none').length;
    return {
      catVal: catSelect ? catSelect.value : null,
      osVal: osSelect ? osSelect.value : null,
      visibleCount
    };
  `);
  console.log('URL restore test result:', urlRestoreTest);

  ws.close();
} finally {
  chromeProcess.kill();
}
