# Ely Salazar — Sitio web

Sitio estático (HTML5 + CSS3 + JavaScript vanilla, sin frameworks ni dependencias) construido desde el diseño en Figma de Ely Salazar Photography. Se puede subir tal cual a cualquier hosting estático.

## Fuente de diseño

Archivo de Figma: `X2LL9TvchE4pZj3QZz1DWT` ("Aldecoa | Website"), página **TEST** (`22:1062`).

El archivo original del handoff (`0RsqVk8C58hD2lcW70eWMd`) no se pudo leer: la cuenta tenía puesto "View" en un plan Starter.

## Páginas

| Archivo | Figma (desktop · mobile) | Qué es |
|---|---|---|
| `index.html` | Homepage (frame ya retirado del archivo) | Inicio |
| `servicios.html` | 27:2866 · 27:2909 (+ estados 27:2947) | Catálogo con filtro por categoría |
| `servicio-detalle.html?sesion=<slug>` | 22 frames "Servicio · …" (+ estados 27:5751) | Una plantilla para las 11 sesiones |
| `temporada.html` | 27:12873 · 27:12906 (+ estado 27:12930) | Temporadas del año |
| `temporada-detalle.html?t=<slug>` | 27:20198 · 27:20254 | Plantilla de temporada (contenido de ejemplo) |
| `galeria.html` | 27:13585 · 27:13637 (+ estados 27:13677) | Galería con filtros y lightbox |
| `sobre-ely.html` | 27:14191 · 27:14256 | Sobre Ely |
| `preguntas-y-politicas.html` | 27:19528 · 27:19620 | Preguntas frecuentes y políticas de reserva |
| `reservar.html` | Pasos 1–5 y "Solicitud enviada" (27:15239…27:15567) | Flujo de reserva en 5 pasos |

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

Abre http://localhost:8080. `python3 -m http.server 8080` sigue sirviendo las páginas, pero sin `/api`.

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
- **Catálogo y precios del flujo de reserva:** están en `js/booking-data.js`.

## Despliegue

Vercel, desde GitHub: cada push a `main` publica el sitio estático y las funciones de `api/`. No hay paso de build. Otros hosts estáticos sirven las páginas, pero sin `/api` las reservas en línea no funcionan (ver "Reservas con Cal.com").

