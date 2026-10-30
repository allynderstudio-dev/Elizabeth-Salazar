// URLs limpias: vercel.json sirve /servicios desde servicios.html (cleanUrls) y redirige las .html
// antiguas. Estas pruebas evitan que vuelvan los enlaces con .html y que el sitemap se desincronice.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://elysalazarstudio.com';
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const PAGES = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html')).map((f) => f.replace(/\.html$/, ''));
const IGNORED = read('.vercelignore').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
const PAGE_HTML = new RegExp(`\\b(${PAGES.join('|')})\\.html\\b`);

global.window = {};
require('../js/services-data.js');

test('vercel.json sirve URLs limpias y quita la barra final', () => {
  const cfg = JSON.parse(read('vercel.json'));
  assert.equal(cfg.cleanUrls, true);
  assert.equal(cfg.trailingSlash, false);
});

test('ningún script arma enlaces a páginas con .html', () => {
  fs.readdirSync(path.join(ROOT, 'js')).filter((f) => f.endsWith('.js')).forEach((f) => {
    read(`js/${f}`).split('\n').forEach((line, i) => {
      const code = line.trim();
      if (code.startsWith('//') || code.startsWith('*')) return; // los comentarios nombran archivos
      assert.doesNotMatch(code, PAGE_HTML, `js/${f}:${i + 1}`);
    });
  });
});

test('el sitemap lista cada página publicada y cada sesión con su URL limpia', () => {
  const locs = [...read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.equal(new Set(locs).size, locs.length, 'URLs repetidas');
  locs.forEach((loc) => {
    assert.ok(loc.startsWith(`${SITE}/`), loc);
    const url = new URL(loc);
    const file = `${url.pathname.slice(1) || 'index'}.html`;
    assert.ok(fs.existsSync(path.join(ROOT, file)) && !IGNORED.includes(file), `${loc}: no es una página publicada`);
  });
  const sesiones = locs.filter((l) => l.includes('/servicio-detalle?')).map((l) => new URL(l).searchParams.get('sesion'));
  assert.deepEqual(sesiones, Object.keys(window.SERVICES_DATA));
  const paginas = locs.filter((l) => !l.includes('?')).map((l) => new URL(l).pathname);
  PAGES.filter((p) => p !== 'servicio-detalle' && !IGNORED.includes(`${p}.html`)).forEach((p) => {
    assert.ok(paginas.includes(p === 'index' ? '/' : `/${p}`), `falta /${p} en sitemap.xml`);
  });
});

test('canonical y og:url coinciden y no llevan .html', () => {
  PAGES.forEach((p) => {
    const html = read(`${p}.html`);
    const canonical = (html.match(/<link rel="canonical" href="([^"]+)">/) || [])[1];
    const ogUrl = (html.match(/<meta property="og:url" content="([^"]+)">/) || [])[1];
    if (p === 'servicio-detalle' || IGNORED.includes(`${p}.html`)) {
      // Depende de ?sesion= / ?t=: la canónica la pone el script de la página
      assert.equal(canonical, undefined, p);
      return;
    }
    assert.equal(canonical, p === 'index' ? `${SITE}/` : `${SITE}/${p}`, p);
    assert.equal(ogUrl, canonical, p);
  });
});
