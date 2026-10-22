#!/usr/bin/env node
// Servidor local: sirve el sitio estático y las funciones de /api como en Vercel.
// Uso: npm run dev   (http://localhost:8080)
// Secretos: se leen de ~/.config/ely-reservas/env (fuera del repositorio; ver tools/set-secret.sh)
// o de ELY_SECRETS_FILE. Las variables ya definidas en el entorno tienen prioridad.
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT) || 8080;

function loadSecrets() {
  const file = process.env.ELY_SECRETS_FILE || path.join(os.homedir(), '.config', 'ely-reservas', 'env');
  if (!fs.existsSync(file)) return console.log(`(sin archivo de secretos en ${file}; los paquetes con evento de Cal.com fallarán)`);
  fs.readFileSync(file, 'utf8').split('\n').forEach((line) => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  });
  console.log(`Secretos cargados desde ${file}`);
}

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json',
};

function createServer(routes) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const route = routes[url.pathname];
    if (route) {
      req.query = Object.fromEntries(url.searchParams);
      return route(req, res);
    }
    if (url.pathname.startsWith('/api/')) { res.statusCode = 404; return res.end('{"error":"not_found"}'); }
    let file = path.join(ROOT, decodeURIComponent(url.pathname));
    if (!file.startsWith(ROOT)) { res.statusCode = 403; return res.end(); }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) { res.statusCode = 404; return res.end('No encontrado'); }
    res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  });
}

if (require.main === module) {
  loadSecrets();
  const server = createServer({
    '/api/availability': require('../api/availability.js'),
    '/api/bookings': require('../api/bookings.js'),
    '/api/cron/expire-requests': require('../api/cron/expire-requests.js'),
  });
  server.listen(PORT, () => console.log(`Sitio + /api en http://localhost:${PORT}`));
}

module.exports = { createServer, loadSecrets };
