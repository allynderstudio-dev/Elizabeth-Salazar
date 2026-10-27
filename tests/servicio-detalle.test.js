// La página de servicio resuelve la sesión con un script inline (servicio-detalle.html) que
// depende de datos que viven en js/services-data.js: estas pruebas evitan que se desincronicen.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

global.window = {};
require('../js/services-data.js');
const render = require('../js/servicio-detalle.js');
const html = fs.readFileSync(path.join(__dirname, '..', 'servicio-detalle.html'), 'utf8');
const DATA = window.SERVICES_DATA;

test('la lista SLUGS del <head> coincide con js/services-data.js', () => {
  const m = html.match(/var SLUGS = (\[[^\]]*\]);/);
  assert.ok(m, 'no se encontró SLUGS en servicio-detalle.html');
  // Se evalúa el literal tal como lo haría el navegador
  assert.deepEqual([...vm.runInNewContext(m[1])], Object.keys(DATA));
  assert.match(html, new RegExp(`var DEFAULT = '${window.SERVICES_DEFAULT}';`));
});

test('cada foto del hero sigue la ruta que usan el <head> y main.js', () => {
  Object.entries(DATA).forEach(([slug, s]) => {
    assert.equal(s.hero.photo.src, `assets/images/servicio/${slug}/hero.jpg`, slug);
    assert.ok(fs.existsSync(path.join(__dirname, '..', s.hero.photo.src)), `${slug}: falta la imagen`);
  });
});

test('el HTML estático es exactamente render(default, { prerender: true })', () => {
  const start = html.indexOf('<!-- render:servicio -->') + '<!-- render:servicio -->'.length;
  const end = html.indexOf('<!-- /render:servicio -->');
  assert.equal(html.slice(start, end), render(window.SERVICES_DEFAULT, { prerender: true }));
});

test('el hero estático no trae src: nunca descarga ni pinta la foto de otra sesión', () => {
  const heroImg = html.match(/<div class="photo sd-hero__photo"><img [^>]*>/)[0];
  assert.doesNotMatch(heroImg, /\ssrc=/);
  assert.match(heroImg, /fetchpriority="high"/);
});

test('render en el navegador sí trae src y el fundido al cargar', () => {
  Object.keys(DATA).forEach((slug) => {
    const img = render(slug).match(/<div class="photo sd-hero__photo"><img [^>]*>/)[0];
    assert.match(img, new RegExp(`src="assets/images/servicio/${slug}/hero.jpg"`));
    assert.match(img, /onload="this\.classList\.add\('is-loaded'\)"/);
  });
});
