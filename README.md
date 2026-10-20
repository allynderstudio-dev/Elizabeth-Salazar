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
└── assets/  images/ (113 JPG, ≤700 KB c/u) · icons/ (SVG de Figma) · fonts/ (woff2 OFL) · logos/
```

## Ejecutar en local

```bash
python3 -m http.server 8080
```

Abre http://localhost:8080.

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

Sube la carpeta completa a Netlify, Vercel, Cloudflare Pages, GitHub Pages o cualquier servidor Apache/Nginx. No hay paso de build.

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

## Reservas: qué funciona y qué falta

**Hoy no hay backend.** Las notas técnicas de Figma dejan Cal.com → Google Calendar para una fase futura. El flujo funciona completo del lado del cliente, sin inventar nada:
- No muestra horarios como "disponibles": el cliente elige una fecha y hora *preferidas* (lunes a sábado; 8:00, 10:00, 14:00 o 16:00, hora de Venezuela).
- El paso final no dice "Recibimos tu solicitud". Prepara la solicitud y abre WhatsApp (`wa.me/584266463929`) con el resumen completo: servicio, paquete, fecha, hora, detalles, nombre, WhatsApp y abono del 50 %.
- **Textos cambiados respecto a Figma** (solo mientras no hay endpoints): leyenda de horarios, nota de horarios, aviso del abono, punto 1 de "Qué pasa después", botón final ("Preparar solicitud por WhatsApp") y pantalla final ("Tu solicitud está lista", "Pendiente de envío"…). Las políticas no se tocaron.
- **Para conectar Cal.com:**
  1. Configura `availabilityEndpoint` y `bookingEndpoint` en `js/booking-config.js`.
  2. Completa los adaptadores `fetchAvailability()` y `submitBooking()` marcados con `TODO(Cal.com)` en `js/booking.js`. Conviene un proxy en servidor para no exponer la API key.

  Con los endpoints configurados vuelven los textos exactos de Figma. Pendiente de verificar con Cal.com:
  - reserva sin email;
  - expiración a las 24 h (probablemente con un job programado);
  - webhooks.

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
