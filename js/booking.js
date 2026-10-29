// Reservar: flujo de 5 pasos + pantalla final.
// Navegación con historial (?paso=N), validación, formularios condicionales por servicio,
// abono del 50 %, resumen, barra de acciones sticky y borrador en sessionStorage.
// Dos modos por paquete:
//  - "live": el paquete tiene evento de Cal.com (lo decide el backend). Solo se ofrecen
//    horarios que Cal.com devuelve como libres y la solicitud se registra como pendiente
//    en Cal.com ANTES de mostrar éxito o el enlace a WhatsApp.
//  - "manual": sin evento o sin endpoints. Fecha y hora son preferencias y todo se
//    completa por WhatsApp; no se dice que la solicitud quedó registrada.
// Si Cal.com falla para un paquete "live", no se inventa disponibilidad: se pide reintentar.
(() => {
  const CFG = window.BOOKING_CONFIG;
  const DATA = window.BOOKING_DATA;
  const form = document.getElementById('reserva');
  if (!CFG || !DATA || !form) return;

  const LIVE_AVAILABILITY = Boolean(CFG.availabilityEndpoint);
  const LIVE_BOOKING = LIVE_AVAILABILITY && Boolean(CFG.bookingEndpoint);

  const $ = (sel, root = form) => root.querySelector(sel);
  const $$ = (sel, root = form) => [...root.querySelectorAll(sel)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => `US$${Math.round(n * 100) / 100}`;
  const deposit = (n) => n * CFG.depositRate;
  const normalize = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  /* ---------- Textos ---------- */
  const STEPS = [
    { name: 'Sesión', title: 'Elige tu sesión', subtitle: () => 'Selecciona el tipo de sesión que quieres reservar.' },
    { name: 'Paquete', title: 'Selecciona tu paquete', subtitle: (s) => `${s ? s.name : ''} · Elige el paquete que mejor se adapte a ti.` },
    { name: 'Fecha y hora', title: 'Elige la fecha y la hora', subtitle: () => 'Sesiones de lunes a sábado, en hora de Venezuela (UTC−4).' },
    { name: 'Detalles y contacto', title: 'Detalles y contacto', subtitle: (s) => `Unas preguntas para preparar ${s ? s.phrase : 'tu sesión'} y tus datos para coordinarla.` },
    { name: 'Revisión', title: 'Revisa tu solicitud', subtitle: () => 'Confirma que todo esté bien antes de enviarla. Tu sesión se confirma después del abono del 50%.' },
  ];

  // Copias según el modo. "live" = textos aprobados en Figma (28/10/2026): el abono se pide
  // dentro de 24 horas, pero la solicitud NUNCA vence sola; el horario sigue apartado hasta que
  // Ely confirma, rechaza o cancela en Cal.com (ver README).
  // "manual" = modo WhatsApp (sin Cal.com): no afirma que la solicitud quedó registrada.
  const COPY = {
    live: {
      submit: 'Enviar solicitud de reserva',
      notice: 'Al enviar tu solicitud, tu horario queda apartado mientras Ely la revisa. Para confirmar tu sesión, debes realizar el abono del 50% del valor total.',
      after1: 'Registramos tu solicitud y apartamos tu horario mientras Ely la revisa.',
      after2: (d) => `Realizas el abono de ${d} (50%) y lo coordinas con Ely por WhatsApp.`,
      successTitle: 'Recibimos tu solicitud de reserva',
      successSubtitle: 'Tu horario ha quedado apartado. Para confirmar tu sesión, realiza el abono del 50% dentro de las próximas 24 horas y envía el comprobante por WhatsApp. Ely verificará el pago y te confirmará la reserva.',
      badge: 'Pendiente de abono',
      statusTitle: 'Falta tu abono del 50%',
      statusText: 'Tu solicitud quedó registrada, pero aún no es una reserva confirmada.',
      next1: () => 'Envía el mensaje de WhatsApp: así Ely recibe los datos de tu solicitud.',
      timeLegend: 'Horarios disponibles',
      timeNote: 'Cada sesión dura alrededor de 2 horas. Los horarios tachados ya no están disponibles.',
    },
    manual: {
      submit: 'Preparar solicitud por WhatsApp',
      notice: 'Ely te confirmará por WhatsApp si tu horario está disponible. Para confirmar tu sesión, debes realizar el abono del 50% del valor total.',
      after1: 'Envías tu solicitud por WhatsApp y Ely confirma si tu horario está disponible.',
      after2: (d) => `Realizas el abono de ${d} (50%) y lo coordinas con Ely por WhatsApp.`,
      successTitle: 'Tu solicitud está lista',
      successSubtitle: 'Envíala por WhatsApp para que Ely confirme tu horario. Para confirmar tu sesión, debes realizar el abono del 50%.',
      badge: 'Pendiente de envío',
      statusTitle: 'Envía tu solicitud por WhatsApp',
      statusText: 'Aún no está registrada ni es una reserva confirmada; se completa al enviar el mensaje.',
      next1: (d) => `Envía el mensaje por WhatsApp y realiza el abono de ${d} (50%) en las próximas 24 horas.`,
      // Compartido por los dos modos (Figma, "Próximos pasos" 2)
      timeLegend: 'Elige tu horario preferido',
      timeNote: 'Cada sesión dura alrededor de 2 horas. Ely confirmará la disponibilidad por WhatsApp.',
    },
  };
  // El modo se decide con el horario elegido (ver liveSlotSelected) o la reserva ya creada
  const isLive = () => (state.step === 'success' && Boolean(state.booking)) || liveSlotSelected();
  const T = () => (isLive() ? COPY.live : COPY.manual);

  const ERR = {
    required: 'Este campo es obligatorio',
    service: 'Elige una sesión para continuar.',
    package: 'Elige un paquete para continuar.',
    date: 'Elige una fecha para continuar.',
    time: 'Elige un horario para continuar.',
    phone: 'Ingresa un número de WhatsApp válido (10 dígitos).',
    consent: 'Debes aceptar las políticas de reserva para continuar',
    dateFuture: 'Elige una fecha a partir de hoy.',
    datePast: 'La fecha no puede ser posterior a hoy.',
    submit: 'No pudimos enviar tu solicitud. Inténtalo de nuevo o escríbenos por WhatsApp.',
    uncertain: 'No pudimos confirmar si tu solicitud quedó registrada. Vuelve a intentarlo: no se duplicará.',
    slotTaken: 'Ese horario acaba de ocuparse. Elige otro, por favor.',
    priceChanged: 'El precio de este paquete cambió. Revisa el resumen antes de enviar.',
    availability: 'No pudimos consultar la disponibilidad. Inténtalo de nuevo en unos minutos o escríbenos por WhatsApp.',
    busy: 'Estamos procesando otra solicitud para ese día. Vuelve a intentarlo en unos segundos: no se duplicará.',
    rateLimited: 'Recibimos varias solicitudes seguidas desde tu conexión. Espera unos minutos y vuelve a intentarlo, o escríbenos por WhatsApp. Tus datos se mantienen.',
  };
  const NEXT2 = (d) => `Coordina con Ely el método de pago del abono de ${d}.`;

  /* ---------- Fechas (hora de Venezuela) ---------- */
  const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
  const parseIso = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
  const isoFromDate = (dt) => iso(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate());
  const addDays = (s, n) => { const dt = parseIso(s); dt.setUTCDate(dt.getUTCDate() + n); return isoFromDate(dt); };
  const todayIso = () => new Intl.DateTimeFormat('en-CA', { timeZone: CFG.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const longDate = (s, withYear = true) => {
    const dt = parseIso(s);
    return `${DAYS[dt.getUTCDay()]} ${dt.getUTCDate()} de ${MONTHS[dt.getUTCMonth()]}${withYear ? ` de ${dt.getUTCFullYear()}` : ''}`;
  };
  const shortDate = (s) => { const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`; };
  // Meses de calendario con ajuste a fin de mes (31/10 + 4 → 28/02); compartido con el servidor
  const { addCalendarMonths } = DATA;
  const TODAY = todayIso();
  const MIN_DATE = addDays(TODAY, CFG.minDaysAhead);
  const monthKey = (s) => s.slice(0, 7);
  const addMonths = (key, n) => { const [y, m] = key.split('-').map(Number); const dt = new Date(Date.UTC(y, m - 1 + n, 1)); return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}`; };
  const MIN_MONTH = monthKey(MIN_DATE);
  const MAX_MONTH = addMonths(MIN_MONTH, CFG.maxMonthsAhead);
  // Etiqueta "8:00 a. m."; también para horas que Cal.com devuelva fuera de las habituales
  const timeLabel = (v) => {
    const known = CFG.startTimes.find((t) => t.value === v);
    if (known) return known.label;
    const [h, m] = String(v).split(':').map(Number);
    return `${h % 12 || 12}:${pad(m)} ${h < 12 ? 'a. m.' : 'p. m.'}`;
  };

  /* ---------- Estado + borrador ---------- */
  const blank = () => ({
    step: 1, category: 'todas', service: null, pkg: null, date: null, time: null,
    viewMonth: null, details: {}, name: '', code: CFG.defaultCountryCode, phone: '', consent: false,
    // Referencia propia de la solicitud: se reutiliza en reintentos para no duplicar reservas
    requestRef: null, requestKey: null, booking: null,
    // Horario que dejó de estar libre al enviar o al volver: { date, time } (Figma 257:5898)
    conflict: null,
  });
  let state = blank();
  const touched = new Set();

  const store = {
    load() { try { return JSON.parse(sessionStorage.getItem(CFG.storageKey) || 'null'); } catch (e) { return null; } },
    save() { try { sessionStorage.setItem(CFG.storageKey, JSON.stringify(state)); } catch (e) { /* almacenamiento no disponible */ } },
    clear() { try { sessionStorage.removeItem(CFG.storageKey); } catch (e) { /* sin acceso */ } },
  };

  const getService = () => DATA.SERVICES.find((s) => s.slug === state.service) || null;
  const getPackage = () => { const s = getService(); return s ? s.packages.find((p) => p.slug === state.pkg) || null : null; };
  // Newborn con "¿Tu bebé ya nació?" = No: no se puede reservar (BR-08)
  const unbornBlocked = () => Boolean(getService() && getService().requiresBirth && state.details.nacio === 'No');
  // Precio del paquete elegido con sus recargos (Newborn: bebés adicionales). null sin paquete.
  const getQuote = () => {
    const s = getService();
    const p = getPackage();
    if (!s || !p) return null;
    if (unbornBlocked()) return null; // Newborn sin nacer: no se muestra precio ni abono
    const rule = s.babies;
    const babies = rule ? Math.min(rule.max, Math.max(rule.min, Math.round(Number(state.details[rule.field])) || rule.min)) : undefined;
    return DATA.quote(s, p, babies);
  };
  const findPackage = (service, param) => {
    const n = normalize(param);
    return service.packages.find((p) => p.slug === n || normalize(p.name) === n) || null;
  };

  /* ---------- Adaptadores del backend propio (/api → Cal.com) ---------- */
  // Caché por servicio|paquete|mes: { 'AAAA-MM-DD': ['08:00', ...] } (solo libres)
  // o null cuando el paquete se coordina por WhatsApp. Los fallos no se guardan.
  const availabilityCache = new Map();
  const cacheKey = (month) => `${state.service}|${state.pkg}|${month}`;

  async function fetchAvailability(month) {
    if (!LIVE_AVAILABILITY || !state.service || !state.pkg) return null;
    const key = cacheKey(month);
    if (availabilityCache.has(key)) return availabilityCache.get(key);
    const url = new URL(CFG.availabilityEndpoint, location.href);
    url.searchParams.set('servicio', state.service);
    url.searchParams.set('paquete', state.pkg);
    url.searchParams.set('mes', month);
    const res = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' });
    if (!res.ok) throw new Error(`Disponibilidad: ${res.status}`);
    const json = await res.json();
    if (!json || typeof json.reservable !== 'boolean') throw new Error('Disponibilidad: respuesta inesperada');
    const days = json.reservable ? json.dias || {} : null;
    if (days && (typeof days !== 'object' || Object.values(days).some((v) => !Array.isArray(v)))) throw new Error('Disponibilidad: formato inesperado');
    availabilityCache.set(key, days);
    return days;
  }

  // ¿El horario elegido salió de la disponibilidad real de Cal.com? Decide el modo.
  function liveSlotSelected() {
    if (!LIVE_BOOKING || !state.date || !state.time) return false;
    const days = availabilityCache.get(cacheKey(monthKey(state.date)));
    return Boolean(days && (days[state.date] || []).includes(state.time));
  }

  // Referencia estable mientras no cambien sesión, paquete, fecha ni hora
  function requestRef() {
    const key = `${state.service}|${state.pkg}|${state.date}|${state.time}|${state.code}${digits(state.phone)}`;
    if (!state.requestRef || state.requestKey !== key) {
      const rnd = window.crypto && crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
      state.requestRef = rnd;
      state.requestKey = key;
      store.save();
    }
    return state.requestRef;
  }

  // Cuerpo para el endpoint de reservas. Sin correo electrónico.
  // El servidor recalcula y valida precio y abono; estos valores solo detectan diferencias.
  function buildBookingPayload() {
    const s = getService();
    const p = getPackage();
    const q = getQuote();
    return {
      referencia: requestRef(),
      servicio: s.slug, paquete: p.slug, precio: q.total, abono: deposit(q.total),
      ...(q.babies ? { bebes: q.babies } : {}),
      ...(s.requiresBirth ? { nacio: state.details.nacio, nacimiento: state.details.nacimiento || '' } : {}),
      sitio: $('#sitio-web') ? $('#sitio-web').value : '', // campo trampa: las personas no lo ven
      fecha: state.date, hora: state.time, zonaHoraria: CFG.timezone,
      nombre: state.name.trim(), whatsapp: `${state.code}${digits(state.phone)}`,
      detalles: detailEntries().reduce((o, [label, value]) => ({ ...o, [label]: value }), {}),
    };
  }

  // → { ok: true, booking } | { ok: false, error: 'slot_taken' | 'uncertain' | ... }
  // Sin respuesta (red caída, tiempo agotado) el resultado es incierto: se reintenta con la misma referencia.
  async function submitBooking(payload) {
    let res;
    try {
      res = await fetch(CFG.bookingEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout ? AbortSignal.timeout(30000) : undefined,
      });
    } catch (err) {
      return { ok: false, error: 'uncertain' };
    }
    let json = null;
    try { json = await res.json(); } catch (e) { json = null; }
    if (res.ok && json && typeof json.uid === 'string' && json.uid && json.referencia) return { ok: true, booking: json };
    if (res.ok) return { ok: false, error: 'uncertain' }; // 2xx sin identificador: no se da por hecha
    return { ok: false, error: (json && json.error) || (res.status >= 500 ? 'uncertain' : 'server'), body: json };
  }

  /* ---------- Paso 1 · Sesiones ---------- */
  const chipsEl = $('[data-filter-chips]');
  const servicesEl = $('[data-service-options]');

  chipsEl.innerHTML = DATA.CATEGORIES.map((c) =>
    `<button class="filter-chip" type="button" aria-pressed="false" data-category="${c.slug}">${esc(c.label)}</button>`).join('');

  servicesEl.innerHTML = DATA.SERVICES.map((s) => {
    const min = Math.min(...s.packages.map((p) => p.price));
    const n = s.packages.length;
    const meta = `${n > 1 ? 'desde ' : ''}${money(min)} · ${n} ${n === 1 ? 'paquete' : 'paquetes'}`;
    return `<label class="service-option" data-category="${s.category}">
      <input class="visually-hidden" type="radio" name="sesion" value="${s.slug}">
      <span class="service-option__thumb"><img src="${s.thumb}" alt="" width="72" height="72" loading="lazy" decoding="async"></span>
      <span class="service-option__text"><span class="service-option__title">${esc(s.name)}</span><span class="service-option__meta">${esc(meta)}</span></span>
      <span class="radio-mark" aria-hidden="true"></span>
    </label>`;
  }).join('');

  chipsEl.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-category]');
    if (!chip) return;
    state.category = chip.dataset.category;
    renderFilters();
    store.save();
  });

  servicesEl.addEventListener('change', (e) => {
    if (e.target.name !== 'sesion') return;
    if (state.service !== e.target.value) {
      state.service = e.target.value;
      const s = getService();
      state.pkg = s.packages.length === 1 ? s.packages[0].slug : null;
      state.details = {};
      if (LIVE_AVAILABILITY) state.time = null;
      touched.clear();
    }
    hideError('error-sesion');
    renderAll();
    store.save();
  });

  function renderFilters() {
    $$('.filter-chip', chipsEl).forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.category === state.category)));
    $$('.service-option', servicesEl).forEach((o) => {
      o.hidden = state.category !== 'todas' && o.dataset.category !== state.category;
    });
    const s = getService();
    $('[data-selection-status]').textContent = `Sesión elegida: ${s ? s.name : 'ninguna'}`;
  }

  function renderServices() {
    $$('input[name="sesion"]', servicesEl).forEach((i) => {
      i.checked = i.value === state.service;
      i.closest('.service-option').classList.toggle('is-selected', i.checked);
    });
  }

  /* ---------- Paso 2 · Paquetes ---------- */
  const packagesEl = $('[data-package-options]');

  function renderPackages() {
    const s = getService();
    if (!s) { packagesEl.innerHTML = ''; return; }
    if (packagesEl.dataset.service !== s.slug) {
      packagesEl.dataset.service = s.slug;
      packagesEl.innerHTML = s.packages.map((p) => `<label class="package-option">
        <input class="visually-hidden" type="radio" name="paquete" value="${p.slug}">
        <span class="radio-mark" aria-hidden="true"></span>
        <span class="package-option__text">
          <span class="package-option__name">${esc(p.name)}</span>
          <span class="package-option__details">${esc(p.details)}</span>
          <span class="package-option__deposit">Abono: ${money(deposit(p.price))}</span>
        </span>
        <span class="package-option__price">${money(p.price)}</span>
      </label>`).join('');
    }
    $$('input[name="paquete"]', packagesEl).forEach((i) => {
      i.checked = i.value === state.pkg;
      i.closest('.package-option').classList.toggle('is-selected', i.checked);
    });
    const notice = $('[data-package-notice]');
    notice.hidden = !s.notice;
    if (s.notice) {
      $('[data-notice-title]').textContent = s.notice.title;
      $('[data-notice-body]').textContent = s.notice.body;
    }
  }

  packagesEl.addEventListener('change', (e) => {
    if (e.target.name !== 'paquete') return;
    if (state.pkg !== e.target.value) {
      // Se conserva la hora: todos los paquetes usan el mismo calendario y bloques de 2 h.
      // Si con el nuevo paquete ya no está libre, el paso 3 lo avisa (ver goTo).
      state.pkg = e.target.value;
    }
    hideError('error-paquete');
    renderAll();
    store.save();
  });

  /* ---------- Paso 3 · Calendario y horarios ---------- */
  const lostSlot = (value) => Boolean(state.conflict && state.conflict.date === state.date && state.conflict.time === value);
  const calDays = $('[data-cal-days]');
  const slotsEl = $('[data-time-slots]');
  let monthAvailability = null; // null = sin disponibilidad real (modo WhatsApp)
  let availabilityError = false; // Cal.com/backend falló: no se ofrece ningún día
  let focusDate = null;

  // Disponibilidad conocida del mes de una fecha (null = modo WhatsApp o no consultada)
  const knownDays = (dateIso) => (LIVE_AVAILABILITY ? availabilityCache.get(cacheKey(monthKey(dateIso))) || null : null);

  function dayStatus(dateIso) {
    const dow = parseIso(dateIso).getUTCDay();
    if (dateIso < MIN_DATE || !CFG.workingDays.includes(dow)) return 'unavailable';
    if (monthKey(dateIso) > MAX_MONTH) return 'unavailable';
    if (availabilityError && monthKey(dateIso) === state.viewMonth) return 'unavailable';
    const days = monthKey(dateIso) === state.viewMonth ? monthAvailability : knownDays(dateIso);
    if (days && !(days[dateIso] || []).length) return 'unavailable';
    return 'available';
  }

  // ¿El horario está libre? Con disponibilidad real, solo si Cal.com lo devolvió.
  function slotFree(dateIso, time) {
    const days = knownDays(dateIso);
    if (days) return (days[dateIso] || []).includes(time);
    return CFG.startTimes.some((t) => t.value === time);
  }

  async function loadMonth(month = state.viewMonth) {
    availabilityError = false;
    if (!LIVE_AVAILABILITY || !month) { monthAvailability = null; return; }
    $('[data-calendar]').setAttribute('aria-busy', 'true');
    try {
      monthAvailability = await fetchAvailability(month);
    } catch (err) {
      // Sin respuesta fiable no se inventa disponibilidad ni se pasa a "horario preferido"
      monthAvailability = null;
      availabilityError = true;
    }
    $('[data-calendar]').removeAttribute('aria-busy');
  }

  function renderCalendar() {
    if (!state.viewMonth) state.viewMonth = state.date ? monthKey(state.date) : MIN_MONTH;
    const [y, m] = state.viewMonth.split('-').map(Number);
    $('[data-cal-month]').textContent = `${cap(MONTHS[m - 1])} ${y}`;
    $('[data-cal-prev]').disabled = state.viewMonth <= MIN_MONTH;
    $('[data-cal-next]').disabled = state.viewMonth >= MAX_MONTH;

    const first = new Date(Date.UTC(y, m - 1, 1));
    const lead = (first.getUTCDay() + 6) % 7; // semana empieza en lunes
    const total = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const dates = [];
    for (let d = 1; d <= total; d += 1) dates.push(iso(y, m - 1, d));

    // Día enfocable (tabindex roving): seleccionado > enfocado > primer disponible
    const inMonth = (s) => s && monthKey(s) === state.viewMonth;
    let tabDate = inMonth(focusDate) ? focusDate : inMonth(state.date) ? state.date : dates.find((d) => dayStatus(d) === 'available') || dates[0];

    const cells = [];
    for (let i = 0; i < lead; i += 1) cells.push('<td class="calendar__empty"></td>');
    dates.forEach((d) => {
      const status = dayStatus(d);
      const selected = d === state.date;
      const label = `${longDate(d)}${status === 'unavailable' ? ', no disponible' : ''}`;
      cells.push(`<td><button type="button" class="cal-day${selected ? ' is-selected' : ''}${status === 'unavailable' ? ' is-unavailable' : ''}"
        data-date="${d}" aria-label="${label}" aria-pressed="${selected}"${status === 'unavailable' ? ' aria-disabled="true"' : ''}
        tabindex="${d === tabDate ? 0 : -1}">${Number(d.slice(8))}</button></td>`);
    });
    while (cells.length % 7) cells.push('<td class="calendar__empty"></td>');
    const rows = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(`<tr>${cells.slice(i, i + 7).join('')}</tr>`);
    calDays.innerHTML = rows.join('');
  }

  function renderSlots() {
    const dateEl = $('[data-time-date]');
    dateEl.textContent = state.date ? cap(longDate(state.date, false)) : 'Primero elige una fecha';
    const days = state.date ? knownDays(state.date) : null;
    const live = Boolean(days);
    const free = live ? days[state.date] || [] : null;
    // Horas habituales (tachadas si Cal.com no las devuelve) + cualquier otra que Cal.com ofrezca
    const times = CFG.startTimes.map((t) => t.value);
    if (free) free.forEach((v) => { if (!times.includes(v)) times.push(v); });
    times.sort();
    slotsEl.innerHTML = availabilityError ? '' : times.map((value) => {
      const disabled = !state.date || (free && !free.includes(value));
      const checked = state.time === value && !disabled;
      return `<label class="time-slot${checked ? ' is-selected' : ''}${disabled && state.date ? ' is-unavailable' : ''}">
        <input class="visually-hidden" type="radio" name="hora" value="${value}"${checked ? ' checked' : ''}${disabled ? ' disabled' : ''}>
        <img class="time-slot__check" src="assets/icons/check-inverse.svg" alt="" width="16" height="16">
        <span>${timeLabel(value)}</span>${lostSlot(value) ? '<span class="time-slot__tag">No disponible</span>' : disabled && state.date ? '<span class="visually-hidden">, no disponible</span>' : ''}
      </label>`;
    }).join('');
    const note = $('[data-time-note]');
    note.textContent = availabilityError ? ERR.availability : (live || monthAvailability ? COPY.live.timeNote : COPY.manual.timeNote);
    $('[data-time-legend]').textContent = live || monthAvailability ? COPY.live.timeLegend : COPY.manual.timeLegend;
    $('[data-retry-availability]').hidden = !availabilityError;
  }

  $('[data-retry-availability]').addEventListener('click', async () => {
    await loadMonth();
    renderCalendar();
    renderSlots();
  });

  async function changeMonth(delta, keepFocus) {
    const next = addMonths(state.viewMonth, delta);
    if (next < MIN_MONTH || next > MAX_MONTH) return false;
    state.viewMonth = next;
    await loadMonth();
    renderCalendar();
    if (keepFocus) focusCalendarDay();
    return true;
  }

  function focusCalendarDay() {
    const btn = calDays.querySelector('[tabindex="0"]');
    if (btn) btn.focus();
  }

  $('[data-cal-prev]').addEventListener('click', () => { focusDate = null; changeMonth(-1); });
  $('[data-cal-next]').addEventListener('click', () => { focusDate = null; changeMonth(1); });

  calDays.addEventListener('click', (e) => {
    const btn = e.target.closest('.cal-day');
    if (!btn || btn.getAttribute('aria-disabled') === 'true') return;
    state.date = btn.dataset.date;
    focusDate = state.date;
    const free = monthAvailability ? monthAvailability[state.date] || [] : null;
    if (free && state.time && !free.includes(state.time)) state.time = null;
    hideError('error-fecha');
    renderCalendar();
    focusCalendarDay();
    renderSlots();
    renderSummaries();
    store.save();
  });

  calDays.addEventListener('keydown', async (e) => {
    const btn = e.target.closest('.cal-day');
    if (!btn) return;
    const cur = btn.dataset.date;
    const dow = (parseIso(cur).getUTCDay() + 6) % 7;
    const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -dow, End: 6 - dow };
    let target = null;
    if (e.key in moves) target = addDays(cur, moves[e.key]);
    else if (e.key === 'PageUp' || e.key === 'PageDown') {
      const d = Number(cur.slice(8));
      const nm = addMonths(cur.slice(0, 7), e.key === 'PageUp' ? -1 : 1);
      const [ny, nmm] = nm.split('-').map(Number);
      const last = new Date(Date.UTC(ny, nmm, 0)).getUTCDate();
      target = `${nm}-${pad(Math.min(d, last))}`;
    } else return;
    e.preventDefault();
    const tm = monthKey(target);
    if (tm < MIN_MONTH || tm > MAX_MONTH) return;
    focusDate = target;
    if (tm !== state.viewMonth) {
      state.viewMonth = tm;
      await loadMonth();
    }
    renderCalendar();
    focusCalendarDay();
  });

  slotsEl.addEventListener('change', (e) => {
    if (e.target.name !== 'hora') return;
    state.time = e.target.value;
    state.conflict = null; // eligió otro horario
    updateConflict();
    updateNext();
    hideError('error-hora');
    renderSlots();
    const input = slotsEl.querySelector(`input[value="${state.time}"]`);
    if (input) input.focus();
    renderSummaries();
    store.save();
  });

  /* ---------- Paso 4 · Formularios por servicio ---------- */
  const detailsEl = $('[data-detail-fields]');
  const pkgFlag = (flag) => () => Boolean(getPackage() && getPackage()[flag]);
  const NOTES = { type: 'textarea', name: 'notas', label: 'Cuéntanos un poco más', optional: true, placeholder: 'Comparte ideas, estilos o detalles importantes para tu sesión.', helper: 'Estilos, colores o personas que participarán' };
  const YES_NO = ['Sí', 'No'];

  // Edad del bebé el día de la sesión (no hoy), en meses de calendario y días.
  // Newborn es hasta los 3 meses: elegible mientras la sesión sea antes de nacimiento + 4 meses.
  // null si falta la fecha o es posterior a hoy.
  function babyAge(birth) {
    if (!birth || !/^\d{4}-\d{2}-\d{2}$/.test(birth) || birth > TODAY) return null;
    const session = state.date || MIN_DATE;
    let months = 0;
    while (addCalendarMonths(birth, months + 1) <= session) months += 1;
    const days = Math.round((parseIso(session) - parseIso(addCalendarMonths(birth, months))) / 864e5);
    const dayText = `${days} ${days === 1 ? 'día' : 'días'}`;
    const monthText = `${months} ${months === 1 ? 'mes' : 'meses'}`;
    const label = months === 0 ? dayText : days === 0 ? monthText : `${monthText} y ${dayText}`;
    const eligible = DATA.newbornEligibility({ born: 'Sí', birth, session, today: TODAY }) === 'ok';
    return { months, days, label, eligible };
  }

  // Definiciones (Figma: Paso 4 Embarazo + "Conditional detail forms").
  // summary: texto corto para el resumen (derivado).
  const FORMS = {
    embarazo: [
      { row: [
        { type: 'stepper', name: 'semanas', label: 'Semanas de embarazo', value: 30, min: 1, max: 42, helper: 'Lo ideal es entre la semana 28 y la 32.', summary: (v) => `Semanas de embarazo: ${v}` },
        { type: 'date', name: 'fpp', label: 'Fecha probable de parto', min: TODAY },
      ] },
      { type: 'radio', name: 'lugar', label: '¿Dónde será tu sesión?', options: ['En el estudio', 'En exteriores'], locked: () => (getPackage() && getPackage().place === 'exteriores' ? 'En exteriores' : 'En el estudio'), helper: 'Según el paquete que elegiste. Puedes cambiarlo volviendo al paso 2.' },
      { type: 'radio', name: 'vestuario', label: 'Vestuario', options: ['Traeré mi propio vestuario', 'Quiero usar vestidos del estudio', 'Ambos'], helper: 'Si quieres usar vestidos del estudio, los eliges con anticipación.',
        summary: (v) => ({ 'Traeré mi propio vestuario': 'Vestuario propio', 'Quiero usar vestidos del estudio': 'Vestidos del estudio', Ambos: 'Vestuario propio y del estudio' }[v]) },
      { type: 'radio', name: 'pareja', label: '¿Participará tu pareja o tu familia?', options: YES_NO },
      NOTES,
    ],
    newborn: [
      { type: 'radio', name: 'nacio', label: '¿Tu bebé ya nació?', options: YES_NO },
      { row: [
        { type: 'date', name: 'nacimiento', label: 'Fecha de nacimiento', max: TODAY, maxError: 'La fecha de nacimiento no puede ser posterior a hoy.', when: (d) => d.nacio === 'Sí' },
        { type: 'computed', name: 'edad', label: 'Edad del bebé', when: (d) => d.nacio === 'Sí',
          helper: () => `Calculada a la fecha de tu sesión${state.date ? ` (${shortDate(state.date)})` : ''}.`,
          compute: (d) => { const a = babyAge(d.nacimiento); return a ? a.label : ''; },
          summary: (v) => (v ? `Edad del bebé: ${v}` : '') },
      ] },
      { row: [
        { type: 'stepper', name: 'bebes', label: 'Cantidad de bebés', value: 1, min: 1, max: 3, unit: 'bebé', helper: 'El precio incluye un bebé. Cada bebé adicional suma US$20.', summary: (v) => `Bebés: ${v}`, when: (d) => d.nacio !== 'No' },
        { type: 'stepper', name: 'acompanantes', label: 'Acompañantes', value: 1, min: 0, max: 1, unit: 'persona', helper: 'Una persona puede acompañarte para ayudar.', when: (d) => d.nacio !== 'No' },
      ] },
      // Bebé sin nacer: no se reserva (BR-08, Figma 256:6027). Solo este aviso y "Volver a sesiones".
      { type: 'gate', name: 'sinNacer', title: 'Tu bebé aún no ha nacido',
        body: 'Para reservar una sesión Newborn, es necesario que tu bebé ya haya nacido. Cuando llegue ese momento, podrás elegir una fecha disponible para su sesión.',
        action: { label: 'Volver a sesiones', step: 1 },
        when: (d) => d.nacio === 'No' },
      // Bloquea el paso si el bebé tendrá 4 meses o más el día de la sesión
      { type: 'gate', name: 'elegible', title: 'Sesión Newborn no disponible',
        body: 'Las sesiones Newborn están disponibles para bebés de hasta 3 meses. A partir del cuarto mes, te recomendamos nuestra sesión Mes a Mes.',
        action: { label: 'Ver sesión Mes a Mes', href: 'servicio-detalle.html?sesion=mes-a-mes' },
        when: (d) => d.nacio === 'Sí' && Boolean(babyAge(d.nacimiento)) && !babyAge(d.nacimiento).eligible },
      { type: 'notice', when: (d) => d.nacio !== 'No', title: 'Edad de tu bebé', body: 'Las sesiones Newborn son para bebés de hasta 3 meses. El posado clásico es entre el día 8 y el 12 de nacido; si tu bebé tiene más de 15 días, prepararemos una sesión adecuada a su edad.' },
    ],
    'cumpleanos-infantiles': [
      { row: [
        { type: 'stepper', name: 'edad', label: 'Edad que cumple', value: 3, min: 2, max: 14, unit: 'año', helper: 'Sesiones para niñas y niños de 2 a 14 años.', summary: (v) => `Edad que cumple: ${v}` },
        { type: 'date', name: 'cumple', label: 'Fecha del cumpleaños' },
      ] },
      { type: 'text', name: 'tematica', label: 'Temática', placeholder: 'Ej.: mariposas, safari o flores', helper: 'Pídela con 2 semanas de anticipación. No trabajamos temáticas de personajes.', when: pkgFlag('tematica'), summary: (v) => `Temática: ${v}` },
      { type: 'radio', name: 'cakesmash', label: '¿Quieres cake smash?', options: YES_NO, when: pkgFlag('cakeSmash') },
      { type: 'radio', name: 'decoracion', label: 'Decoración', options: ['Usaremos la del estudio', 'Traeré globos o accesorios'], helper: 'Si traes globos o accesorios, deben llegar al estudio 2 días antes.' },
      { type: 'text', name: 'referencias', label: 'Referencias', optional: true, placeholder: 'Enlace a fotos de referencia' },
    ],
    familiar: [
      { type: 'stepper', name: 'participantes', label: 'Número de participantes', value: 4, min: 1, max: 30, unit: 'persona', helper: 'Incluye a todas las personas que aparecerán en las fotos.', summary: (v) => `Participantes: ${v}` },
      { type: 'text', name: 'edades', label: 'Edades de los niños', optional: true, placeholder: 'Ej.: 3 y 7 años' },
      { type: 'radio', name: 'mascota', label: '¿Vendrá su mascota?', options: YES_NO, helper: 'Las mascotas participan en fotos con fondo blanco, sin escenarios.' },
      { type: 'text', name: 'ubicacion', label: 'Ubicación preferida', optional: true, placeholder: 'Estudio u otro lugar', helper: 'La sesión familiar se realiza en el estudio. Si prefieres otro lugar, cuéntanos y lo confirmamos.' },
    ],
    recepciones: [
      { type: 'text', name: 'tipo', label: 'Tipo de evento', placeholder: 'Quince años', summary: (v) => `Tipo de evento: ${v}` },
      { row: [
        { type: 'date', name: 'fechaevento', label: 'Fecha del evento', min: TODAY },
        { type: 'text', name: 'duracion', label: 'Duración aproximada', placeholder: 'Ej.: 3 horas', helper: 'La cobertura incluye unas 3 horas.' },
      ] },
      { type: 'text', name: 'lugarevento', label: 'Lugar del evento', placeholder: 'Nombre y dirección del lugar' },
      { type: 'textarea', name: 'requerimientos', label: 'Requerimientos adicionales', optional: true, placeholder: 'Momentos importantes, horarios o cualquier detalle que debamos saber.' },
    ],
    general: [NOTES],
  };

  const allFields = (defs) => defs.flatMap((f) => (f.row ? f.row : [f])).filter((f) => f.name);
  const currentFields = () => allFields(FORMS[(getService() || {}).form] || []);
  const visible = (f) => !f.when || f.when(state.details);

  const helperText = (f) => (typeof f.helper === 'function' ? f.helper() : f.helper || '');

  function fieldMessage(f, id) {
    return `<p class="field-message" id="${id}-msg" aria-live="polite" data-helper="${esc(helperText(f))}">${esc(helperText(f))}</p>`;
  }

  function labelHTML(f, forId) {
    return `<label class="field__label" for="${forId}">${esc(f.label)}${f.optional ? ' <span class="field__optional">(opcional)</span>' : ''}</label>`;
  }

  function fieldHTML(f) {
    const id = `d-${f.name}`;
    const v = state.details[f.name] ?? '';
    const desc = `aria-describedby="${id}-msg"`;
    const req = f.optional ? '' : ' required';
    switch (f.type) {
      case 'stepper': return `<div class="field" data-field="${f.name}">
        ${labelHTML(f, id)}
        <div class="stepper">
          <button class="icon-btn" type="button" data-step-btn="-1" aria-label="Restar ${f.unit === 'bebé' ? 'un bebé' : f.unit === 'año' ? 'un año' : f.unit === 'persona' ? 'una persona' : 'una semana'}" aria-controls="${id}"><img src="assets/icons/minus.svg" alt="" width="24" height="24"></button>
          <input class="stepper__input" id="${id}" name="${f.name}" type="number" inputmode="numeric" min="${f.min}" max="${f.max}" value="${esc(v)}" ${desc}${req}>
          <button class="icon-btn" type="button" data-step-btn="1" aria-label="Sumar ${f.unit === 'bebé' ? 'un bebé' : f.unit === 'año' ? 'un año' : f.unit === 'persona' ? 'una persona' : 'una semana'}" aria-controls="${id}"><img src="assets/icons/plus.svg" alt="" width="24" height="24"></button>
        </div>
        ${fieldMessage(f, id)}
      </div>`;
      case 'date': return `<div class="field" data-field="${f.name}">
        ${labelHTML(f, id)}
        <input class="input input--date" id="${id}" name="${f.name}" type="date" value="${esc(v)}"${f.min ? ` min="${f.min}"` : ''}${f.max ? ` max="${f.max}"` : ''} ${desc}${req}>
        ${fieldMessage(f, id)}
      </div>`;
      case 'text': return `<div class="field" data-field="${f.name}">
        ${labelHTML(f, id)}
        <input class="input" id="${id}" name="${f.name}" type="text" maxlength="120" value="${esc(v)}" placeholder="${esc(f.placeholder || '')}" ${desc}${req}>
        ${fieldMessage(f, id)}
      </div>`;
      case 'computed': return `<div class="field" data-field="${f.name}">
        ${labelHTML(f, id)}
        <output class="input input--readonly" id="${id}" ${desc}>${esc(f.compute(state.details))}</output>
        ${fieldMessage(f, id)}
      </div>`;
      case 'textarea': return `<div class="field field--textarea" data-field="${f.name}">
        ${labelHTML(f, id)}
        <textarea class="textarea" id="${id}" name="${f.name}" maxlength="500" rows="4" placeholder="${esc(f.placeholder || '')}" aria-describedby="${id}-msg ${id}-count">${esc(v)}</textarea>
        <div class="field__footer">
          ${fieldMessage(f, id)}
          <p class="field__counter" id="${id}-count"><span data-count>${String(v).length}</span>/500<span class="visually-hidden"> caracteres</span></p>
        </div>
      </div>`;
      case 'radio': {
        const locked = f.locked ? f.locked() : null;
        return `<fieldset class="radio-group" data-field="${f.name}" aria-describedby="${id}-msg">
          <legend class="radio-group__legend">${esc(f.label)}</legend>
          <div class="radio-group__options">
            ${f.options.map((o, i) => `<label class="radio">
              <input type="radio" name="${f.name}" value="${esc(o)}" id="${id}-${i}"${(locked ? locked === o : v === o) ? ' checked' : ''}${locked && locked !== o ? ' disabled' : ''}${req}>
              <span class="radio-mark" aria-hidden="true"></span><span>${esc(o)}</span>
            </label>`).join('')}
          </div>
          ${fieldMessage(f, id)}
        </fieldset>`;
      }
      case 'notice': return `<div class="notice notice--info">
        <span class="notice__bar" aria-hidden="true"></span>
        <div class="notice__content"><span class="notice__icon"><img src="assets/icons/info-notice.svg" alt="" width="20" height="20"></span>
        <div class="notice__text"><p class="notice__title">${esc(f.title)}</p><p class="notice__body">${esc(f.body)}</p></div></div>
      </div>`;
      case 'gate': return `<div class="notice notice--important" data-field="${f.name}" id="${id}" tabindex="-1" role="alert">
        <span class="notice__bar" aria-hidden="true"></span>
        <div class="notice__content"><span class="notice__icon"><img src="assets/icons/alert.svg" alt="" width="20" height="20"></span>
        <div class="notice__text"><p class="notice__title">${esc(f.title)}</p><p class="notice__body">${esc(f.body)}</p>
        <p class="notice__action">${f.action.step
          ? `<button class="btn btn--secondary" type="button" data-gate-step="${f.action.step}">${esc(f.action.label)}</button>`
          : `<a class="btn btn--secondary" href="${esc(f.action.href)}">${esc(f.action.label)}</a>`}</p></div></div>
      </div>`;
      default: return '';
    }
  }

  // Valores iniciales de los contadores; un borrador o enlace fuera de rango se ajusta al límite
  // (la interfaz y el precio coinciden)
  function clampSteppers(defs = FORMS[(getService() || {}).form] || []) {
    allFields(defs).filter((f) => f.type === 'stepper').forEach((f) => {
      const v = state.details[f.name];
      if (v === undefined || v === '') state.details[f.name] = f.value;
      else if (!Number.isInteger(Number(v)) || Number(v) < f.min || Number(v) > f.max) {
        state.details[f.name] = Math.min(f.max, Math.max(f.min, Math.round(Number(v)) || f.value));
      }
    });
  }

  function renderDetailsForm() {
    const s = getService();
    const key = s ? `${s.slug}|${state.pkg}` : '';
    if (detailsEl.dataset.key === key) { applyVisibility(); return; }
    detailsEl.dataset.key = key;
    const defs = s ? FORMS[s.form] || FORMS.general : [];
    // Valores iniciales (steppers y opción fija por paquete)
    clampSteppers(defs);
    allFields(defs).forEach((f) => {
      if (f.locked) state.details[f.name] = f.locked();
    });
    detailsEl.innerHTML = defs.map((f) => (f.row
      ? `<div class="form-row">${f.row.map(fieldHTML).join('')}</div>`
      : fieldHTML(f))).join('');
    applyVisibility();
  }

  const unborn4 = () => unbornBlocked() && currentFields().some((f) => f.name === 'sinNacer');
  // Bloqueos del paso 4: Newborn sin nacer o fuera de edad, o fecha de nacimiento futura
  const step4Blocked = () => currentFields().some((f) => visible(f)
    && ((f.type === 'gate') || (f.maxError && state.details[f.name] > f.max)));

  // "Continuar" deshabilitado (Figma): paso 4 bloqueado, o paso 3 tras perder el horario sin elegir otro
  function updateNext() {
    const next = $('[data-next]');
    const off = (state.step === 4 && step4Blocked()) || (state.step === 3 && Boolean(state.conflict) && !state.time);
    if (off) next.setAttribute('aria-disabled', 'true');
    else next.removeAttribute('aria-disabled');
  }

  function applyVisibility() {
    currentFields().forEach((f) => {
      const el = detailsEl.querySelector(`[data-field="${f.name}"]`);
      if (!el) return;
      el.hidden = !visible(f);
      if (f.type === 'computed') {
        el.querySelector('output').textContent = f.compute(state.details);
        const msg = el.querySelector('.field-message');
        msg.dataset.helper = helperText(f);
        if (!msg.classList.contains('field-message--error')) msg.textContent = msg.dataset.helper;
      }
    });
    // Avisos informativos condicionados (Newborn: se ocultan con el bebé sin nacer)
    const defs = FORMS[(getService() || {}).form] || [];
    const notices = defs.filter((f) => f.type === 'notice');
    $$('.notice--info', detailsEl).forEach((el, i) => {
      const f = notices[i];
      if (f && f.when) el.hidden = !f.when(state.details);
    });
    // Newborn sin nacer: solo la pregunta y el aviso; sin datos de contacto
    $('.form-group--contact').hidden = unborn4();
    updateNext();
    $$('.form-row', detailsEl).forEach((row) => {
      row.hidden = [...row.children].every((c) => c.hidden);
    });
  }

  function readDetail(target) {
    const { name } = target;
    if (!name) return;
    if (target.type === 'radio') { if (target.checked) state.details[name] = target.value; } else state.details[name] = target.value;
  }

  detailsEl.addEventListener('input', (e) => {
    readDetail(e.target);
    if (e.target.tagName === 'TEXTAREA') {
      const count = e.target.closest('.field').querySelector('[data-count]');
      count.textContent = e.target.value.length;
    }
    applyVisibility();
    if (touched.has(e.target.name)) validateField(e.target.name);
    renderSummaries();
    store.save();
  });
  detailsEl.addEventListener('change', (e) => {
    readDetail(e.target);
    touched.add(e.target.name);
    applyVisibility();
    validateField(e.target.name);
    renderSummaries();
    store.save();
  });
  detailsEl.addEventListener('focusout', (e) => {
    const { name } = e.target;
    if (!name || e.target.type === 'radio') return;
    touched.add(name);
    validateField(name);
  });
  detailsEl.addEventListener('click', (e) => {
    const gateStep = e.target.closest('[data-gate-step]');
    if (gateStep) { goTo(Number(gateStep.dataset.gateStep)); return; }
    const btn = e.target.closest('[data-step-btn]');
    if (!btn) return;
    const input = document.getElementById(btn.getAttribute('aria-controls'));
    const min = Number(input.min); const max = Number(input.max);
    const next = Math.min(max, Math.max(min, (Number(input.value) || 0) + Number(btn.dataset.stepBtn)));
    input.value = next;
    state.details[input.name] = next;
    validateField(input.name);
    renderSummaries();
    store.save();
  });

  /* ---------- Contacto ---------- */
  const nameInput = $('#nombre');
  const phoneInput = $('#whatsapp');
  const codeSelect = $('#codigo-pais');
  const digits = (s) => String(s || '').replace(/\D/g, '').replace(/^0+/, '');
  const formatPhone = (s) => { const d = digits(s); return d.length === 10 ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}` : d; };

  nameInput.addEventListener('input', () => { state.name = nameInput.value; if (touched.has('nombre')) validateField('nombre'); renderSummaries(); store.save(); });
  phoneInput.addEventListener('input', () => { state.phone = phoneInput.value; if (touched.has('whatsapp')) validateField('whatsapp'); renderSummaries(); store.save(); });
  codeSelect.addEventListener('change', () => { state.code = codeSelect.value; renderSummaries(); store.save(); });
  [nameInput, phoneInput].forEach((i) => i.addEventListener('blur', () => { touched.add(i.name); validateField(i.name); }));

  /* ---------- Validación ---------- */
  function setFieldError(el, msgEl, message) {
    const invalid = Boolean(message);
    if (el) {
      if (el.tagName === 'FIELDSET') {
        el.classList.toggle('is-invalid', invalid);
        $$('input', el).forEach((i) => (invalid ? i.setAttribute('aria-invalid', 'true') : i.removeAttribute('aria-invalid')));
      } else if (invalid) el.setAttribute('aria-invalid', 'true');
      else el.removeAttribute('aria-invalid');
    }
    if (!msgEl) return;
    msgEl.classList.toggle('field-message--error', invalid);
    msgEl.textContent = invalid ? message : msgEl.dataset.helper || '';
  }

  // Devuelve el mensaje de error (o '') y lo pinta.
  function validateField(name) {
    if (name === 'nombre') {
      const msg = state.name.trim().length < 2 ? ERR.required : '';
      setFieldError(nameInput, $('#nombre-msg'), msg);
      return msg;
    }
    if (name === 'whatsapp') {
      const d = digits(state.phone);
      const msg = !d ? ERR.required : d.length !== 10 ? ERR.phone : '';
      setFieldError(phoneInput, $('#whatsapp-msg'), msg);
      phoneInput.closest('.input').classList.toggle('is-invalid', Boolean(msg));
      return msg;
    }
    const f = currentFields().find((x) => x.name === name);
    if (!f || f.type === 'computed') return '';
    if (f.type === 'gate') return visible(f) ? f.title : '';
    const id = `d-${f.name}`;
    const wrapper = detailsEl.querySelector(`[data-field="${f.name}"]`);
    const control = f.type === 'radio' ? wrapper : document.getElementById(id);
    const msgEl = document.getElementById(`${id}-msg`);
    let msg = '';
    if (visible(f) && !f.optional) {
      const v = state.details[f.name];
      if (v === undefined || v === null || String(v).trim() === '') msg = ERR.required;
      else if (f.type === 'date' && f.min && v < f.min) msg = ERR.dateFuture;
      else if (f.type === 'date' && f.max && v > f.max) msg = f.maxError || ERR.datePast;
      else if (f.type === 'stepper' && (Number(v) < f.min || Number(v) > f.max)) msg = `Elige un número entre ${f.min} y ${f.max}.`;
    }
    setFieldError(control, msgEl, msg);
    return msg;
  }

  function showError(id, message, control) {
    const el = document.getElementById(id);
    el.textContent = message;
    el.hidden = false;
    if (control) control.setAttribute('aria-invalid', 'true');
  }
  function hideError(id) {
    const el = document.getElementById(id);
    el.hidden = true;
    el.textContent = '';
  }

  const stepValid = {
    1: () => Boolean(getService()),
    2: () => Boolean(getPackage()),
    3: () => Boolean(state.date && state.time && dayStatus(state.date) === 'available' && slotFree(state.date, state.time)),
    4: () => currentFields().every((f) => !validateSilently(f)) && state.name.trim().length >= 2 && digits(state.phone).length === 10,
    5: () => state.consent,
  };

  function validateSilently(f) {
    if (f.type === 'gate') return visible(f);
    if (!visible(f) || f.optional || f.type === 'computed') return false;
    const v = state.details[f.name];
    if (v === undefined || v === null || String(v).trim() === '') return true;
    if (f.type === 'date' && ((f.min && v < f.min) || (f.max && v > f.max))) return true;
    if (f.type === 'stepper' && !(Number.isInteger(Number(v)) && Number(v) >= f.min && Number(v) <= f.max)) return true;
    return false;
  }

  // Valida el paso actual mostrando errores; enfoca el primer error.
  function validateStep(step) {
    let firstInvalid = null;
    if (step === 1 && !stepValid[1]()) {
      showError('error-sesion', ERR.service);
      firstInvalid = servicesEl.querySelector('.service-option:not([hidden]) input');
    }
    if (step === 2 && !stepValid[2]()) {
      showError('error-paquete', ERR.package);
      firstInvalid = packagesEl.querySelector('input');
    }
    if (step === 3) {
      if (!state.date || dayStatus(state.date) !== 'available') {
        showError('error-fecha', ERR.date);
        firstInvalid = calDays.querySelector('[tabindex="0"]');
      } else if (!state.time || !slotFree(state.date, state.time)) {
        showError('error-hora', ERR.time);
        firstInvalid = slotsEl.querySelector('input:not(:disabled)');
      }
    }
    if (step === 4) {
      currentFields().forEach((f) => {
        touched.add(f.name);
        if (validateField(f.name) && !firstInvalid) {
          firstInvalid = f.type === 'radio'
            ? detailsEl.querySelector(`[data-field="${f.name}"] input:not(:disabled)`)
            : document.getElementById(`d-${f.name}`);
        }
      });
      touched.add('nombre'); touched.add('whatsapp');
      if (validateField('nombre') && !firstInvalid) firstInvalid = nameInput;
      if (validateField('whatsapp') && !firstInvalid) firstInvalid = phoneInput;
    }
    if (step === 5 && !state.consent) {
      const msg = $('#acepto-msg');
      msg.textContent = ERR.consent;
      msg.hidden = false;
      consent.setAttribute('aria-invalid', 'true');
      consent.closest('.checkbox').classList.add('is-invalid');
      firstInvalid = consent;
    }
    if (firstInvalid) {
      firstInvalid.focus({ preventScroll: true });
      firstInvalid.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      return false;
    }
    return true;
  }

  // Paso más alto accesible según los datos actuales
  function maxReachable() {
    let s = 1;
    while (s < 5 && stepValid[s]()) s += 1;
    return s;
  }

  /* ---------- Consentimiento ---------- */
  const consent = $('#acepto');
  consent.addEventListener('change', () => {
    state.consent = consent.checked;
    if (consent.checked) {
      $('#acepto-msg').hidden = true;
      consent.removeAttribute('aria-invalid');
      consent.closest('.checkbox').classList.remove('is-invalid');
    }
    store.save();
  });

  /* ---------- Resumen ---------- */
  function detailEntries() {
    return currentFields().filter((f) => visible(f)).map((f) => {
      let v = f.type === 'computed' ? f.compute(state.details) : state.details[f.name];
      if (v === undefined || v === null || String(v).trim() === '') return null;
      if (f.type === 'date') v = shortDate(v);
      return [f.label.replace(/[¿?]/g, ''), String(v).trim()];
    }).filter(Boolean);
  }

  function detailSummary() {
    const lines = currentFields().filter((f) => f.summary && visible(f)).map((f) => {
      const v = f.type === 'computed' ? f.compute(state.details) : state.details[f.name];
      return v === undefined || v === '' ? '' : f.summary(v);
    }).filter(Boolean);
    if (lines.length) return lines;
    const notes = String(state.details.notas || '').trim();
    return [notes ? (notes.length > 40 ? `${notes.slice(0, 40)}…` : notes) : 'Sin comentarios'];
  }

  function summaryHTML({ title = true, notice = true } = {}) {
    const s = getService();
    const p = getPackage();
    const q = getQuote();
    const contactDone = state.step >= 5 || state.step === 'success';
    const contact = contactDone ? [state.name.trim(), `${state.code} ${formatPhone(state.phone)}`] : null;
    const rows = [
      ['Servicio', s ? [s.name] : ['Por elegir']],
      ['Paquete', p ? [p.name] : ['Por elegir']],
      ['Fecha', state.date && state.step !== 1 && state.step !== 2 ? [cap(longDate(state.date))] : ['Por elegir']],
      ['Hora', state.time && state.step !== 1 && state.step !== 2 ? [`${timeLabel(state.time)} (${CFG.timezoneLabel})`] : ['Por elegir']],
      ['Datos de contacto', contact || ['Por completar']],
      ['Detalles', contactDone ? detailSummary() : ['Por completar']],
    ];
    return `${title ? '<h2 class="summary-card__title">Resumen de tu reserva</h2>' : ''}
      <dl class="summary-rows">${rows.map(([k, v]) => `<div class="summary-row"><dt>${k}</dt><dd>${v.map(esc).join('<br>')}</dd></div>`).join('')}</dl>
      <hr class="summary-card__divider">
      <dl class="summary-totals">${q && q.extra ? `
        <div class="summary-row"><dt>${esc(p.name)}</dt><dd>${money(q.base)}</dd></div>
        <div class="summary-row"><dt>${q.extra === 1 ? 'Bebé adicional' : `Bebés adicionales (${q.extra})`}</dt><dd>${money(q.surcharge)}</dd></div>` : ''}
        <div class="summary-row summary-row--total"><dt>Precio total</dt><dd>${q ? money(q.total) : '—'}</dd></div>
        <div class="summary-row summary-row--total"><dt>Abono requerido (50%)</dt><dd>${q ? money(deposit(q.total)) : '—'}</dd></div>
      </dl>
      ${notice ? `<div class="notice notice--important">
        <span class="notice__bar" aria-hidden="true"></span>
        <div class="notice__content"><span class="notice__icon"><img src="assets/icons/alert.svg" alt="" width="20" height="20"></span>
        <div class="notice__text"><p class="notice__title">Abono del 50%</p><p class="notice__body">${esc(T().notice)}</p></div></div>
      </div>` : ''}`;
  }

  function whatsappMessage() {
    const s = getService();
    const p = getPackage();
    if (!s || !p) return '';
    const q = getQuote();
    const dep = money(deposit(q.total));
    // Con bebés adicionales: cantidad, recargo y total en vez de la línea "Cantidad de bebés"
    const priceLines = q.extra
      ? [`Bebés: ${q.babies} (${q.extra === 1 ? 'bebé adicional' : 'bebés adicionales'}: ${money(q.surcharge)})`, `Total: ${money(q.total)} · Abono (50%): ${dep}`]
      : [];
    const details = () => detailEntries().filter(([k]) => !(q.extra && k === 'Cantidad de bebés'));
    const lines = [];
    if (isLive()) {
      // Texto de Figma + referencia real de Cal.com (solo existe después de registrar la solicitud)
      const sent = state.step === 'success' && Boolean(state.booking);
      lines.push(sent ? 'Hola, Ely. Acabo de enviar una solicitud de reserva desde tu página web.' : 'Hola, Ely. Quiero reservar una sesión.');
      if (sent) lines.push(`Referencia: ${state.booking.referencia}`);
      lines.push(`Servicio: ${s.name}`, `Paquete: ${p.name} (${money(p.price)})`, ...priceLines);
      lines.push(`Fecha: ${longDate(state.date)}`, `Hora: ${timeLabel(state.time)} (${CFG.timezoneLabel})`);
      details().forEach(([k, v]) => lines.push(`${k}: ${v}`));
      lines.push(`Nombre: ${state.name.trim()}`, `WhatsApp: ${state.code} ${formatPhone(state.phone)}`);
      if (sent) lines.push(`Quiero coordinar el abono de ${dep} (50%).`);
    } else {
      // Sin backend: el mensaje ES la solicitud; fecha y hora son preferencias por confirmar
      lines.push('Hola, Ely. Quiero reservar una sesión.');
      lines.push(`Servicio: ${s.name}`, `Paquete: ${p.name} (${money(p.price)})`, ...priceLines);
      lines.push(`Fecha preferida: ${longDate(state.date)}`, `Hora preferida: ${timeLabel(state.time)} (${CFG.timezoneLabel})`);
      details().forEach(([k, v]) => lines.push(`${k}: ${v}`));
      lines.push(`Nombre: ${state.name.trim()}`, `WhatsApp: ${state.code} ${formatPhone(state.phone)}`);
      lines.push(`Quiero coordinar el abono de ${dep} (50%).`);
    }
    return lines.join('\n');
  }

  const waUrl = () => `https://wa.me/${CFG.whatsappNumber}?text=${encodeURIComponent(whatsappMessage())}`;

  function previewHTML() {
    return `<p class="wa-preview__header"><img src="assets/icons/whatsapp.svg" alt="" width="20" height="20">Mensaje para WhatsApp</p>
      <div class="wa-preview__box"><p>${esc(whatsappMessage()).replace(/\n/g, '<br>')}</p></div>
      <p class="wa-preview__note">Se abrirá tu WhatsApp con este mensaje listo; tú lo envías.</p>`;
  }

  function renderSummaries() {
    const step = state.step;
    const s = getService();
    $('[data-summary="aside"]').innerHTML = summaryHTML({ notice: step !== 'success' });
    $('[data-summary="bar"]').innerHTML = summaryHTML({ title: false });
    if (step === 5) $('[data-summary="review"]').innerHTML = summaryHTML();
    if (step === 'success') $('[data-summary="success-mobile"]').innerHTML = summaryHTML({ notice: false });
    if (step === 5 || step === 'success') {
      $$('[data-wa-preview]').forEach((el) => { el.innerHTML = previewHTML(); });
      $('[data-whatsapp-link]').href = waUrl();
    }
    // Total en la barra móvil
    let total = '—';
    const q = getQuote();
    if (q) total = money(q.total);
    else if (s && !unbornBlocked()) total = `${s.packages.length > 1 ? 'desde ' : ''}${money(Math.min(...s.packages.map((x) => x.price)))}`;
    $('[data-bar-total]').textContent = total;
    // Textos con el abono
    const dep = q ? money(deposit(q.total)) : 'US$0';
    const copy = T();
    $('[data-copy="after2"]').textContent = copy.after2(dep);
    $('[data-copy="next1"]').textContent = copy.next1(dep);
    $('[data-copy="next2"]').textContent = NEXT2(dep);
    $('[data-status-meta]').textContent = state.booking
      ? `Abono requerido: ${dep} (50% del total) · Referencia: ${state.booking.referencia}`
      : `Abono requerido: ${dep} (50% del total).`;
    // Copias que dependen del modo (puede cambiar con el paquete o el horario)
    $$('[data-copy="submit"]').forEach((el) => { el.textContent = copy.submit; });
    $('[data-copy="after1"]').textContent = copy.after1;
    $('[data-copy="badge"]').textContent = copy.badge;
    $('[data-copy="statusTitle"]').textContent = copy.statusTitle;
    $('[data-copy="statusText"]').textContent = copy.statusText;
  }

  /* ---------- Resumen móvil (barra expandible) ---------- */
  const bar = $('[data-action-bar]');
  const toggle = $('[data-summary-toggle]');
  const panel = $('#resumen-movil');

  function setSummaryOpen(open, { restoreFocus = false } = {}) {
    toggle.setAttribute('aria-expanded', String(open));
    panel.hidden = !open;
    bar.classList.toggle('is-expanded', open); // las acciones se ocultan con el resumen abierto
    if (!open && restoreFocus) toggle.focus();
  }
  toggle.addEventListener('click', () => setSummaryOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') setSummaryOpen(false, { restoreFocus: true });
  });
  document.addEventListener('pointerdown', (e) => {
    if (toggle.getAttribute('aria-expanded') === 'true' && !bar.contains(e.target)) setSummaryOpen(false);
  });
  matchMedia('(min-width: 768px)').addEventListener('change', (e) => { if (e.matches) setSummaryOpen(false); });

  /* ---------- Render por paso ---------- */
  function renderStepChrome() {
    const step = state.step;
    const success = step === 'success';
    form.dataset.step = String(step);
    $$('[data-panel]').forEach((p) => { p.hidden = p.dataset.panel !== String(step); });
    $('[data-step-indicator]').hidden = success;

    if (!success) {
      const info = STEPS[step - 1];
      $('[data-step-number]').textContent = step;
      $('[data-step-name]').textContent = info.name;
      $$('.step-indicator__bar li').forEach((li, i) => {
        li.classList.toggle('is-done', i < step - 1);
        li.classList.toggle('is-current', i === step - 1);
        if (i === step - 1) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
      });
      $('[data-title]').textContent = info.title;
      $('[data-subtitle]').textContent = info.subtitle(getService());
      document.title = `${info.name} · Reservar · Ely Salazar`;
    } else {
      $('[data-title]').textContent = T().successTitle;
      $('[data-subtitle]').textContent = T().successSubtitle;
      document.title = 'Solicitud · Reservar · Ely Salazar';
    }

    // Atrás: botón en la barra (pasos 2–4) o icono junto al título (paso 5)
    $('.action-bar__back').hidden = !(step >= 2 && step <= 4);
    $('.booking__back-icon').hidden = step !== 5;
    $('[data-next]').hidden = !(step >= 1 && step <= 4);
    $('[data-submit]').hidden = step !== 5 || Boolean(state.conflict);
    $('[data-submit-side]').hidden = Boolean(state.conflict);
    bar.hidden = success;
    updateConflict();
    updateNext();
    if (step === 5 || success) setSummaryOpen(false);
  }

  // Horario no disponible (Figma 257:5898): en el paso 5 reemplaza el envío; en el paso 3 va
  // sobre los horarios. Sin estado de éxito, insignia, abono ni enlace a WhatsApp.
  function updateConflict() {
    const on = Boolean(state.conflict);
    $('[data-conflict="review"]').hidden = !(on && state.step === 5);
    $('[data-conflict="slots"]').hidden = !(on && state.step === 3);
    $$('[data-wa-preview="review"]', document).forEach((el) => { el.hidden = on; });
  }

  function renderAll() {
    renderFilters();
    renderServices();
    renderPackages();
    renderCalendar();
    renderSlots();
    renderDetailsForm();
    nameInput.value = state.name;
    phoneInput.value = state.phone;
    codeSelect.value = state.code;
    consent.checked = state.consent;
    renderStepChrome();
    renderSummaries();
  }

  let depth = 0; // pasos apilados en el historial por este flujo

  async function goTo(step, { push = true, focus = true } = {}) {
    let slotLost = false;
    if (typeof step === 'number' && step >= 3) {
      // Desde el paso 3 se necesita la disponibilidad del mes elegido (también tras recargar):
      // decide el modo y descarta horarios que ya no estén libres.
      if (step > 3 && state.date) state.viewMonth = monthKey(state.date);
      if (!state.viewMonth) state.viewMonth = state.date ? monthKey(state.date) : MIN_MONTH;
      // Al entrar al paso 3 se vuelve a pedir el mes: Ely puede haber bloqueado horas en su calendario
      if (step === 3) availabilityCache.delete(cacheKey(state.viewMonth));
      await loadMonth();
      if (state.date && state.time && !slotFree(state.date, state.time)) {
        state.conflict = { date: state.date, time: state.time };
        state.time = null;
        slotLost = true;
      }
      step = Math.min(step, maxReachable());
    }
    state.step = step;
    renderAll();
    if (slotLost && step === 3) $('[data-conflict="slots"]').focus({ preventScroll: true });
    store.save();
    const url = new URL(location.href);
    url.searchParams.set('paso', step === 'success' ? 'listo' : String(step));
    if (push) depth += 1;
    if (push) history.pushState({ step, depth }, '', url); else history.replaceState({ step, depth }, '', url);
    if (focus) {
      const title = $('[data-title]');
      window.scrollTo({ top: 0, behavior: 'auto' });
      title.focus({ preventScroll: true });
    }
  }

  $('[data-next]').addEventListener('click', () => {
    const step = state.step;
    if (!validateStep(step)) return;
    goTo(step + 1);
  });
  // Atrás: usa el historial si el paso anterior está en él; si no (entrada directa), lo reemplaza
  $$('[data-back]').forEach((b) => b.addEventListener('click', () => {
    if (typeof state.step !== 'number' || state.step <= 1) return;
    if (depth > 0) history.back();
    else goTo(state.step - 1, { push: false });
  }));

  // Envío final
  let sending = false;
  // Los botones son type="button": el formulario nunca se envía de forma nativa
  // (evita que los datos personales terminen en la URL si el script no cargó).
  form.addEventListener('submit', (e) => e.preventDefault());
  $$('[data-submit], [data-submit-side]').forEach((b) => b.addEventListener('click', sendRequest));
  $('[data-conflict-pick]').addEventListener('click', () => goTo(3));

  const setSending = (on) => {
    sending = on;
    $$('[data-submit], [data-submit-side]').forEach((b) => (on ? b.setAttribute('aria-disabled', 'true') : b.removeAttribute('aria-disabled')));
    form.setAttribute('aria-busy', String(on));
  };

  async function sendRequest() {
    if (state.step !== 5 || sending) return;
    if (!validateStep(5)) return;
    hideError('error-envio');
    // Modo WhatsApp: no se registra nada; la pantalla final lo dice así
    if (!liveSlotSelected()) {
      state.booking = null;
      await goTo('success');
      store.clear();
      return;
    }
    // Modo live: la solicitud pendiente debe existir en Cal.com ANTES de mostrar éxito o WhatsApp
    setSending(true);
    const result = await submitBooking(buildBookingPayload());
    setSending(false);
    const monthCache = cacheKey(monthKey(state.date));
    if (result.ok) {
      const b = result.booking;
      state.booking = { referencia: b.referencia, uid: b.uid, estado: b.estado };
      availabilityCache.delete(monthCache); // ese horario ya no está libre
      await goTo('success');
      store.clear();
      return;
    }
    if (result.error === 'slot_taken') {
      // Se queda en el paso 5 con el aviso y "Elegir otro horario"; se conservan sesión,
      // paquete, detalles, contacto y consentimiento
      availabilityCache.delete(monthCache);
      state.conflict = { date: state.date, time: state.time };
      state.time = null;
      renderAll();
      store.save();
      $('[data-conflict="review"]').focus({ preventScroll: true });
      $('[data-conflict="review"]').scrollIntoView({ block: 'center' });
      return;
    }
    if (result.error === 'not_reservable') {
      availabilityCache.delete(monthCache);
      state.time = null;
      await goTo(3);
      showError('error-hora', ERR.submit);
      return;
    }
    // 'uncertain' y 'busy': se conserva la referencia; el reintento no duplica la reserva
    const msg = { uncertain: ERR.uncertain, busy: ERR.busy, rate_limited: ERR.rateLimited, price_changed: ERR.priceChanged }[result.error] || ERR.submit;
    showError('error-envio', msg);
    store.save();
  }

  // Evita enviar el formulario con Enter en campos de texto antes del paso 5
  form.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.matches('input:not([type="checkbox"]):not([type="radio"])') && state.step !== 5) {
      e.preventDefault();
      if (typeof state.step === 'number' && state.step < 5) $('[data-next]').click();
    }
  });

  // Historial del navegador (atrás/adelante)
  window.addEventListener('popstate', (e) => {
    depth = (e.state && e.state.depth) || 0;
    let step = e.state && e.state.step;
    if (!step) step = 1;
    if (step === 'success' && state.step !== 'success') step = maxReachable();
    if (typeof step === 'number') step = Math.min(step, maxReachable());
    goTo(step, { push: false });
  });

  /* ---------- Inicio: borrador + parámetros de la URL ---------- */
  function init() {
    const draft = store.load();
    if (draft && typeof draft === 'object') state = { ...blank(), ...draft, details: { ...(draft.details || {}) } };
    if (state.step === 'success') state.step = 1;

    const params = new URLSearchParams(location.search);
    const svcParam = params.get('sesion');
    const pkgParam = params.get('paquete');
    let startStep = null;
    if (svcParam) {
      const s = DATA.SERVICES.find((x) => x.slug === normalize(svcParam));
      if (s) {
        if (state.service !== s.slug) { state.service = s.slug; state.pkg = null; state.details = {}; state.time = null; }
        state.category = 'todas';
        const p = pkgParam ? findPackage(s, pkgParam) : null;
        if (p) state.pkg = p.slug;
        else if (s.packages.length === 1) state.pkg = s.packages[0].slug;
        startStep = state.pkg ? 3 : 2;
      }
    }
    // ?temporada=<slug>: no hay paquetes de temporada en el catálogo (precios por confirmar);
    // se inicia en el paso 1 sin preselección.

    clampSteppers();

    // Fecha guardada ya no válida
    if (state.date && dayStatus(state.date) !== 'available') { state.date = null; state.time = null; }
    if (state.viewMonth && (state.viewMonth < MIN_MONTH || state.viewMonth > MAX_MONTH)) state.viewMonth = null;

    // Los parámetros ya se aplicaron: se quitan para que recargar no deshaga cambios posteriores
    if (svcParam || pkgParam || params.has('temporada')) {
      const clean = new URL(location.href);
      ['sesion', 'paquete', 'temporada'].forEach((k) => clean.searchParams.delete(k));
      history.replaceState(history.state, '', clean);
    }

    const pasoParam = Number(params.get('paso'));
    let step = startStep || (pasoParam >= 1 && pasoParam <= 5 ? pasoParam : state.step) || 1;
    if (typeof step !== 'number') step = 1;
    step = Math.min(step, maxReachable());
    goTo(step, { push: false, focus: false });
  }

  init();
})();
