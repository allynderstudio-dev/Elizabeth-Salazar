// Verificación de Cloudflare Turnstile en el servidor (BR-13, DEV-P1-07). Es una capa EXTRA:
// no reemplaza el campo trampa, el límite de envíos, la validación, la idempotencia, el
// bloqueo por fecha ni las comprobaciones de Cal.com.
//   TURNSTILE_SITE_KEY    clave de sitio (pública). El navegador la recibe con la disponibilidad,
//                         así las dos claves se configuran juntas en Vercel, sin tocar el código.
//   TURNSTILE_SECRET_KEY  clave secreta (solo servidor). Sin las dos no se exige verificación:
//                         en producción se registra como incidente (ver http.js).
//   TURNSTILE_HOSTNAMES   hosts permitidos, separados por comas. En producción, por defecto, el
//                         dominio público (SITE_HOSTNAMES). Las claves de prueba de Cloudflare no
//                         se comprueban por host ni acción.
// Cada intento de envío trae un token NUEVO (el navegador vuelve a ejecutar el widget), así un
// reintento con la misma referencia nunca choca con que los tokens son de un solo uso.
const crypto = require('node:crypto');
const { BookingError } = require('./booking-service.js');

const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const ACTION = 'reserva';
const SITE_HOSTNAMES = ['elysalazarstudio.com', 'www.elysalazarstudio.com'];
// Claves secretas de prueba documentadas por Cloudflare (1x… pasa, 2x… falla, 3x… ya usada)
const isTestSecret = (s) => /^[123]x0{20,}AA$/.test(s);

function createCaptchaVerifier({ secret, siteKey = null, hostnames = null, fetchImpl = globalThis.fetch, timeoutMs = 5000, log = console } = {}) {
  const enabled = Boolean(secret);
  const checkClaims = enabled && !isTestSecret(secret);

  async function siteverify(token, ip, idempotencyKey) {
    const body = new URLSearchParams({ secret, response: token, idempotency_key: idempotencyKey });
    if (ip) body.set('remoteip', ip);
    const res = await fetchImpl(SITEVERIFY, { method: 'POST', body, signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) throw new Error(`siteverify respondió ${res.status}`);
    return res.json();
  }

  // Lanza BookingError: captcha_failed (token ausente o inválido), captcha_expired (vencido o
  // ya usado) o captcha_unavailable (Cloudflare no respondió: no se crea nada, reintentable)
  async function verify(token, { ip } = {}) {
    if (!enabled) return { omitida: true };
    if (typeof token !== 'string' || !token || token.length > 2048) throw new BookingError('captcha_failed', 'Falta la verificación');
    const key = crypto.randomUUID(); // el mismo en el reintento: Cloudflare no lo cuenta dos veces
    let out;
    for (let attempt = 0; ; attempt += 1) {
      try {
        out = await siteverify(token, ip, key);
        break;
      } catch (err) {
        if (attempt >= 1) {
          log.error(`[reservas] Turnstile no disponible: ${err.message}`);
          throw new BookingError('captcha_unavailable', 'No se pudo verificar');
        }
      }
    }
    const codes = (out && out['error-codes']) || [];
    if (!out || out.success !== true) {
      if (codes.includes('timeout-or-duplicate')) throw new BookingError('captcha_expired', 'Verificación vencida o ya usada');
      if (codes.some((c) => /secret|internal/.test(c))) log.error(`[reservas] Turnstile: ${codes.join(', ')}`);
      throw new BookingError('captcha_failed', 'Verificación rechazada');
    }
    if (checkClaims) {
      if (hostnames && !hostnames.includes(out.hostname)) throw new BookingError('captcha_failed', `Host no permitido: ${out.hostname}`);
      if (out.action !== ACTION) throw new BookingError('captcha_failed', 'Acción distinta');
    }
    return { omitida: false };
  }

  return { verify, enabled, siteKey: enabled ? siteKey : null };
}

function captchaFromEnv(env = process.env, log = console) {
  const hostnames = env.TURNSTILE_HOSTNAMES
    ? env.TURNSTILE_HOSTNAMES.split(',').map((s) => s.trim()).filter(Boolean)
    : env.VERCEL_ENV === 'production' ? SITE_HOSTNAMES : null;
  // Solo con las dos claves: con la secreta sola, el navegador no tendría con qué pedir un token
  const both = Boolean(env.TURNSTILE_SECRET_KEY && env.TURNSTILE_SITE_KEY);
  return createCaptchaVerifier({ secret: both ? env.TURNSTILE_SECRET_KEY : null, siteKey: env.TURNSTILE_SITE_KEY, hostnames, log });
}

// Una instancia por función (la comparten disponibilidad y reservas)
let cached = null;
const captchaShared = () => (cached = cached || captchaFromEnv());

module.exports = { createCaptchaVerifier, captchaFromEnv, captchaShared, ACTION, SITE_HOSTNAMES };
