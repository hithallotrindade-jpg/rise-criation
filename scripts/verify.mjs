// Verificação real em Chrome/Edge via CDP, sem dependências de terceiros.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const browserPath = process.env.CHROME_PATH || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(file => fs.existsSync(file));
assert(browserPath, 'Configure CHROME_PATH com o caminho do Chrome ou Edge.');
const artifacts = fs.mkdtempSync(path.join(os.tmpdir(), 'rise-review-'));
const failures = [];
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404).end(); return;
  }
  res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = spawn(browserPath, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${path.join(artifacts, 'profile')}`, 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
let socket;
try {
  const endpoint = await new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error('Chrome startup timeout')), 20000);
    browser.on('error', reject);
    browser.stderr.on('data', chunk => {
      output += chunk;
      const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) { clearTimeout(timer); resolve(match[1]); }
    });
  });
  const port = new URL(endpoint).port;
  const targets = await fetch(`http://127.0.0.1:${port}/json`).then(r => r.json());
  socket = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let sequence = 0;
  const pending = new Map();
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const item = pending.get(message.id);
      if (!item) return;
      clearTimeout(item.timer); pending.delete(message.id);
      message.error ? item.reject(new Error(JSON.stringify(message.error))) : item.resolve(message.result);
    } else if (message.method === 'Runtime.exceptionThrown') failures.push(message.params.exceptionDetails.text);
    else if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') failures.push(message.params.entry.text);
    else if (message.method === 'Network.responseReceived' && message.params.response.status >= 400) failures.push(message.params.response.url);
  };
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout: ${method}`)); }, 15000);
    pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    assert(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const settle = () => new Promise(resolve => setTimeout(resolve, 1000));
  const load = async () => {
    await call('Page.navigate', { url: base });
    for (let count = 0; count < 50; count++) {
      if (await evaluate(`document.readyState === 'complete' && location.href.startsWith('${base}')`)) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    await settle();
  };
  await call('Page.enable'); await call('Runtime.enable'); await call('Log.enable'); await call('Network.enable');

  if (process.argv.includes('--convert-hero')) {
    await load();
    const data = await evaluate(`(async () => {
      const image = new Image(); image.src = 'assets/images/hero-cinematic-source.png'; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      canvas.getContext('2d').drawImage(image, 0, 0); return canvas.toDataURL('image/webp', 0.86).split(',')[1];
    })()`);
    fs.writeFileSync(path.join(root, 'assets/images/hero-cinematic.webp'), Buffer.from(data, 'base64'));
    console.log('WebP gerado:', fs.statSync(path.join(root, 'assets/images/hero-cinematic.webp')).size, 'bytes');
    process.exitCode = 0;
  } else {
    for (const width of [375, 768, 1440]) {
      await call('Emulation.setDeviceMetricsOverride', { width, height: 960, deviceScaleFactor: 1, mobile: false });
      await load();
      const structure = await evaluate(`(() => {
        const ids = [...document.querySelectorAll('[id]')].map(e => e.id);
        return { overflow: document.documentElement.scrollWidth > innerWidth, unique: new Set(ids).size === ids.length,
          anchors: [...document.querySelectorAll('a[href^="#"]')].every(a => document.getElementById(a.hash.slice(1))),
          projects: document.querySelectorAll('.projeto-card').length, h1: document.querySelectorAll('h1').length,
          contact: document.querySelector('#btn-orcamento').href, year: document.querySelector('#ano-atual').textContent };
      })()`);
      assert.equal(structure.overflow, false, `Overflow em ${width}px`); assert(structure.unique && structure.anchors);
      assert.equal(structure.projects, 5); assert.equal(structure.h1, 1); assert.equal(structure.year, String(new Date().getFullYear()));
      assert.equal(new URL(structure.contact).pathname, '/5563991162918');
      await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
      await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
      assert.equal(await evaluate(`document.activeElement.classList.contains('pular-conteudo')`), true, 'Atalho de teclado');
      await evaluate('document.activeElement.blur()');
      if (width <= 850) {
        assert.equal(await evaluate(`document.querySelector('.menu-toggle').getAttribute('aria-label')`), 'Abrir menu');
        assert.equal(await evaluate(`getComputedStyle(document.querySelector('.navegacao')).visibility`), 'hidden');
        await evaluate(`document.querySelector('.menu-toggle').click()`); await settle();
        assert.equal(await evaluate(`document.querySelector('.menu-toggle').getAttribute('aria-expanded')`), 'true');
        assert.equal(await evaluate(`document.querySelector('.menu-toggle').getAttribute('aria-label')`), 'Fechar menu');
        await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        assert.equal(await evaluate(`document.querySelector('.menu-toggle').getAttribute('aria-expanded')`), 'false');
        assert.equal(await evaluate(`document.activeElement.classList.contains('menu-toggle')`), true);
        await evaluate(`document.querySelector('.menu-toggle').click(); document.querySelector('.navegacao a[href="#portfolio"]').click()`);
        await settle();
        assert.equal(await evaluate(`document.querySelector('.menu-toggle').getAttribute('aria-expanded')`), 'false');
        assert(await evaluate(`document.querySelector('#portfolio').getBoundingClientRect().top >= document.querySelector('.cabecalho').getBoundingClientRect().bottom`), 'Ancora sob cabecalho');
      }
      for (const id of ['inicio', 'sobre', 'servicos', 'portfolio', 'contato']) {
        await evaluate(`document.getElementById('${id}').scrollIntoView({behavior:'instant'})`); await settle();
        const shot = await call('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(artifacts, `${width}-${id}.png`), Buffer.from(shot.data, 'base64'));
      }
      assert(await evaluate(`[...document.images].every(i => i.complete && i.naturalWidth > 0)`), 'Imagem quebrada');
      assert.equal(await evaluate(`document.documentElement.scrollWidth > innerWidth`), false);
      console.log(`PASS ${width}px: layout, imagens, teclado, menu, ancoras e contato`);
    }
    await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await load();
    assert.equal(await evaluate(`getComputedStyle(document.documentElement).scrollBehavior`), 'auto');
    assert.equal(await evaluate(`document.querySelectorAll('.pendente').length`), 0);
    console.log('PASS movimento reduzido');
    await call('Emulation.setScriptExecutionDisabled', { value: true });
    for (const width of [375, 768, 1440]) {
      await call('Emulation.setDeviceMetricsOverride', { width, height: 960, deviceScaleFactor: 1, mobile: false });
      await load();
      assert.equal(await evaluate(`getComputedStyle(document.querySelector('.navegacao')).visibility`), 'visible');
      assert(await evaluate(`document.querySelector('#btn-orcamento').href.startsWith('https://wa.me/5563991162918')`));
      assert.equal(await evaluate(`document.querySelectorAll('.pendente').length`), 0);
      assert.equal(await evaluate(`document.documentElement.scrollWidth > innerWidth`), false);
      console.log(`PASS sem JavaScript ${width}px: navegacao, conteudo e WhatsApp`);
    }
    assert.deepEqual(failures, [], 'Erros de console/rede');
    console.log('PASS console e rede sem erros locais. Capturas:', artifacts);
  }
} finally {
  socket?.close(); browser.kill(); server.close();
}
