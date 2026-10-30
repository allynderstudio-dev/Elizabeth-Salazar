# Ely Salazar — Sitio web

Sitio estático (HTML5 + CSS3 + JavaScript vanilla, sin frameworks ni dependencias) construido desde el diseño en Figma de Ely Salazar Photography. Se puede subir tal cual a cualquier hosting estático que sirva URLs limpias (`/servicios` → `servicios.html`).

## Fuente de diseño

Archivo de Figma: `X2LL9TvchE4pZj3QZz1DWT` ("Aldecoa | Website"), página **TEST** (`22:1062`).

El archivo original del handoff (`0RsqVk8C58hD2lcW70eWMd`) no se pudo leer: la cuenta tenía puesto "View" en un plan Starter.

## Páginas

| Archivo · URL | Figma (desktop · mobile) | Qué es |
|---|---|---|
| `index.html` · `/` | Homepage (frame ya retirado del archivo) | Inicio |
| `servicios.html` · `/servicios` | 27:2866 · 27:2909 (+ estados 27:2947) | Catálogo con filtro por categoría |
| `servicio-detalle.html` · `/servicio-detalle?sesion=<slug>` | 22 frames "Servicio · …" (+ estados 27:5751) | Una plantilla para las 11 sesiones |
| `temporada.html` · `/temporada` | 27:12873 · 27:12906 (+ estado 27:12930) | Temporadas del año |
| `temporada-detalle.html` · `/temporada-detalle?t=<slug>` | 27:20198 · 27:20254 | Plantilla de temporada (contenido de ejemplo) |
| `galeria.html` · `/galeria` | 27:13585 · 27:13637 (+ estados 27:13677) | Galería con filtros y lightbox |
| `sobre-ely.html` · `/sobre-ely` | 27:14191 · 27:14256 | Sobre Ely |
| `preguntas-y-politicas.html` · `/preguntas-y-politicas` | 27:19528 · 27:19620 | Preguntas frecuentes y políticas de reserva |
| `reservar.html` · `/reservar` | Pasos 1–5 y "Solicitud enviada" (27:15239…27:15567) | Flujo de reserva en 5 pasos, todos en `/reservar` |

**Slugs de sesión:** `embarazo`, `newborn`, `mes-a-mes`, `cumpleanos-infantiles`, `cumpleanos-adultos`, `quince-anos`, `revelacion-de-sexo`, `recepciones`, `familiar`, `parejas`, `fotografia-profesional-y-comercial`.

## Estructura

```text
├── *.html                  9 páginas
├── partials/               header.html y footer.html (fuente única)
├── tools/
│   ├── build-partials.py   Inserta header/footer en todas las páginas
│   ├── check-links.py      Verifica que todo enlace o recurso local exista
│   └── page-template.html  Plantilla base para páginas nuevas
├── css/
│   ├── fonts.css · variables.css · reset.css · global.css   Base y tokens de Figma
│   ├── components.css      Header, menú móvil, footer, botones, tarjetas, chips, FAQ, CTA…
│   ├── responsive.css      Breakpoints compartidos (≤1279 · ≤1023 · ≤767)
│   └── home.css · servicios.css · servicio.css · temporada.css · galeria.css
│       sobre-ely.css · preguntas.css · reservar.css         Un archivo por página
├── js/
│   ├── navigation.js       Página actual (aria-current) y menú móvil
│   ├── main.js             Año dinámico, enlaces de WhatsApp, acordeón FAQ
│   ├── home.js             Carrusel del hero y selector de sesiones
│   ├── servicios.js        Filtro por categoría
│   ├── services-data.js · servicio-detalle.js      Datos y render de las 11 sesiones
│   ├── temporadas-data.js · temporada.js · temporada-detalle.js
│   ├── gallery.js          Filtros, "Ver más fotos" y lightbox
│   ├── preguntas.js        Navegación lateral (scrollspy)
│   └── booking-config.js · booking-data.js · booking.js    Flujo de reserva
├── api/                    Backend de reservas (Vercel Functions → Cal.com)
├── tests/                  Pruebas del backend (node --test)
└── assets/  images/ (113 JPG, ≤700 KB c/u) · icons/ (SVG de Figma) · fonts/ (woff2 OFL) · logos/
```

