import http from 'node:http';
import { spawn } from 'node:child_process';

const LOCAL_URL = 'http://localhost:4322';

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
  '--remote-debugging-port=9224',
  '--no-first-run',
  '--no-default-browser-check',
  '--user-data-dir=/tmp/chrome-perf-audit-' + Date.now()
]);

async function waitForCdp(retries = 20) {
  for (let i = 0; i < retries; i++) {
    try {
      const version = await getJson('http://127.0.0.1:9224/json/version');
      if (version.webSocketDebuggerUrl) return version;
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('Chrome CDP did not become ready');
}

try {
  await waitForCdp();
  const targets = await getJson('http://127.0.0.1:9224/json/list');
  const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

  let msgId = 1;
  const pending = new Map();
  const requests = new Map();

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
    }
    if (data.method === 'Network.requestWillBeSent') {
      const { requestId, request, type } = data.params;
      requests.set(requestId, {
        url: request.url,
        method: request.method,
        type: type || 'Other',
        encodedDataLength: 0,
        status: null,
      });
    }
    if (data.method === 'Network.responseReceived') {
      const { requestId, response } = data.params;
      const req = requests.get(requestId);
      if (req) {
        req.status = response.status;
        req.mimeType = response.mimeType;
        req.fromDiskCache = response.fromDiskCache;
      }
    }
    if (data.method === 'Network.loadingFinished') {
      const { requestId, encodedDataLength } = data.params;
      const req = requests.get(requestId);
      if (req) {
        req.encodedDataLength = encodedDataLength;
      }
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
  await send('Network.enable');

  async function evalJs(expr) {
    const trimmed = expr.trim();
    const wrapped = (trimmed.includes(';') || trimmed.includes('return') || trimmed.includes('\n'))
      ? `(() => {\n${trimmed}\n})()`
      : `(() => { return (${trimmed}); })()`;
    const res = await send('Runtime.evaluate', {
      expression: wrapped,
      returnByValue: true
    });
    if (res.exceptionDetails) {
      console.error('Eval error:', res.exceptionDetails.text, res.exceptionDetails.exception?.description);
    }
    return res.result?.value;
  }

  console.log('=== PERFORMANCE AUDIT: HOME PAGE ===\n');

  // Clear cache for cold load simulation
  await send('Network.clearBrowserCache');

  const startTime = Date.now();
  await send('Page.navigate', { url: LOCAL_URL });
  await new Promise((r) => setTimeout(r, 3000)); // Allow rendering & vitals to settle

  const metrics = await evalJs(`
    const nav = performance.getEntriesByType('navigation')[0] || {};
    const paints = performance.getEntriesByType('paint') || [];
    const fcp = paints.find(p => p.name === 'first-contentful-paint')?.startTime || 0;
    
    // Total DOM Elements
    const domCount = document.getElementsByTagName('*').length;
    
    // Images summary
    const imgs = Array.from(document.querySelectorAll('img'));
    const lazyImgs = imgs.filter(i => i.loading === 'lazy').length;
    const missingDimensions = imgs.filter(i => !i.getAttribute('width') || !i.getAttribute('height')).length;

    // Largest Contentful Paint
    let lcpTime = 0;
    let lcpElement = 'None';
    const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
    if (lcpEntries.length > 0) {
      const lastLcp = lcpEntries[lcpEntries.length - 1];
      lcpTime = Math.round(lastLcp.startTime);
      lcpElement = lastLcp.element ? (lastLcp.element.tagName + (lastLcp.element.className ? '.' + lastLcp.element.className.slice(0, 30) : '')) : 'Unknown';
    }

    // Cumulative Layout Shift
    let clsScore = 0;
    const layoutShifts = performance.getEntriesByType('layout-shift');
    for (const entry of layoutShifts) {
      if (!entry.hadRecentInput) {
        clsScore += entry.value;
      }
    }

    // Fonts loaded
    const fontFaces = Array.from(document.fonts || []).map(f => ({
      family: f.family,
      status: f.status,
      weight: f.weight
    }));

    // Memory if available
    const memory = performance.memory ? {
      usedJSHeapSize: (performance.memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
      totalJSHeapSize: (performance.memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB'
    } : null;

    return {
      ttfb: Math.round(nav.responseStart - nav.requestStart),
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
      loadTime: Math.round(nav.loadEventEnd - nav.startTime),
      fcp: Math.round(fcp),
      lcpTime,
      lcpElement,
      clsScore: Number(clsScore.toFixed(4)),
      domCount,
      totalImages: imgs.length,
      lazyImgs,
      missingDimensions,
      fontCount: fontFaces.length,
      memory
    };
  `);

  console.log('--- Core Timing & Metrics (Cold Load) ---');
  console.log(`TTFB: ${metrics.ttfb} ms`);
  console.log(`First Contentful Paint (FCP): ${metrics.fcp} ms`);
  console.log(`DOMContentLoaded: ${metrics.domContentLoaded} ms`);
  console.log(`Window Load Event: ${metrics.loadTime} ms`);
  console.log(`Total DOM Elements: ${metrics.domCount}`);
  console.log(`Total Images on Page: ${metrics.totalImages} (Lazy: ${metrics.lazyImgs}, Missing Width/Height: ${metrics.missingDimensions})`);
  console.log(`Fonts Registered: ${metrics.fontCount}`);
  if (metrics.memory) console.log(`JS Heap Used: ${metrics.memory.usedJSHeapSize} of ${metrics.memory.totalJSHeapSize}`);

  console.log('\n--- Network Request Summary by Resource Type ---');
  const typeMap = {};
  let totalBytes = 0;
  for (const [, req] of requests.entries()) {
    const t = req.type || 'Other';
    if (!typeMap[t]) typeMap[t] = { count: 0, bytes: 0 };
    typeMap[t].count++;
    typeMap[t].bytes += req.encodedDataLength || 0;
    totalBytes += req.encodedDataLength || 0;
  }
  for (const [type, data] of Object.entries(typeMap)) {
    console.log(`  ${type.padEnd(12)}: ${String(data.count).padStart(3)} requests, ${(data.bytes / 1024).toFixed(1)} KB`);
  }
  console.log(`Total Transferred: ${(totalBytes / 1024).toFixed(1)} KB (${requests.size} total network requests)`);

  console.log('\n--- Heaviest Network Resources (> 20 KB) ---');
  const sortedReqs = Array.from(requests.values()).sort((a, b) => b.encodedDataLength - a.encodedDataLength);
  for (const r of sortedReqs.slice(0, 15)) {
    if (r.encodedDataLength > 20000) {
      console.log(`  ${(r.encodedDataLength / 1024).toFixed(1)} KB - [${r.type}] ${r.url.substring(0, 100)}`);
    }
  }

  // Subpage audit: Tool detail and Dev Hub
  console.log('\n=== SUBPAGE PERFORMANCE AUDIT ===');
  await send('Page.navigate', { url: LOCAL_URL + '/tools/adobe-premiere-pro' });
  await new Promise((r) => setTimeout(r, 1500));
  const toolDom = await evalJs(`document.getElementsByTagName('*').length`);
  console.log(`Tool Detail Page (/tools/adobe-premiere-pro) DOM count: ${toolDom}`);

  await send('Page.navigate', { url: LOCAL_URL + '/dev-hub' });
  await new Promise((r) => setTimeout(r, 1500));
  const devHubDom = await evalJs(`document.getElementsByTagName('*').length`);
  console.log(`Dev Hub Page (/dev-hub) DOM count: ${devHubDom}`);

  // Mobile Audit: 375x667, 4x CPU slowdown, Slow 4G (1.6 Mbps download, 150ms latency)
  console.log('\n=== MOBILE PERFORMANCE AUDIT (Throttled 4G, 4x CPU Slowdown) ===');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 375,
    height: 667,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });
  await send('Network.clearBrowserCache');

  await send('Page.navigate', { url: LOCAL_URL });
  await new Promise((r) => setTimeout(r, 5000));

  const mobileMetrics = await evalJs(`
    const nav = performance.getEntriesByType('navigation')[0] || {};
    const paints = performance.getEntriesByType('paint') || [];
    const fcp = paints.find(p => p.name === 'first-contentful-paint')?.startTime || 0;

    let lcpTime = 0;
    let lcpElement = 'None';
    const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
    if (lcpEntries.length > 0) {
      const lastLcp = lcpEntries[lcpEntries.length - 1];
      lcpTime = Math.round(lastLcp.startTime);
      lcpElement = lastLcp.element ? (lastLcp.element.tagName + (lastLcp.element.className ? '.' + lastLcp.element.className.slice(0, 30) : '')) : 'Unknown';
    }

    let clsScore = 0;
    const layoutShifts = performance.getEntriesByType('layout-shift');
    for (const entry of layoutShifts) {
      if (!entry.hadRecentInput) {
        clsScore += entry.value;
      }
    }

    return {
      ttfb: Math.round(nav.responseStart - nav.requestStart),
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
      loadTime: Math.round(nav.loadEventEnd - nav.startTime),
      fcp: Math.round(fcp),
      lcpTime,
      lcpElement,
      clsScore: Number(clsScore.toFixed(4)),
    };
  `);

  console.log(`Mobile TTFB: ${mobileMetrics.ttfb} ms`);
  console.log(`Mobile FCP: ${mobileMetrics.fcp} ms`);
  console.log(`Mobile LCP: ${mobileMetrics.lcpTime} ms (Element: ${mobileMetrics.lcpElement})`);
  console.log(`Mobile CLS: ${mobileMetrics.clsScore}`);
  console.log(`Mobile DOMContentLoaded: ${mobileMetrics.domContentLoaded} ms`);
  console.log(`Mobile Load Event: ${mobileMetrics.loadTime} ms`);

  ws.close();
} finally {
  chromeProcess.kill();
}
