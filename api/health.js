// GET /api/health — estado de las reservas en línea, sin secretos ni escrituras.
// → 200 { modo: 'production' | 'test' | 'read-only', reservas: 'online' | 'whatsapp', almacen: 'redis' | 'memory' | 'ninguno' }
// En producción, reservas 'whatsapp' es un incidente (BR-18). Lo usa npm run live:check.
const { send, serviceFromEnv } = require('./_lib/http.js');

function createHandler(getService = serviceFromEnv) {
  return async (req, res) => {
    if (req.method !== 'GET') return send(res, 405, { error: 'method' }, { Allow: 'GET' });
    const service = getService();
    return send(res, 200, { modo: service.environment, reservas: service.mode, almacen: service.store ? service.store.kind : 'ninguno' });
  };
}

module.exports = createHandler();
module.exports.createHandler = createHandler;