## Ejecutar en local

```bash
npm run dev        # sitio + /api (reservas). Requiere Node 20+
```

Abre http://localhost:8080. El servidor imita las URLs limpias de Vercel (`/servicios` sirve `servicios.html` y las `.html` redirigen); `python3 -m http.server` ya no sirve: los enlaces no llevan `.html`.

## Mantenimiento

- **Header o footer:** edita `partials/header.html` o `partials/footer.html` y ejecuta:

```bash
python3 tools/build-partials.py
```

- **Antes de publicar**, verifica que no haya enlaces rotos:

```bash
python3 tools/check-links.py
```

- **Contenido de sesiones:** está en `js/services-data.js`. El de temporadas, en `js/temporadas-data.js` (incluido el estado de cada una: `proximamente` o `abiertas`).
- **Catálogo y precios del flujo de reserva:** están en `js/booking-data.js`. Los precios de las páginas de servicio están en `js/services-data.js` (el «desde» del hero se calcula con el paquete más barato); si cambias un precio, cámbialo en los dos archivos y en las tarjetas de `index.html`, `js/home.js` y `servicios.html`.
- **Newborn:** el precio incluye un bebé y cada bebé adicional suma US$20 (`quote` en `js/booking-data.js`, que usan el navegador y el servidor; máximo 3 hasta que Ely confirme otro). La sesión es para bebés de hasta 3 meses **el día de la sesión**: desde nacimiento + 4 meses de calendario, el paso 4 se bloquea y ofrece Mes a Mes. Con el bebé sin nacer no se puede reservar. El navegador y el servidor aplican la misma regla.

## Despliegue

Vercel, desde GitHub: cada push a `main` publica el sitio estático y las funciones de `api/`. No hay paso de build. Otros hosts estáticos sirven las páginas, pero sin `/api` las reservas en línea no funcionan (ver "Reservas con Cal.com").

Dominio de producción: `https://elysalazarstudio.com` (`www.elysalazarstudio.com` redirige aquí). Las etiquetas `canonical`, `og:url`, `og:image` y `twitter:image`, `sitemap.xml`, `robots.txt` y la canónica que pone `js/servicio-detalle.js` usan URLs absolutas de ese dominio; si cambia, actualízalas todas (y `tools/page-template.html`).

URLs limpias (`vercel.json`: `cleanUrls`, `trailingSlash: false`): las páginas se enlazan como `/`, `/servicios`, `/servicio-detalle?sesion=<slug>`, `/reservar`. Las URLs antiguas con `.html` (o con barra final) redirigen con 308 y conservan la query. Los 5 pasos de la reserva comparten `/reservar`: el paso va en `history.state` y en el borrador de `sessionStorage`, así que atrás/adelante y recargar siguen funcionando; el `?paso=N` de enlaces antiguos se respeta una vez y se quita de la barra. `tools/check-links.py` rechaza enlaces con `.html`, y `tests/urls.test.js` revisa el sitemap y las canónicas: si agregas una página o una sesión, súmala a `sitemap.xml`.

Íconos y vista previa al compartir (exportados del Figma, sección «Brand Assets — Digital»): `favicon.svg` (cambia a crema en modo oscuro), `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png`, `android-chrome-192x192.png`, `android-chrome-512x512.png` y `site.webmanifest` en la raíz; la imagen para redes es `assets/images/og-image.jpg` (1200×630). No los redibujes: si cambian, vuelve a exportarlos desde Figma.

## Matriz de estado

Validación hecha en navegador comparando la altura renderizada con la del frame de Figma.

