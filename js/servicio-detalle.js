// Plantilla de servicio: pinta servicio-detalle.html?sesion=<slug> con los datos de js/services-data.js
// - El HTML trae Embarazo ya pintado (funciona sin JS y para SEO). Para otro slug se reemplaza <main>.
// - Se carga ANTES de main.js: main.js activa después el acordeón [data-faq] y los enlaces [data-whatsapp].
// - Interacciones de Figma (27:5751): texto del storytelling fijo (sticky) que cambia por capítulo en desktop,
//   y barra de reserva fija en mobile que aparece al salir del hero.
// - La sesión se resuelve antes de pintar con el script inline del <head> de servicio-detalle.html
//   (precarga la foto del hero y oculta el Embarazo estático si la URL pide otra sesión).
// Para regenerar el Embarazo estático del HTML tras cambiar datos o plantilla:
//   node -e "global.window={};require('./js/services-data.js');const r=require('./js/servicio-detalle.js');process.stdout.write(r('embarazo',{prerender:true}))"
//   y pega el resultado entre <!-- render:servicio --> y <!-- /render:servicio --> en servicio-detalle.html
//   (tests/servicio-detalle.test.js comprueba que coincidan)
(() => {
  const ICONS = 'assets/icons';
  const WA_HREF = 'https://wa.me/584126463929';

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  const icon = (name, size = 20) => `<img src="${ICONS}/${name}.svg" alt="" width="${size}" height="${size}">`;

  const bookingHref = (slug, pkg) =>
    `reservar.html?sesion=${encodeURIComponent(slug)}${pkg ? `&amp;paquete=${encodeURIComponent(pkg)}` : ''}`;

  // Mensaje de WhatsApp con el nombre de la sesión (derivado del mensaje general del sitio)
  const waMessage = (s) => `Hola Ely, quisiera información sobre la sesión de ${s.name}.`;

  const photoBox = (p, cls, loading = 'lazy') =>
    p
      ? `<div class="photo ${cls}"><img src="${esc(p.src)}" alt="${esc(p.alt)}" loading="${loading}" decoding="async" style="object-position: ${esc(p.pos)}"></div>`
      : // Figma: «Foto pendiente» → bloque cálido vacío hasta tener la foto
        `<div class="photo ${cls} sd-photo-pending" aria-hidden="true"></div>`;

  const actions = (s, C, cls) => `
          <div class="${cls}">
            <a class="btn btn--primary" href="${bookingHref(s.slug)}">${esc(C.bookLabel)}</a>
            <a class="btn btn--text" href="${WA_HREF}" data-whatsapp="${esc(waMessage(s))}" target="_blank" rel="noopener" aria-label="${esc(C.whatsappLabel)}, se abre en otra app">${icon('whatsapp')}<span>${esc(C.whatsappLabel)}</span></a>
          </div>`;

  const featureList = (items, iconName, cls = '') => `
                <ul class="feature-list${cls}">
                  ${items.map((t) => `<li class="feature-item"><span class="feature-item__icon">${icon(iconName)}</span><span>${esc(t)}</span></li>`).join('\n                  ')}
                </ul>`;

  // Foto del hero: aparece con un fundido al cargar (servicio.css). En el HTML estático
  // (prerender) no lleva src: el script inline que la sigue pone la de la sesión de la URL,
  // así nunca se descarga ni se pinta la foto de otra sesión.
  const heroPhoto = (p, prerender) => {
    if (!p) return photoBox(p, 'sd-hero__photo');
    const attrs = `alt="${esc(p.alt)}" loading="eager" decoding="async" style="object-position: ${esc(p.pos)}" onload="this.classList.add('is-loaded')"`;
    if (!prerender) return `<div class="photo sd-hero__photo"><img fetchpriority="high" src="${esc(p.src)}" ${attrs}></div>`;
    return `<div class="photo sd-hero__photo"><img fetchpriority="high" ${attrs}><script>(function (img) { var src = 'SD_HERO' in window ? window.SD_HERO : '${esc(p.src)}'; if (src) img.src = src; })(document.currentScript.previousElementSibling);</script><noscript><img src="${esc(p.src)}" alt="${esc(p.alt)}" style="object-position: ${esc(p.pos)}"></noscript></div>`;
  };

  /* ---------- Secciones ---------- */
  const hero = (s, C, opts = {}) => `
    <!-- 01 Hero -->
    <section class="section sd-hero" id="sd-hero" aria-labelledby="sd-title">
      <div class="container sd-hero__inner">
        <div class="sd-hero__text">
          <div class="sd-hero__copy">
            <div class="sd-hero__titles">
              <div class="lockup">
                <p class="t-eyebrow">${esc(s.hero.eyebrow)}</p>
                <h1 class="t-script lockup__title" id="sd-title">${esc(s.hero.script)}</h1>
              </div>
              <p class="t-h1 sd-hero__headline">${esc(s.hero.headline)}</p>
            </div>
            <p class="t-body-lg sd-hero__body">${esc(s.hero.body)}</p>
          </div>
          <div class="sd-hero__booking">
            <p class="sd-hero__price"><span class="t-price">${esc(s.hero.price)}</span> <span class="t-body-sm"><span class="sd-desktop-only">${esc(C.depositHero)}</span><span class="sd-mobile-only">${esc(C.depositHeroShort)}</span></span></p>${actions(s, C, 'sd-hero__actions')}
          </div>
        </div>
        ${heroPhoto(s.hero.photo, opts.prerender)}
      </div>
    </section>`;

  const experience = (s, C) => `
    <!-- 02 Experience -->
    <section class="section sd-experience" aria-labelledby="sd-experience-title">
      <div class="container sd-experience__inner">
        <div class="sd-experience__heading">
          <p class="t-eyebrow">${esc(C.experienceEyebrow)}</p>
          <h2 class="t-h2 sd-title-m" id="sd-experience-title">${esc(s.experience.title)}</h2>
        </div>
        <div class="sd-experience__body">
          <p class="t-body-lg">${esc(s.experience.body)}</p>
          <div class="sd-experience__details">
            <div class="sd-experience__detail">
              <h3 class="t-eyebrow">${esc(C.forWhoLabel)}</h3>
              <p class="t-body">${esc(s.experience.forWho)}</p>
            </div>
            <div class="sd-experience__detail">
              <h3 class="t-eyebrow">${esc(C.expectLabel)}</h3>
              <p class="t-body">${esc(s.experience.expect)}</p>
            </div>
          </div>
        </div>
      </div>
    </section>`;

  const galleryLink = (s, C) => `
        <div class="sd-story__more">
          <a class="btn btn--text" href="galeria.html?categoria=${encodeURIComponent(s.galleryCategory)}"><span class="sd-desktop-only">${esc(s.galleryDesktop)}</span><span class="sd-mobile-only">${esc(C.galleryMobile)}</span>${icon('arrow-right')}</a>
        </div>`;

  const storyChapters = (s) => {
    const st = s.story;
    const chapters = st.chapters
      .map(
        (ch, i) => `
              <div class="sd-chapter${i === 0 ? ' is-active' : ''}" data-chapter="${i}"${i === 0 ? '' : ' aria-hidden="true"'}>
                <p class="t-eyebrow">${esc(ch.eyebrow)}</p>
                <h2 class="t-h1"${i === 0 ? ' id="sd-story-title"' : ''}>${esc(ch.title)}</h2>
                <p class="t-body-lg">${esc(ch.body)}</p>
              </div>`
      )
      .join('');
    const rows = st.rows
      .map((row) =>
        row.type === 'pair'
          ? `
            <div class="sd-story__pair" data-chapter="${row.chapter}">
              ${row.photos.map((p) => photoBox(p, 'sd-story__portrait')).join('\n              ')}
            </div>`
          : `
            ${photoBox(row.photos[0], 'sd-story__wide').replace('<div class="photo', `<div data-chapter="${row.chapter}" class="photo`)}`
      )
      .join('');
    return `
        <div class="sd-story__layout" data-story>
          <div class="sd-story__text">
            <div class="sd-story__chapters">${chapters}
            </div>
          </div>
          <div class="sd-story__photos">${rows}
          </div>
        </div>`;
  };

  const storySimple = (s) => {
    const st = s.story;
    return `
        <div class="sd-story__heading">
          <div class="sd-story__titles">
            <p class="t-eyebrow">${esc(st.eyebrow)}</p>
            <h2 class="t-h1 sd-title-m" id="sd-story-title">${esc(st.title)}</h2>
          </div>
          <p class="t-body-lg">${esc(st.body)}</p>
        </div>
        <div class="sd-story__row">
          ${st.photos.map((p) => photoBox(p, 'sd-story__landscape')).join('\n          ')}
        </div>`;
  };

  const story = (s, C) => `
    <!-- 03 Storytelling + 04 enlace a la galería -->
    <section class="section sd-story sd-story--${s.story.type}" aria-labelledby="sd-story-title">
      <div class="container sd-story__inner">${s.story.type === 'simple' ? storySimple(s) : storyChapters(s)}${galleryLink(s, C)}
      </div>
    </section>`;

  const packageCard = (s, p, C) => {
    const metaItems = p.meta
      .map(
        (m) => `
                <div class="meta-item">
                  <span class="meta-item__icon">${icon(m.icon)}</span>
                  <div><dt>${esc(m.label)}</dt><dd>${esc(m.value)}</dd></div>
                </div>`
      )
      .join('');
    const groups = [
      ['No incluye', p.excludes, 'minus'],
      ['Costos adicionales', p.extras, 'info'],
      ['A tener en cuenta', p.notes, 'info'],
    ].filter(([, items]) => items.length);
    const id = `sd-pkg-${p.slug}`;
    return `
            <article class="package-card" aria-labelledby="${id}">
              <div class="package-card__header">
                <h3 class="package-card__name" id="${id}">${esc(p.name)}</h3>
                <div class="package-card__price-block">
                  <p class="package-card__price">${esc(p.price)}</p>
                  <p class="t-body-sm">${esc(p.deposit)}</p>
                </div>
              </div>
              <dl class="package-card__meta">${metaItems}
              </dl>${
                p.includes.length
                  ? `
              <div class="package-card__block">
                <p class="t-eyebrow">Qué incluye</p>${featureList(p.includes, 'check')}
              </div>`
                  : ''
              }${
                groups.length
                  ? `
              <div class="package-card__block package-card__conditions">${groups
                .map(
                  ([title, items, ic]) => `
                <div class="package-card__group">
                  <p class="t-eyebrow">${title}</p>${featureList(items, ic, ' package-card__small')}
                </div>`
                )
                .join('')}
              </div>`
                  : ''
              }
              <div class="package-card__spacer"></div>
              <a class="btn btn--secondary package-card__cta" href="${bookingHref(s.slug, p.slug)}" aria-label="${esc(C.packageCta)}: ${esc(p.name)}">${esc(C.packageCta)}</a>
            </article>`;
  };

  const packages = (s, C) => {
    const pk = s.packages;
    const head = pk.items.length > 1 ? C.packagesMany : C.packagesOne;
    return `
    <!-- 05 Paquetes -->
    <section class="section section--warm sd-packages" aria-labelledby="sd-packages-title">
      <div class="container sd-packages__inner">
        <div class="section-heading">
          <div class="section-heading__titles">
            <p class="t-eyebrow">${esc(head.eyebrow)}</p>
            <h2 class="t-h1 section-heading__title" id="sd-packages-title">${esc(head.title)}</h2>
          </div>
          <p class="t-body-lg">${esc(C.pricingNote)}</p>
        </div>
        <div class="sd-packages__grid" data-layout="${pk.layout}">${pk.items.map((p) => packageCard(s, p, C)).join('')}${
          pk.photo ? `\n            ${photoBox(pk.photo, 'sd-packages__photo')}` : ''
        }
        </div>
      </div>
    </section>`;
  };

  // «06 Vestuario y accesorios» (solo Embarazo, Figma 215:9100). Sin fotos hasta que Ely las envíe.
  const wardrobe = (s) =>
    s.wardrobe
      ? `
    <!-- 06 Vestuario y accesorios -->
    <section class="section sd-wardrobe" aria-label="Vestuario y accesorios">
      <div class="container sd-wardrobe__inner">${s.wardrobe
        .map(
          (b, i) => `
        <div class="sd-wardrobe__block">
          <div class="sd-wardrobe__titles">
            <p class="t-eyebrow">${esc(b.eyebrow)}</p>
            <h2 class="t-h2 sd-title-m" id="sd-wardrobe-${i + 1}">${esc(b.title)}</h2>
          </div>
          <p class="sd-badge">${esc(b.badge)}</p>
          <p class="t-body-lg">${esc(b.body)}</p>
          <p class="t-body-sm sd-wardrobe__note">${esc(b.note)}</p>
        </div>`
        )
        .join('')}
      </div>
    </section>`
      : '';

  // Preparación: lista simple, o con etiqueta por ítem (Embarazo: «Recomendaciones para tu sesión»)
  const preparationList = (items) =>
    typeof items[0] === 'string'
      ? featureList(items, 'check')
      : `
                <ul class="feature-list sd-recs">
                  ${items
                    .map(
                      (r) =>
                        `<li class="feature-item"><span class="feature-item__icon">${icon('check')}</span><span class="sd-rec"><span class="sd-rec__label">${esc(r.label)}${r.badge ? ` <span class="sd-badge sd-badge--small">${esc(r.badge)}</span>` : ''}</span><span>${esc(r.text)}</span></span></li>`
                    )
                    .join('\n                  ')}
                </ul>`;

  const checklists = (s, C) => {
    const prepTitle = s.preparationTitle || C.preparationTitle;
    return `
    <!-- 07 Lo que incluye + 08 Preparación -->
    <section class="section sd-checklists" aria-label="${esc(C.includedTitle)} y ${esc(prepTitle.toLowerCase())}">
      <div class="container sd-checklists__inner">
        <div class="sd-checklist">
          <h2 class="sd-checklist__title">${esc(C.includedTitle)}</h2>${featureList(s.included, 'check')}
        </div>
        <div class="sd-checklist">
          <h2 class="sd-checklist__title">${esc(prepTitle)}</h2>${preparationList(s.preparation)}
        </div>
      </div>
    </section>`;
  };

  const faq = (s, C) => `
    <!-- 08 FAQ -->
    <section class="section sd-faq" aria-labelledby="sd-faq-title">
      <div class="container sd-faq__inner">
        <div class="sd-faq__intro">
          <div class="sd-faq__titles">
            <p class="t-eyebrow">${esc(C.faqEyebrow)}</p>
            <h2 class="t-h2 sd-title-m" id="sd-faq-title">${esc(C.faqTitle)}</h2>
          </div>
          <a class="btn btn--text sd-faq__more" href="preguntas-y-politicas.html"><span>${esc(C.faqMore)}</span>${icon('arrow-right')}</a>
        </div>
        <div class="faq-list" data-faq>${s.faq
          .map(
            (f, i) => `
          <div class="faq-item">
            <h3><button class="faq-item__question" type="button" aria-expanded="${i === 0}" aria-controls="sd-faq-${i + 1}" id="sd-faq-${i + 1}-q"><span>${esc(f.q)}</span><img class="icon-plus" src="${ICONS}/plus.svg" alt="" width="20" height="20"><img class="icon-minus" src="${ICONS}/minus.svg" alt="" width="20" height="20"></button></h3>
            <div class="faq-item__answer" id="sd-faq-${i + 1}" role="region" aria-labelledby="sd-faq-${i + 1}-q"${i === 0 ? '' : ' hidden'}><div><p class="t-body">${esc(f.a)}</p></div></div>
          </div>`
          )
          .join('')}
        </div>
      </div>
    </section>`;

  const cta = (s, C) => `
    <!-- 09 Booking CTA -->
    <section class="section section--warm sd-cta" id="sd-cta" aria-labelledby="sd-cta-title">
      <div class="container sd-cta__inner">
        <div class="sd-cta__text">
          <div class="sd-cta__titles">
            <p class="t-eyebrow">${esc(C.ctaEyebrow)}</p>
            <h2 class="t-h1" id="sd-cta-title">${esc(s.name)}</h2>
          </div>
          <p class="t-body-lg">${esc(s.ctaPriceLine)}</p>
          <p class="t-body-sm">${esc(C.schedule)}</p>
        </div>${actions(s, C, 'sd-cta__actions')}
      </div>
    </section>`;

  // Barra de reserva fija (solo mobile, Figma 27:5766). Oculta hasta que el hero sale de la vista.
  const stickyBar = (s, C) => `
    <div class="sd-sticky-bar" data-sticky-bar aria-hidden="true" inert>
      <div class="sd-sticky-bar__summary">
        <p class="t-label-sm">${esc(s.name)}</p>
        <p class="t-price">${esc(s.hero.price)}</p>
      </div>
      <a class="btn btn--primary" href="${bookingHref(s.slug)}">${esc(C.bookLabel)}</a>
    </div>`;

  // opts.prerender: versión para el HTML estático (ver heroPhoto)
  const render = (slug, opts = {}) => {
    const s = window.SERVICES_DATA[slug];
    const C = window.SERVICES_COMMON;
    return [hero, experience, story, packages, wardrobe, checklists, faq, cta, stickyBar].map((fn) => fn(s, C, opts)).join('\n') + '\n  ';
  };

  // Uso desde Node para regenerar el HTML estático
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = render;
    return;
  }

  /* ---------- Navegador ---------- */
  const DATA = window.SERVICES_DATA;
  const main = document.getElementById('contenido');
  if (!DATA || !main) return;

  const param = new URLSearchParams(location.search).get('sesion');
  const slug = param === null ? window.SERVICES_DEFAULT : param;
  const service = DATA[slug];
  // Contenido correcto ya en <main>: se muestra (lo ocultó el script inline del <head>)
  const reveal = () => document.documentElement.classList.remove('sd-swap');

  const setMeta = (title, description) => {
    document.title = title;
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', title);
    if (description) {
      document.querySelector('meta[name="description"]')?.setAttribute('content', description);
      document.querySelector('meta[property="og:description"]')?.setAttribute('content', description);
    }
  };

  if (!service) {
    // Slug desconocido (estado derivado: no existe en Figma)
    main.innerHTML = `
    <section class="section sd-notfound" aria-labelledby="sd-notfound-title">
      <div class="container sd-notfound__inner">
        <div class="section-heading">
          <div class="section-heading__titles">
            <p class="t-eyebrow">Sesiones</p>
            <h1 class="t-h1 section-heading__title" id="sd-notfound-title">Sesión no encontrada</h1>
          </div>
          <p class="t-body-lg">No encontramos la sesión que buscas. Puedes ver todas las sesiones disponibles.</p>
        </div>
        <a class="btn btn--primary" href="servicios.html">Ver todas las sesiones${icon('arrow-right-inverse')}</a>
      </div>
    </section>`;
    setMeta('Sesión no encontrada · Ely Salazar');
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex';
    document.head.appendChild(robots);
    reveal();
    return;
  }

  if (slug !== window.SERVICES_DEFAULT || !main.querySelector('[data-story]')) {
    main.innerHTML = render(slug);
  }
  reveal();
  setMeta(service.documentTitle, service.metaDescription);
  document.querySelector('meta[property="og:image"]')?.setAttribute('content', service.hero.photo.src);

  /* ---------- Storytelling: el texto cambia solo al cruzar un capítulo (desktop/tablet) ---------- */
  const storyEl = main.querySelector('[data-story]');
  const chapterEls = storyEl ? [...storyEl.querySelectorAll('.sd-chapter')] : [];
  if (storyEl && chapterEls.length > 1 && 'IntersectionObserver' in window) {
    let current = 0;
    const setChapter = (i) => {
      if (i === current || !chapterEls[i]) return;
      current = i;
      chapterEls.forEach((el, n) => {
        const active = n === i;
        el.classList.toggle('is-active', active);
        if (active) el.removeAttribute('aria-hidden');
        else el.setAttribute('aria-hidden', 'true');
      });
    };
    // Una fila de fotos "manda" cuando cruza la línea central de la ventana
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setChapter(Number(e.target.dataset.chapter) || 0);
        });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );
    storyEl.querySelectorAll('.sd-story__photos > [data-chapter]').forEach((row) => io.observe(row));
  }

  /* ---------- Barra de reserva fija (mobile) ---------- */
  const bar = main.querySelector('[data-sticky-bar]');
  const heroEl = main.querySelector('#sd-hero');
  const ctaEl = main.querySelector('#sd-cta');
  if (bar && heroEl && 'IntersectionObserver' in window) {
    const mobile = matchMedia('(max-width: 767px)');
    const state = { heroVisible: true, ctaVisible: false, keyboard: false };
    const update = () => {
      const show = mobile.matches && !state.heroVisible && !state.ctaVisible && !state.keyboard;
      bar.classList.toggle('is-visible', show);
      bar.setAttribute('aria-hidden', String(!show));
      bar.inert = !show;
    };
    new IntersectionObserver(([e]) => {
      state.heroVisible = e.isIntersecting;
      update();
    }).observe(heroEl);
    // Derivado: se oculta mientras el bloque "Reserva tu sesión" (mismo CTA) y el footer están a la vista
    if (ctaEl) {
      new IntersectionObserver(([e]) => {
        state.ctaVisible = e.isIntersecting || e.boundingClientRect.top < 0;
        update();
      }).observe(ctaEl);
    }
    // Se oculta con el teclado abierto (la ventana visual se reduce mucho)
    if (window.visualViewport) {
      const onResize = () => {
        state.keyboard = window.visualViewport.height < window.innerHeight * 0.75;
        update();
      };
      window.visualViewport.addEventListener('resize', onResize);
    }
    mobile.addEventListener('change', update);
    update();
  }

})();
