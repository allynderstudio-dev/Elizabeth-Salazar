#!/usr/bin/env node
// Comprobación de SOLO LECTURA del sitio publicado (T-DB-14): ¿cada paquete reserva en línea?
//   npm run live:check                       https://elysalazarstudio.com, mes siguiente
//   npm run live:check -- <url> <AAAA-MM>
// Solo llama a GET /api/health y GET /api/availability. Nunca crea reservas.
// "reservas_desactivadas" = modo WhatsApp: el sitio NO aparta horarios (falta el almacén compartido).
const { SERVICES } = require('../js/booking-data.js');

async function main() {
  const base = (process.argv[2] || 'https://elysalazarstudio.com').replace(/\/$/, '');
  const next = new Date();
  next.setUTCMonth(next.getUTCMonth() + 1);
  const month = process.argv[3] || next.toISOString().slice(0, 7);
  try {
    const res = await fetch(`${base}/api/health`, { headers: { Accept: 'application/json' } });
    const h = await res.json();
    console.log(`Servidor: modo=${h.modo} reservas=${h.reservas} almacén=${h.almacen}\n`);
  } catch (err) {
    console.log(`Servidor: /api/health no responde (${err.message}); ¿despliegue anterior a este cambio?\n`);
  }
  let off = 0;
  for (const s of SERVICES) {
    for (const p of s.packages) {
      const url = `${base}/api/availability?servicio=${s.slug}&paquete=${p.slug}&mes=${month}`;
      let line;
      try {
        const res = await fetch(url, { headers: { Accept: 'application/json' } });
        const json = await res.json();
        if (json.reservable) line = `en línea · ${Object.keys(json.dias || {}).length} días con horarios`;
        else { off += 1; line = `MODO WHATSAPP (${json.motivo || json.error || res.status})`; }
      } catch (err) {
        off += 1;
        line = `ERROR ${err.message}`;
      }
      console.log(`${s.slug}/${p.slug}: ${line}`);
    }
  }
  console.log(off ? `\n${off} paquetes NO reservan en línea en ${month}: el sitio no está apartando horarios.` : `\nTodos los paquetes reservan en línea (${month}).`);
  process.exitCode = off ? 1 : 0;
}

main();