| Página | Implementación | Comparación visual (1440 · 390) | Responsive | Pruebas funcionales |
|---|---|---|---|---|
| Inicio | ✅ Completa | ✅ Δ0 · Δ0 (todas las secciones) | ✅ 1440/1280/768/390/375 sin overflow | ✅ Menú, carrusel, selector, FAQ, WhatsApp |
| Servicios | ✅ Completa | ✅ Δ0 · Δ0 (y los 5 estados del filtro) | ✅ | ✅ Filtros, `?categoria=`, teclado |
| Detalle de servicio (×11) | ✅ Completa | ✅ Δ0 · Δ≤1 en las 11 sesiones (redondeo de Figma) | ✅ | ✅ Render por slug, enlaces con paquete, FAQ, barra de reserva móvil |
| Temporada | ✅ Completa | ✅ Δ0 · Δ0 | ✅ | ✅ Estados por temporada, anclas, WhatsApp |
| Temporada detalle | ✅ Plantilla | ✅ Sin la franja de anotación de Figma (−44 px) | ✅ | ✅ Render por `?t=` |
| Galería | ✅ Completa | ✅ Δ≤1 · Δ≤1 | ✅ | ✅ Filtros, "Ver más", lightbox (ratón, teclado, swipe) |
| Sobre Ely | ✅ Completa | ✅ Δ0 · Δ0 | ✅ | ✅ |
| Preguntas y Políticas | ✅ Completa | ✅ Δ0 · Δ0 | ✅ | ✅ Acordeones, scrollspy, `#politicas` |
| Reservar | ✅ Flujo completo | ✅ Pasos 1–4 Δ0; paso 5 y final varían por los textos honestos | ✅ | ✅ Flujo de punta a punta, validación, preselección por URL, borrador |

Además se verificó en todas las páginas:
- 0 errores de consola.
- Todas las imágenes cargan y `tools/check-links.py` termina en OK.
- Un solo `h1` por página.
- La página actual queda marcada en el menú.

## Reservas con Cal.com

```text
Navegador ──► /api (Vercel Functions, este repo) ──► Cal.com API v2 ──► Google Calendar
                    │
                    └── Redis (Upstash): bloqueo por fecha + límite de envíos
```

Cal.com es la **única fuente de verdad** de las reservas: no hay base de datos. Los datos propios de cada solicitud (referencia, servicio, paquete, precio, abono, WhatsApp, fecha de creación, detalles) viajan en el `metadata` de la reserva. Google Calendar lo sincroniza Cal.com; el sitio nunca escribe en Google. Redis solo guarda bloqueos de segundos y contadores; ninguna reserva.

### Reglas de negocio (confirmadas el 28/10/2026)

1. El cliente elige servicio, paquete, fecha y hora, y envía la solicitud. Elegir un horario no lo aparta.
2. El servidor comprueba el horario sin carreras entre instancias y crea una reserva **pendiente** en Cal.com. Desde ese momento el bloque de 2 h queda ocupado para **todos** los servicios.
3. Se le pide al cliente el abono del 50 % **dentro de las 24 horas** y lo coordina con Ely por WhatsApp.
4. Unas 24 horas después, **Ely recibe un recordatorio** para revisarla. El recordatorio no cambia nada.
5. Ely verifica el pago y **confirma, rechaza o cancela en Cal.com**. Hasta entonces la solicitud sigue pendiente y el horario sigue apartado, **pase el tiempo que pase**.

- **Nada vence ni se cancela solo.** Las 24 horas son una indicación al cliente más el recordatorio a Ely. Ely libera ella misma las solicitudes abandonadas, rechazándolas o cancelándolas en Cal.com. Si el cliente reportó el pago y Ely aún no lo verificó, puede dejarla pendiente el tiempo que necesite.
- **Solo Ely confirma.** Abrir o enviar WhatsApp no cambia ningún estado. El sitio nunca muestra "Confirmada" ni dice que se recibió un pago.
- **Estados para el cliente:** solo "Pendiente de abono". La consulta por WhatsApp (reserva en línea no disponible) no muestra ningún estado. No existen "Vencida" ni "Pendiente de confirmación".
- **La reserva en línea es real o se dice que no está disponible (BR-18).** El éxito solo aparece con el `uid` verificado de Cal.com. WhatsApp nunca sustituye el registro de una reserva.
- **Bloques fijos de 2 h:** lunes a sábado, 08:00, 10:00, 14:00 y 16:00 (hora de Caracas), de mañana a 6 meses. Todos los paquetes, incluidas las recepciones de unas 3 h, bloquean 120 min. Si una sesión se alarga, Ely bloquea el tiempo extra a mano (ver "Procedimiento de Ely").
- **Newborn solo después del nacimiento:** con "¿Tu bebé ya nació?" = No no se puede reservar (ni precio ni abono). Con "Sí", el bebé debe tener menos de 4 meses de calendario **el día de la sesión** (31/10 + 4 meses = 28/02). El navegador y el servidor aplican la misma regla (`newbornEligibility` en `js/booking-data.js`). Cada bebé adicional suma US$20 (máximo 3 bebés hasta que Ely confirme otro).

