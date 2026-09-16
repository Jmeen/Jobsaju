// Loopback-only QA collector. No PostHog account, external analytics or real PG is used.
// Run: node scripts/posthog-local-qa.mjs, then open the printed UTM URL.
import { createServer } from 'vite';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import worker from '../workers/index.js';

process.env.VITE_POSTHOG_KEY = 'phc_local_qa_not_a_real_key';
process.env.VITE_POSTHOG_HOST = 'http://localhost:5177';
process.env.VITE_POSTHOG_DEBUG = 'true';
process.env.VITE_PORTONE_STORE_ID = '';
process.env.VITE_PORTONE_CHANNEL_KEY = '';
const events = [];
let failures = 0;
let undecodable = 0;
let blocked = false;
const server = await createServer({
  server: { host: 'localhost', port: 5177, strictPort: true },
  plugins: [{ name: 'posthog-local-collector', transformIndexHtml() {
    return [{ tag: 'script', attrs: { type: 'module', src: '/__posthog_qa/probe.js' }, injectTo: 'body' }];
  }, configureServer(vite) {
    vite.middlewares.use(async (req, res, next) => {
      const path = new URL(req.url, 'http://localhost:5177').pathname;
      if (path === '/__posthog_qa/probe.js') {
        res.setHeader('Content-Type', 'text/javascript');
        res.end(`
          const box=document.createElement('aside');
          box.style='position:fixed;top:0;right:0;z-index:99999;background:#fff;padding:4px;font:12px sans-serif';
          box.innerHTML='<button id="qa-replay-toggle">QA Replay 필드 열기</button><div id="qa-fields" hidden><label>QA input<input id="qa-input"></label><label>QA textarea<textarea id="qa-textarea"></textarea></label><button id="qa-fields-close">QA 필드 닫기</button></div>';
          document.body.append(box);
          box.querySelector('#qa-replay-toggle').onclick=()=>{box.querySelector('#qa-fields').hidden=false;};
          box.querySelector('#qa-fields-close').onclick=()=>{box.querySelector('#qa-fields').hidden=true;};
        `); return;
      }
      if (path === '/__posthog_qa/block' && req.method === 'POST') {
        blocked = new URL(req.url, 'http://localhost:5177').searchParams.get('enabled') === 'true';
        res.end(JSON.stringify({ blocked })); return;
      }
      if (path === '/__posthog_qa/status') {
        res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ blocked, failures, undecodable })); return;
      }
      const analyticsRequest = path.includes('/config') || path.startsWith('/static/') || ['/flags/', '/decide/', '/i/v0/e/', '/e/', '/batch/', '/s/'].includes(path);
      if (blocked && analyticsRequest) {
        failures++; res.statusCode = 503; res.end('Synthetic PostHog outage'); return;
      }
      if (path.includes('/config')) {
        const config = { sessionRecording: { endpoint: '/s/', consoleLogRecordingEnabled: false } };
        res.setHeader('Content-Type', path.endsWith('.js') ? 'text/javascript' : 'application/json');
        res.end(path.endsWith('.js')
          ? `window._POSTHOG_REMOTE_CONFIG={${JSON.stringify(process.env.VITE_POSTHOG_KEY)}:{config:${JSON.stringify(config)}}};`
          : JSON.stringify(config));
        return;
      }
      if (path.startsWith('/static/') && path.endsWith('.js')) {
        try {
          const filename = path.split('/').pop();
          res.setHeader('Content-Type', 'text/javascript');
          res.end(await readFile(new URL(`../node_modules/posthog-js/dist/${filename}`, import.meta.url)));
        } catch { res.statusCode = 404; res.end(); }
        return;
      }
      if (path === '/flags/' || path === '/decide/') {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ featureFlags: {}, sessionRecording: { endpoint: '/s/', consoleLogRecordingEnabled: false }, supportedCompression: ['gzip-js'] }));
        return;
      }
      if (path === '/__posthog_qa/events') {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(events)); return;
      }
      if (path === '/i/v0/e/' || path === '/e/' || path === '/batch/' || path === '/s/') {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        try {
          let bytes = Buffer.concat(chunks);
          if (bytes[0] === 31 && bytes[1] === 139) bytes = gunzipSync(bytes);
          const text = bytes.toString();
          const encoded = text.startsWith('data=') ? new URLSearchParams(text).get('data') : null;
          const body = JSON.parse(encoded ? Buffer.from(encoded, 'base64').toString() : text);
          events.push(...(Array.isArray(body) ? body : body.batch || [body]));
        } catch { undecodable++; console.warn('QA collector: undecodable payload'); }
        res.setHeader('Content-Type', 'application/json'); res.end('{"status":1}'); return;
      }
      if (path === '/api/free-result') {
        const chunks = []; for await (const chunk of req) chunks.push(chunk);
        const result = await worker.fetch(new Request('http://localhost:5177/api/free-result', { method: 'POST', body: Buffer.concat(chunks) }), {});
        res.statusCode = result.status; res.setHeader('Content-Type', 'application/json'); res.end(await result.text()); return;
      }
      if (path === '/api/analytics' || path === '/api/diagnostics/client') { res.end('{}'); return; }
      // Never allow a real payment request from this QA server.
      if (path === '/api/payment/validate') { res.statusCode = 400; res.end('{"error":"Local QA: real payments disabled"}'); return; }
      next();
    });
  } }],
});
await server.listen();
console.log('PostHog local QA: http://localhost:5177/?utm_source=instagram&utm_medium=profile&utm_campaign=guardian');
console.log('Captured events: http://localhost:5177/__posthog_qa/events');