Antes de publicar, cambia las rutas de `og:image` por URLs absolutas del dominio final.

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
```

Cal.com es la **única fuente de verdad**: no hay base de datos. Los datos propios de cada solicitud (referencia, servicio, paquete, precio, abono, WhatsApp, vencimiento, detalles) se guardan en el `metadata` de la reserva de Cal.com. Google Calendar lo sincroniza Cal.com; el backend no escribe en Google.

### Qué hace

- **Disponibilidad real** (`GET /api/availability`): consulta `/v2/slots` del evento del paquete. Solo muestra los horarios que Cal.com devuelve libres, convertidos a hora de Caracas desde el instante UTC. Si Cal.com falla, el sitio no ofrece ningún día y muestra "Reintentar".
- **Solicitud pendiente** (`POST /api/bookings`): valida datos, precio y abono del 50 % en el servidor. Vuelve a comprobar que el horario siga libre, crea la reserva (pendiente de aprobación) **sin correo** y relee el `uid` en Cal.com para verificarlo. Solo entonces el sitio muestra "Recibimos tu solicitud" y el enlace a WhatsApp con la referencia.
- **Sin duplicados**: el navegador genera una referencia por solicitud y la reutiliza en los reintentos. Cal.com no documenta idempotencia, así que antes de crear (y después de un conflicto o de una respuesta perdida) el servidor busca en Cal.com una reserva con esa referencia. El doble clic se bloquea en el navegador y en el servidor. Entre instancias distintas, el bloqueo del horario por la reserva pendiente impide la segunda creación.
- **Paquetes sin evento**: siguen en modo WhatsApp ("horario preferido", "Preparar solicitud por WhatsApp", "Pendiente de envío") y no se registra nada.
- **Abono**: se coordina por WhatsApp o en persona. Cuando Ely recibe el abono, **confirma la reserva en Cal.com**. Ese es el registro del pago; no hay panel aparte.

Estados: el de la reserva lo lleva Cal.com (`pending` → `accepted` / `rejected` / `cancelled`). El del abono no se guarda por separado: confirmar en Cal.com equivale a "abono recibido".

### Archivos

| Archivo | Qué es |
|---|---|
| `api/availability.js` · `api/bookings.js` | Endpoints públicos |
| `api/cron/expire-requests.js` | Tarea programada de vencimiento (protegida con `CRON_SECRET`) |
| `api/_lib/cal-events.js` | **Mapa paquete → evento de Cal.com** (explícito, uno por paquete) |
| `api/_lib/booking-service.js` | Lógica de reservas y vencimiento |
| `api/_lib/cal-client.js` | Cliente de Cal.com v2 (versiones por endpoint) |
| `api/_lib/catalog.js` · `api/_lib/time.js` · `api/_lib/http.js` | Catálogo compartido con el navegador, zonas horarias, utilidades HTTP |
| `js/booking-config.js` · `js/booking-data.js` | Configuración y precios, compartidos con el servidor |
| `vercel.json` | Cron diario |
| `tools/dev-server.js` | Sitio + `/api` en local |
| `tools/set-secret.sh` · `tools/cal-check.js` | Secretos locales y comprobación real de solo lectura |
| `tests/` | Pruebas automatizadas con Cal.com simulado |

### Variables de entorno

| Variable | Obligatoria | Uso |
|---|---|---|
| `CAL_API_KEY` | Sí | Clave de API de Cal.com (`cal_…`). Solo servidor. |
| `CRON_SECRET` | Sí | Protege el cron. Vercel la envía como `Authorization: Bearer …`. Sin ella, el cron rechaza todo. |
| `EXPIRATION_MODE` | No | `off` (por defecto), `dry-run` (solo informa) u `on`. En producción, `on` está **bloqueado** en el código hasta definir la regla de abonos en revisión. |
| `CAL_API_BASE` | No | Por defecto `https://api.cal.com`. |

### Configurar los secretos sin exponerlos

Nunca los pegues en el chat, en el código ni en archivos dentro de esta carpeta: todo lo que hay aquí se publica.

1. **Revoca la clave que se compartió antes** (Cal.com → Settings → Developer → API Keys) y crea una nueva.
2. **Local:** `bash tools/set-secret.sh CAL_API_KEY` pide la clave sin mostrarla y la guarda en `~/.config/ely-reservas/env` (permisos 600, fuera del repo). `bash tools/set-secret.sh CRON_SECRET --generate` crea un secreto aleatorio.
3. **Vercel:** Project → Settings → Environment Variables. Agrega `CAL_API_KEY` y `CRON_SECRET` como **Sensitive**, solo en **Production**. Para el cron puedes generar el valor con `openssl rand -hex 32 | pbcopy` y pegarlo. Si se activan en Preview, las vistas previas también crearían reservas reales.

### Conectar un paquete

1. Crea en Cal.com un evento por paquete (o por grupo de paquetes con la misma duración y reglas), con aprobación manual, teléfono obligatorio y correo oculto.
2. Agrégalo en `api/_lib/cal-events.js`: `'embarazo/estudio': { eventTypeId: 1234567, durationMinutes: 120 }`. Si la duración no coincide con la de Cal.com, la disponibilidad falla a propósito.
3. Ejecuta `npm run cal:check` (solo lectura) y prueba en local con `npm run dev`.

### Desarrollo y pruebas

```bash
npm run dev        # sitio + /api en http://localhost:8080 (lee ~/.config/ely-reservas/env)
npm test           # pruebas automatizadas (Cal.com simulado, sin red)
npm run check      # enlaces + pruebas
npm run cal:check -- --event <id> --duration 120   # Cal.com real, solo lectura
```