### Cómo funciona

- **Disponibilidad** (`GET /api/availability`): consulta `/v2/slots` en cada petición (sin caché, `no-store`) y **además descuenta las reservas activas (pendientes y aceptadas) de cualquier paquete**, así una solicitud pendiente desaparece de inmediato para todos los servicios aunque Cal.com no la descontara (solo está verificado que descuenta las aceptadas). Solo ofrece lo que queda libre, en hora de Caracas. Si Cal.com o la lista de reservas fallan, no ofrece ningún día y muestra "Reintentar". El navegador vuelve a pedir el mes cada vez que se entra al paso 3.
- **Listas de reservas activas:** cada búsqueda pide `GET /v2/bookings` sin filtro de estado **y** con `status=unconfirmed`, y une los resultados. Así no depende de que la lista sin filtro incluya las pendientes (sin verificar contra la API real, T-DB-12).
- **Solicitud** (`POST /api/bookings`): en este orden, campo trampa → límite por IP → **Cloudflare Turnstile** → validación de datos, precio, abono y, en Newborn, nacimiento y edad. Todo eso ocurre **antes** de tomar el bloqueo o llamar a Cal.com. Luego entra en la sección crítica:
  1. bloqueo por **fecha** en Redis (`SET NX` con caducidad de 45 s): dos instancias nunca comprueban y crean a la vez para el mismo día;
  2. ¿ya existe una reserva con esta referencia? (reintentos, también en otra instancia);
  3. ¿hay una reserva **activa** (pendiente o aceptada) de cualquier paquete que se solape? Las rechazadas y canceladas no cuentan;
  4. ¿Cal.com sigue ofreciendo el horario? (es la única comprobación que ve los bloqueos manuales del calendario de Ely);
  5. crear, releer el `uid` y liberar el bloqueo.

  Si el bloqueo no se obtiene en 8 s, o Redis no responde, la respuesta es `503 busy` (reintentable; nunca un falso éxito). Si la creación queda incierta (red caída), el bloqueo se mantiene 5 s más para que Cal.com muestre la reserva si llegó a crearse, y el cliente reintenta con la misma referencia sin duplicar. Si una instancia se cae, el bloqueo caduca solo. El rechazo de Cal.com ante un choque queda como segunda línea de defensa.
