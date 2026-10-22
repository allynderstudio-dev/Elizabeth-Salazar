// Conversión entre la hora local de una zona (America/Caracas) y UTC.
// No se asume un desfase fijo: se calcula con Intl para cada instante.
const pad = (n) => String(n).padStart(2, '0');

const formatters = new Map();
function partsIn(timeZone, ms) {
  if (!formatters.has(timeZone)) {
    formatters.set(timeZone, new Intl.DateTimeFormat('en-US', {
      timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short',
    }));
  }
  const out = {};
  formatters.get(timeZone).formatToParts(new Date(ms)).forEach((p) => { out[p.type] = p.value; });
  return out;
}

// Desfase (ms) de la zona respecto a UTC en ese instante. Caracas: −4 h.
function offsetMs(timeZone, ms) {
  const p = partsIn(timeZone, ms);
  const asUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second));
  return asUtc - Math.floor(ms / 1000) * 1000;
}

// '2026-11-05', '08:00' (hora local de la zona) → Date en UTC
function localToUtc(date, time, timeZone) {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let ms = guess - offsetMs(timeZone, guess);
  ms = guess - offsetMs(timeZone, ms); // segunda pasada por si el desfase cambia ese día
  const back = utcToLocal(new Date(ms).toISOString(), timeZone);
  if (back.date !== date || back.time !== `${pad(hh)}:${pad(mm)}`) throw new RangeError(`Hora local inexistente: ${date} ${time}`);
  return new Date(ms);
}

// ISO con cualquier desfase → { date: 'AAAA-MM-DD', time: 'HH:MM', weekday: 0..6 } en la zona
const WEEKDAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
function utcToLocal(isoString, timeZone) {
  const ms = Date.parse(isoString);
  if (Number.isNaN(ms)) throw new RangeError(`Fecha inválida: ${isoString}`);
  const p = partsIn(timeZone, ms);
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}`, weekday: WEEKDAYS[p.weekday] };
}

const todayIn = (timeZone, now = Date.now()) => utcToLocal(new Date(now).toISOString(), timeZone).date;

function addDays(date, n) {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

function addMonths(month, n) {
  const [y, m] = month.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}`;
}

const lastDayOfMonth = (month) => {
  const [y, m] = month.split('-').map(Number);
  return `${month}-${pad(new Date(Date.UTC(y, m, 0)).getUTCDate())}`;
};

const isIsoDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && addDays(s, 0) === s;
const isMonth = (s) => typeof s === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
const isTime = (s) => typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

module.exports = { localToUtc, utcToLocal, todayIn, addDays, addMonths, lastDayOfMonth, isIsoDate, isMonth, isTime };