`python3 -m http.server` ya no basta para probar reservas: no ejecuta `/api`, y los paquetes con evento mostrarían "No pudimos consultar la disponibilidad".

### Vencimiento a las 24 horas

- Cada solicitud guarda `venceEn` = creación + 24 h en el metadata.
- `api/cron/expire-requests.js` lista las pendientes del sitio y relee el **estado vigente** de cada una. Solo rechaza (`/decline`) las que siguen `pending` y ya vencieron; nunca toca las confirmadas ni las que no creó el sitio. Repetirla es seguro.
- **Está desactivado** (`EXPIRATION_MODE=off`) y en producción no puede activarse hasta decidir qué hacer si el cliente pagó pero Ely aún no revisó el abono (`PAYMENT_REVIEW_RULE` en ese archivo).
- `vercel.json` lo programa **una vez al día** (13:00 UTC, 9:00 en Caracas) porque el plan Hobby no permite más. Con eso una solicitud podría vencer hasta ~48 h después de creada. Para vencer a tiempo hace falta Vercel Pro (por ejemplo `*/15 * * * *`) o un programador externo que llame al endpoint con el `CRON_SECRET`.
- Mientras esté desactivado, los textos del sitio piden el abono en 24 h, pero **no prometen** que el horario se libere automáticamente.

### Webhooks

No se usan. Sin base de datos no hay una copia local que sincronizar: cada consulta lee el estado actual de Cal.com, así que confirmaciones, rechazos, cancelaciones y cambios de fecha hechos en Cal.com se reflejan sin webhook. Si en el futuro se agrega una base de datos, harán falta webhooks firmados (`x-cal-signature-256`, HMAC-SHA256 del cuerpo) y una reconciliación periódica.

### Límites conocidos

- El endpoint de reservas es público y una solicitud pendiente bloquea el horario: alguien podría llenar la agenda con solicitudes falsas. Conviene una regla de límite de peticiones en Vercel Firewall para `/api/bookings`.
- Los detalles del paso 4 se validan en tamaño y tipo, pero no campo por campo.
- Si Ely confirma justo entre la relectura y el rechazo del cron, la carrera es de milisegundos y no se puede descartar del todo: la API de rechazo no ofrece una condición.
- Cal.com no documenta la codificación de la firma de los webhooks (hex o base64) ni un código de error específico para "horario ocupado". El conflicto se reconoce por estado 409, o por 400 con mensaje de horario no disponible.

### Comprobaciones reales pendientes en Cal.com

Las pruebas automatizadas usan un Cal.com simulado. Falta comprobar con la cuenta real:
- [ ] `npm run cal:check` con el evento de prueba: horarios 08/10/14/16, lunes a sábado, duración 120.
- [ ] Crear **una** solicitud de prueba sin correo: que quede `pending`, que bloquee el horario y que se vea en Google Calendar.
- [ ] Que el `metadata` vuelva en `GET /v2/bookings` (en él se basa la protección contra duplicados).
- [ ] Que `attendee.phoneNumber` llene el teléfono obligatorio del evento.
- [ ] Respuesta real de Cal.com ante un horario ocupado (código y mensaje).
- [ ] Solapamiento entre dos eventos distintos del mismo calendario.
- [ ] Confirmar y rechazar desde Cal.com y ver el efecto en el sitio y en Google Calendar.
- [ ] Cron en `dry-run` en producción.

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
- **Inicio:** el texto de 3 diapositivas del hero (Familiar, Parejas, Cumpleaños) y 4 pestañas del selector vienen del texto de su categoría.
- **Detalle de servicio:** solo Embarazo tiene un capítulo 2 en Figma. También son derivados el estado "Sesión no encontrada" y el mensaje de WhatsApp por servicio.
- **Temporada detalle:** Figma solo trae Navidad con datos "por confirmar"; las otras temporadas reutilizan ese contenido. La página lleva `noindex`.
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