- **Horario perdido:** si al enviar el horario ya no está libre, el paso 5 muestra "Horario no disponible" con "Elegir otro horario" (Figma 257:5898). Se conservan sesión, paquete, detalles, contacto y consentimiento. Lo mismo ocurre si el paso 3 detecta que la hora guardada ya no está libre (recarga o pestaña vieja).
- **Abuso** (`api/_lib/rate-limit.js`): máximo 12 envíos por IP cada 10 minutos y 8 solicitudes **nuevas** por IP cada 24 horas. Los reintentos con la misma referencia no cuentan como nuevas. Al superarlo, `429 rate_limited` con `Retry-After`, y el sitio muestra un mensaje amable sin perder los datos. Además hay un campo trampa invisible (`sitio`): si llega lleno, se rechaza. Si Redis falla, el límite no bloquea a nadie (el bloqueo de reservas sigue protegiendo).
- **CAPTCHA** (`api/_lib/captcha.js`, Figma 310:5975): Cloudflare Turnstile en modo **Managed**, solo al tocar "Enviar solicitud de reserva" en el paso 5 (`execution: 'execute'`, `appearance: 'interaction-only'`, `language: 'es'`, tema claro; `normal` en escritorio y `flexible` en móvil). Normalmente no se ve nada: el botón pasa por "Verificando…" y "Enviando solicitud…". Si Cloudflare necesita a la persona, el widget aparece sobre la barra de acciones con el botón deshabilitado y el envío sigue solo al completarlo. Errores: "No pudimos verificar tu solicitud. Inténtalo nuevamente." (`captcha_failed`, o `captcha_unavailable` si Cloudflare no responde: falla cerrado) y "La verificación expiró. Inténtalo nuevamente." (`captcha_expired`: se repite la verificación una vez, sola). Cada intento lleva un token nuevo (son de un solo uso); el servidor comprueba `success`, el host (`TURNSTILE_HOSTNAMES` o, en producción, el dominio público) y la acción `reserva`, con `idempotency_key` y un reintento si Cloudflare no responde. Es una capa **extra**: el campo trampa, el límite, la validación, la idempotencia, el bloqueo y las comprobaciones de Cal.com siguen igual. Una verificación aprobada no es una reserva.
- **Reserva en línea no disponible** (sin evento, sin almacén en producción o sin endpoints): el paso 3 lo avisa **antes de elegir hora** ("Reserva en línea no disponible"). Fecha y hora son preferencias, el botón dice "Preparar consulta por WhatsApp" y la pantalla final es una **consulta** ("Tu consulta está lista para enviar" / "Aún no hay un horario reservado…"), sin insignia de estado, sin "Abono requerido" y sin decir que algo quedó apartado. Nada se registra en Cal.com. Textos provisionales del handoff (DEV-P0-05) hasta que Figma los apruebe (FIG-08).
- **Incidente:** en producción, `reservas_desactivadas` se registra como **error en cada consulta** de disponibilidad, `GET /api/health` lo muestra (`{ modo, reservas, almacen }`, sin secretos ni escrituras) y el correo diario a Ely abre con "Problemas en la página de reservas (avisar a Dylan)", aunque no haya pendientes. El cron también prueba Redis con una clave de salud propia (`…:health`, caduca en 10 s) y avisa si falta `TURNSTILE_SECRET_KEY`.

### Entornos (nunca escribir en el calendario de Ely desde pruebas)

`api/_lib/environment.js` decide el modo al arrancar y lo registra en el log (sin secretos):

| Modo | Cuándo | Qué hace |
|---|---|---|
| `production` | `VERCEL_ENV=production` | Evento real 7652774 con `CAL_API_KEY` |
| `test` | Fuera de producción, con `CAL_TEST_EVENT_TYPE_ID` + `CAL_TEST_API_KEY` de una cuenta **aislada** | Todos los paquetes usan el evento de prueba (120 min) |
| `read-only` | Cualquier otro caso (`npm run dev`, Preview sin cuenta de prueba) | No crea reservas: la disponibilidad responde `reservable: false` y crear se rechaza **antes** de llamar a Cal.com |

- El evento de prueba no puede ser 7652774 ni 7600420: los dos son de la cuenta de Ely (7600420 escribe en su Google Calendar).
- Segunda barrera: el cliente de Cal.com se crea con `allowWrites: false` fuera de producción y de pruebas aisladas.
- Antes de cualquier prueba real que escriba, `npm run cal:check -- --test` muestra a qué cuenta llega la clave (`GET /v2/me`) y qué devuelve el evento, sin crear nada. **Anota aquí la cuenta y el evento comprobados** antes de escribir.

### Variables de entorno

| Variable | Dónde | Uso |
|---|---|---|
| `CAL_API_KEY` | Production | Clave de Cal.com de Ely. Solo servidor. |
| `KV_REST_API_URL` · `KV_REST_API_TOKEN` | Production (y Preview si se prueba) | Redis de Upstash (integración gratuita de Vercel Marketplace; también vale `UPSTASH_REDIS_REST_URL` · `UPSTASH_REDIS_REST_TOKEN`). **Sin ellas, producción no reserva en línea** (modo WhatsApp). |
| `CRON_SECRET` | Production | Protege el cron. Vercel la envía como `Authorization: Bearer …`. |
| `RESEND_API_KEY` · `REMINDER_EMAIL_TO` · `REMINDER_EMAIL_FROM` | Production (opcional) | Correo del recordatorio diario a Ely. Sin ellas, el recordatorio solo queda en el log. |
| `TURNSTILE_SITE_KEY` · `TURNSTILE_SECRET_KEY` | Production (Preview con el par de prueba) | Cloudflare Turnstile, widget en modo **Managed** con los hosts de producción. La secreta es solo servidor; la de sitio es pública y el navegador la recibe con la disponibilidad (no hay que tocar el código). Hacen falta **las dos**: sin ellas no se exige verificación y en producción se registra como incidente. Tras añadirlas, Redeploy. |
| `TURNSTILE_HOSTNAMES` | Opcional | Hosts aceptados en la verificación, separados por comas. Por defecto en producción: `elysalazarstudio.com` y `www.elysalazarstudio.com`. |
| `CAL_TEST_EVENT_TYPE_ID` · `CAL_TEST_API_KEY` | Preview / local | Cuenta de Cal.com de prueba aislada |
| `CAL_API_BASE` | Opcional | Por defecto `https://api.cal.com` |

