// Protección contra envíos automáticos a POST /api/bookings (BR-13), con el mismo almacén
// compartido del bloqueo de reservas. Los reintentos de una misma referencia (red caída,
// doble clic) no cuentan como solicitudes nuevas.
//   intentos      máx. 12 por IP cada 10 minutos (cualquier envío, también reintentos)
//   solicitudes   máx. 8 referencias NUEVAS por IP cada 24 horas
// Una familia que reserva varias sesiones queda muy por debajo. Si el almacén falla, no se
// bloquea a nadie (el bloqueo de reservas sigue protegiendo contra duplicados).
const { BookingError } = require('./booking-service.js');

const LIMITS = {
  attempts: { max: 12, windowMs: 10 * 60e3 },
  newRequests: { max: 8, windowMs: 24 * 3600e3 },
};

function createRateLimiter({ store, now = () => Date.now(), limits = LIMITS, prefix = 'ely-reservas', log = console } = {}) {
  const win = (l) => Math.floor(now() / l.windowMs);
  const retryAfter = (l) => Math.ceil((l.windowMs - (now() % l.windowMs)) / 1000);

  // Lanza BookingError('rate_limited') si la IP superó un límite
  async function check(ip, ref) {
    if (!store) return;
    try {
      const a = limits.attempts;
      if ((await store.incr(`${prefix}:rl:a:${ip}:${win(a)}`, a.windowMs)) > a.max) {
        throw new BookingError('rate_limited', 'Demasiados intentos', { retryAfter: retryAfter(a) });
      }
      const n = limits.newRequests;
      const isNew = await store.setNx(`${prefix}:rl:ref:${ip}:${String(ref).slice(0, 64)}`, '1', n.windowMs);
      if (isNew && (await store.incr(`${prefix}:rl:n:${ip}:${win(n)}`, n.windowMs)) > n.max) {
        throw new BookingError('rate_limited', 'Demasiadas solicitudes nuevas', { retryAfter: retryAfter(n) });
      }
    } catch (err) {
      if (err instanceof BookingError) throw err;
      log.warn(`[reservas] Límite de envíos sin almacén: ${err.message}`);
    }
  }
  return { check };
}

module.exports = { createRateLimiter, LIMITS };