Secretos sin exponerlos: nunca en el chat, en el código ni en esta carpeta. En local, `bash tools/set-secret.sh NOMBRE` pide el valor sin mostrarlo y lo guarda en `~/.config/ely-reservas/env` (permisos 600). En Vercel, Settings → Environment Variables, como **Sensitive**. `CAL_API_KEY` va solo en **Production**.

### Recordatorio de 24 horas para Ely

Solo para Ely, nunca para el cliente, y nunca cambia una reserva. Opciones, en orden de preferencia:

1. **Workflow de Cal.com** (solo configuración). Pendiente de comprobar en una cuenta de prueba (T-RM-01 a T-RM-06): la documentación no aclara si se dispara con reservas creadas por la API, si el paso de espera necesita un plan de pago ni si se salta las reservas ya resueltas. Ajustes para Dylan o Ely, **después** de esa comprobación:
   - Cal.com → Workflows → New. Disparador: **When booking is requested**. Evento: **Website** (7652774).
   - Paso: **Delay** → Wait for **24 hours**.
   - Acción: **Send email to host** (o a la dirección de Ely). Nunca acciones al asistente, ni SMS ni WhatsApp (cuestan créditos y llegarían al cliente).
   - En el plan gratuito el texto del correo es el predeterminado y no se puede editar.
2. **Tarea diaria de solo lectura** (ya construida: `api/cron/review-reminder.js`, 13:00 UTC = 9:00 en Caracas). Lista las solicitudes del sitio que siguen pendientes 24 h o más y manda a Ely **un** correo con el resumen (Resend, plan gratuito). No tiene ninguna llamada que confirme, rechace o cancele. En el plan Hobby corre una vez al día, así que el aviso llega entre 24 y 48 h después de la solicitud. **Necesita** `RESEND_API_KEY` y `REMINDER_EMAIL_TO`; sin ellas solo escribe el resumen en el log.
3. **Revisión manual diaria** (siempre vale como respaldo, sin costo): Ely abre Cal.com → Bookings → **Unconfirmed** una vez al día y revisa las que tienen más de 24 horas.

### Procedimiento de Ely (operación diaria)

- **Revisar solicitudes:** Cal.com → Bookings → Unconfirmed. Si recibiste el abono, **Confirmar**. Si la solicitud quedó abandonada, **Rechazar** o **Cancelar**: el horario vuelve a estar disponible en la página. Si el cliente dice que pagó y aún no lo verificas, déjala pendiente.
- **Bloquear tiempo extra** (por ejemplo, una recepción de 14:00 que termina a las 17:00): crea un evento en tu **Google Calendar conectado** de 16:00 a 17:00, marcado como **Ocupado**. Cal.com deja de ofrecer el bloque de 16:00 a 18:00 y la página lo refleja en la siguiente consulta. Para liberarlo, borra ese evento.
- **Si un cliente ya tenía ese bloque:** contáctalo y **reprograma, rechaza o cancela su reserva en Cal.com**.
- **Cambios de reservas siempre en Cal.com.** Mover o borrar en Google Calendar la copia de una reserva de Cal.com **no** cambia la reserva.

### Archivos

| Archivo | Qué es |
|---|---|
| `api/availability.js` · `api/bookings.js` · `api/health.js` | Endpoints públicos (`health`: modo y almacén, sin secretos) |
| `api/_lib/captcha.js` | Verificación de Cloudflare Turnstile en el servidor |
| `api/cron/review-reminder.js` · `api/_lib/reminder.js` | Recordatorio diario para Ely (solo lectura, protegido con `CRON_SECRET`) |
| `api/_lib/booking-service.js` | Validación, sección crítica, creación y lista para el recordatorio |
| `api/_lib/environment.js` | Modo production / test / read-only |
| `api/_lib/store.js` · `api/_lib/rate-limit.js` | Redis (o memoria en local), bloqueo y límite de envíos |
| `api/_lib/cal-events.js` | Mapa paquete → evento de Cal.com (todos a 7652774, 120 min) |
| `api/_lib/cal-client.js` | Cliente de Cal.com v2: horarios, crear, leer, listar, `GET /v2/me`. Sin rechazar ni cancelar. |
| `js/booking-config.js` · `js/booking-data.js` | Configuración, precios y reglas de Newborn, compartidos con el servidor |
| `vercel.json` | Cron diario del recordatorio |
| `tools/dev-server.js` · `tools/cal-check.js` · `tools/set-secret.sh` | Sitio + `/api` en local, comprobación real de solo lectura, secretos locales |
| `tests/` | Pruebas automatizadas con Cal.com simulado |

### Desarrollo y pruebas

```bash
npm run dev        # sitio + /api en http://localhost:8080 (modo read-only salvo cuenta de prueba)
npm test           # pruebas automatizadas (Cal.com simulado, sin red)
npm run check      # enlaces + pruebas
npm run cal:check -- --test   # cuenta de prueba aislada: solo lectura
npm run live:check            # sitio publicado: /api/health y ¿cada paquete reserva en línea? (solo GET, T-DB-14)
```

**Modo WhatsApp en producción = el sitio no aparta horarios (incidente).** Si `live:check` muestra `reservas_desactivadas`, el servidor no ve el almacén compartido (`KV_REST_API_URL` / `KV_REST_API_TOKEN`): las solicitudes no se registran en Cal.com y el mismo horario sigue ofreciéndose a todos los servicios. El cliente ve "Reserva en línea no disponible" desde el paso 3. Causa habitual: las variables se añadieron **después** del último despliegue; Vercel solo las aplica a despliegues nuevos, así que hace falta **Redeploy** de producción.

Turnstile en local: `TURNSTILE_SITE_KEY=1x00000000000000000000AA` (siempre pasa; `3x00000000000000000000FF` pide interacción) y `TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA` en el entorno del servidor, o solo `turnstileSiteKey` en `js/booking-config.js` para probar el widget. Nunca las claves reales en pruebas.

El Cal.com simulado (`tests/helpers/fake-cal.js`) puede **no** hacer cumplir los choques (`enforce: false`). Así `tests/concurrency.test.js` prueba que lo que evita duplicados es el sitio: sin el bloqueo, la misma prueba crea dos reservas.

### Webhooks

No se usan. Sin base de datos no hay copia local que sincronizar: cada consulta lee el estado actual de Cal.com.

### Comprobaciones reales en Cal.com

Hechas con la cuenta real (evento 7600420, 22/10/2026, antes de las reglas actuales):
- [x] `/v2/slots`: lunes a sábado; 08, 10, 14 y 16 h; 120 min.
- [x] Solicitud sin correo: queda `pending`, bloquea el horario y se ve en Google Calendar. Cal.com genera un correo interno `…@sms.cal.com`.
- [x] `attendee.phoneNumber` llena el teléfono del evento; el `metadata` se guarda y vuelve.
- [x] Confirmar en Cal.com: pasa a aceptada y queda en Google Calendar.

Lectura del 28/10/2026 (sin crear nada): las dos reservas de prueba del 28/11 (14:00 y 16:00, "PRUEBA WEB – rechazar") están **aceptadas** en el evento 7652774 y `/v2/slots` ya no ofrece esas horas: Cal.com descuenta las **aceptadas**. Que descuente las **pendientes** de 7652774 solo se comprobó con el evento antiguo 7600420.

Reproducción de Dylan (28/10/2026: tras enviar, otro servicio seguía ofreciendo la misma hora): desde el despliegue de `6138ad5`, producción responde `reservable: false` en los 23 paquetes (modo WhatsApp, nada se registra), lo que produce exactamente ese síntoma. No se sabe si la prueba fue antes o después de ese despliegue, ni qué pantalla final vio ("Pendiente de envío" = modo WhatsApp).

Pendientes, **solo en una cuenta de prueba aislada** (no hay credenciales todavía):
- [ ] T-DB-13: solicitud del servicio A con `uid` verificado; el servicio B ya no ve la hora (página nueva y misma pestaña); un POST directo del servicio B responde `409 slot_taken`; una sola reserva activa. Repetir con dos servicios a la vez. (Simulado: `tests/concurrency.test.js`.)
- [ ] T-DB-14: `npm run live:check` con todos los paquetes "en línea", después de configurar Redis en producción.
- [ ] Rechazar y cancelar liberan el horario; aceptar lo mantiene; una pendiente bloquea otro servicio (T-LC-04 a T-LC-07).
- [ ] Creaciones en paralelo, solape con pendiente y con aceptada, y la respuesta real de Cal.com ante un choque (T-DB-12). Actualizar `CONFLICT_PATTERN` si hace falta.
- [ ] `GET /v2/bookings` sin filtro de estado devuelve también las pendientes. Ya no es imprescindible: el sitio pide también `status=unconfirmed` y une las dos listas.
- [ ] Bloqueo manual en Google Calendar → desaparece de `/v2/slots`, y el retraso entre el cambio y Cal.com (T-SY-01 a T-SY-08).
- [ ] Workflow "When booking is requested" + espera de 24 h con una reserva creada por la API (T-RM-01 a T-RM-06).
- [ ] Qué calendario revisa el evento 7652774 para detectar conflictos (Advanced → "Checking for conflicts") en la cuenta de Ely.

Ojo: `GET /v2/bookings/{uid}` responde sin autenticación, así que quien conozca la referencia puede leer nombre y teléfono de esa reserva. La referencia solo se muestra al cliente y viaja a Ely por WhatsApp.

## Pendientes y decisiones a revisar

### Fotos faltantes (placeholder vacío en Figma)
- Retrato de Ely (Inicio y Sobre Ely), foto del estudio y "detrás de cámaras" (Sobre Ely).
- Todas las fotos de Temporada (hero y ejemplos de la plantilla).
- Segunda foto de Revelación de sexo, Recepciones y Parejas en su detalle.

### Fotos de baja resolución o con defectos (pedir originales)
- Figma indica que las fotos son recortes de catálogo y deben reemplazarse por originales de 3000 px o más, sin marca de agua.
- Se ven especialmente pequeñas: qu-red, rc-garden (con franja blanca), quince-family, emb-bathroom (Galería) y varias fotos de capítulo en los detalles de servicio.
- La foto de historia de Recepciones trae un margen blanco y una barra marrón incrustados.

### Contenido derivado (no viene literal de Figma)
- **Inicio:** 4 pestañas del selector de sesiones vienen del texto de su categoría. El hero sigue la tabla de Figma 283:3353.
- **Detalle de servicio:** solo Embarazo tiene un capítulo 2 en Figma. También son derivados el estado "Sesión no encontrada" y el mensaje de WhatsApp por servicio.
- **Temporada detalle:** no se publica (`.vercelignore`): no hay páginas individuales de temporada. El archivo queda como plantilla.
- **Galería:** la categoría de algunas fotos y el orden en móvil tras "Ver más fotos".
- **Reservar:** mensajes de error, campos de los servicios sin formulario propio en Figma y límites de los contadores.
- **En todas las páginas:** textos alternativos, títulos de pestaña y diseño de tablet (768–1023). El menú móvil abierto y los estados hover se derivaron del sistema de diseño.

### Contradicciones o descuidos en Figma
- **Chips de filtro en móvil:** el frame y el componente piden una fila con scroll horizontal, pero una nota pide que salten de línea. Se siguió el frame.
- **Hero móvil de la plantilla de temporada:** no tiene separación entre elementos (botones pegados). Se copió tal cual.
- **Lightbox de Galería:** muestra la foto completa, no recortada a 2:3 como en Figma.

### Limpieza futura
- `.notice` y `.checklist` existen por separado en `temporada.css`, `preguntas.css` y `reservar.css`. Funcionan igual, pero convendría unificarlos en `components.css`.
- No hay `animations.js`: las transiciones son CSS y respetan `prefers-reduced-motion`.
