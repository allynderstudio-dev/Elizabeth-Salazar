// Homepage: carrusel del hero, selector de sesiones y preguntas frecuentes
(() => {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const fadeMs = () => (reduceMotion.matches ? 0 : 300);

  // Cambia contenido con un crossfade corto (instantáneo con reduced motion)
  const crossfade = (elements, update) => {
    const ms = fadeMs();
    if (!ms) return update();
    elements.forEach((el) => el.classList.add('is-fading'));
    setTimeout(() => {
      update();
      elements.forEach((el) => el.classList.remove('is-fading'));
    }, ms / 2);
  };

  /* ---------- 01 Hero carousel ----------
     Copy de Figma: tabla "Slide copy · all 6 slides" (283:3353, 28/10/2026). La línea meta solo
     se ve en desktop. cta: etiqueta propia cuando no sigue "Ver sesión de …" (slide 3). */
  const SLIDES = [
    { key: 'embarazo', service: 'Embarazo', description: 'Retratos de tu embarazo entre la semana 28 y la 32, en el estudio o en exteriores.', meta: '2 a 3 h · desde US$80' },
    { key: 'newborn', service: 'Newborn', description: 'La ternura de los primeros días, con posado clásico entre el día 8 y el 12 de nacido.', meta: '2 a 3 h · desde US$80' },
    { key: 'familiar', service: 'Familiar', description: 'Retratos de familia en el estudio, con fondos y escenografía. Tu mascota también puede acompañarlos.', meta: '2 h · US$80', cta: 'Ver sesión Familiar' },
    { key: 'quince-anos', service: 'Quince años', description: 'Estudio, iglesia, exteriores o la cobertura de tu recepción.', meta: '2 a 3 h · desde US$80' },
    { key: 'parejas', service: 'Parejas', description: 'Una sesión para los dos en el estudio, con retratos que celebran su historia juntos.', meta: '2 h · US$80' },
    { key: 'cumpleanos-infantiles', service: 'Cumpleaños', description: 'Cumpleaños de niñas y niños de 2 a 14 años: en el estudio, con cake smash, temática o en exteriores.', meta: '2 a 3 h · desde US$80' },
  ];

  const hero = document.querySelector('.hero');
  if (hero) {
    const viewport = hero.querySelector('.carousel__viewport');
    const track = hero.querySelector('.carousel__track');
    const slides = [...hero.querySelectorAll('.carousel__slide')];
    const dots = [...hero.querySelectorAll('.carousel-dot')];
    const counter = hero.querySelector('.carousel-controls__counter');
    const info = hero.querySelector('.slide-info');
    const field = (name) => info.querySelector(`[data-slide-field="${name}"]`);
    const total = slides.length;

    // Slider: la pista se desplaza hasta dejar la diapositiva activa a la izquierda.
    // Las copias al final permiten avanzar de la última a la primera sin "rebobinar".
    const clones = slides.map((slide) => {
      const copy = slide.cloneNode(true);
      copy.classList.remove('is-active');
      copy.removeAttribute('aria-roledescription');
      copy.removeAttribute('aria-label');
      copy.setAttribute('aria-hidden', 'true');
      copy.querySelectorAll('img').forEach((img) => { img.loading = 'lazy'; img.removeAttribute('fetchpriority'); });
      track.append(copy);
      return copy;
    });
    const all = [...slides, ...clones];
    const probe = document.createElement('span');
    probe.className = 'carousel__probe';
    probe.setAttribute('aria-hidden', 'true');
    viewport.append(probe);

    let pos = 0; // posición en la pista (0 … 2·total−1); en reposo siempre < total
    let snapTimer = null;
    const pad = (n) => String(n).padStart(2, '0');
    const slideMs = () => (reduceMotion.matches ? 0 : 600);

    // Todas las diapositivas anteriores a la activa tienen el ancho reducido
    const offset = (p) => p * (probe.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 0));

    const place = (p, animate) => {
      pos = p;
      track.classList.toggle('is-instant', !animate);
      all.forEach((slide, i) => slide.classList.toggle('is-active', i === p));
      track.style.transform = `translateX(${-offset(p)}px)`;
      if (!animate) void track.offsetWidth; // aplica el salto sin transición
    };

    const updateInfo = (animate) => {
      const active = pos % total;
      slides.forEach((slide, i) => slide.setAttribute('aria-hidden', String(i !== active)));
      dots.forEach((dot, i) => {
        if (i === active) dot.setAttribute('aria-current', 'true');
        else dot.removeAttribute('aria-current');
      });
      counter.textContent = `${pad(active + 1)} / ${pad(total)}`;
      const data = SLIDES[active];
      const update = () => {
        field('service').textContent = data.service;
        field('description').textContent = data.description;
        field('meta').textContent = data.meta;
        const cta = field('cta');
        cta.href = `/servicio-detalle?sesion=${data.key}`;
        cta.querySelector('span').textContent = data.cta || `Ver sesión de ${data.service}`;
      };
      animate ? crossfade([info], update) : update();
    };

    // Va a la posición p de la pista; si cae en una copia, al terminar salta a la original
    const slideTo = (p) => {
      clearTimeout(snapTimer);
      if (pos >= total) place(pos - total, false); // completa un salto pendiente
      if (p < 0) { place(pos + total, false); p += total; } // de la primera a la última
      place(p, true);
      updateInfo(true);
      if (pos >= total) snapTimer = setTimeout(() => place(pos - total, false), slideMs());
    };

    const current = () => pos % total;
    hero.querySelector('[data-carousel="prev"]').addEventListener('click', () => slideTo(current() - 1));
    hero.querySelector('[data-carousel="next"]').addEventListener('click', () => slideTo(current() + 1));
    dots.forEach((dot, i) => dot.addEventListener('click', () => i !== current() && slideTo(i)));
    // Clic en una diapositiva siguiente (original o copia): avanza hasta ella
    all.forEach((slide, i) => slide.addEventListener('click', () => {
      const ahead = (i - pos + all.length) % all.length;
      if (ahead) slideTo(current() + (ahead % total || total));
    }));

    hero.querySelector('.carousel').addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); slideTo(current() - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); slideTo(current() + 1); }
    });

    // Swipe en táctil
    let startX = null;
    viewport.addEventListener('pointerdown', (e) => { startX = e.clientX; });
    viewport.addEventListener('pointerup', (e) => {
      if (startX === null) return;
      const dx = e.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 40) slideTo(current() + (dx < 0 ? 1 : -1));
    });
    viewport.addEventListener('pointercancel', () => { startX = null; });

    // El ancho de las diapositivas cambia con la ventana: recalcula sin animar
    window.addEventListener('resize', () => place(current(), false));

    place(0, false);
    updateInfo(false);
  }

  /* ---------- 04 Service selector ----------
     Figma define Embarazo (por defecto) y Newborn (estado). El resto toma
     duración, fotos y precio de su categoría (ver README). */
  const SERVICES = {
    embarazo: { title: 'Embarazo', description: 'Entre la semana 28 y la 32 de embarazo, con vestidos, telas y coronas del estudio.', duration: '2 a 3 horas', photos: '6 a 20 fotos digitales', price: 'desde US$80', photo: 'sel-embarazo.jpg', alt: 'Mujer embarazada con sombrero negro sentada sobre un cubo blanco', slug: 'embarazo' },
    newborn: { title: 'Newborn', description: 'Entre el día 8 y el 12 de nacido, con fondos y escenografía del estudio.', duration: '2 a 3 horas', photos: '6 fotos digitales', price: 'desde US$80', photo: 'sel-newborn.jpg', alt: 'Recién nacido en una sesión newborn del estudio', slug: 'newborn' },
    familiar: { title: 'Familiar', description: 'Sesiones familiares y de pareja en estudio, con fondos y escenografía disponibles.', duration: '2 horas', photos: '6 fotos digitales', price: 'US$80', photo: 'sel-familiar.jpg', alt: 'Retrato familiar en el estudio', slug: 'familiar' },
    parejas: { title: 'Parejas', description: 'Sesiones familiares y de pareja en estudio, con fondos y escenografía disponibles.', duration: '2 horas', photos: '6 fotos digitales', price: 'US$80', photo: 'sel-parejas.jpg', alt: 'Sesión de pareja en el estudio', slug: 'parejas' },
    quince: { title: 'Quince años', description: 'Estudio, iglesia, exteriores o la cobertura de tu recepción.', duration: '2 a 3 horas', photos: '6 a 100 fotos digitales', price: 'desde US$80', photo: 'sel-quince.jpg', alt: 'Retrato de quince años en el estudio', slug: 'quince-anos' },
    cumpleanos: { title: 'Cumpleaños', description: 'Cumpleaños infantiles y de adultos, quince años, revelación de sexo y recepciones.', duration: '2 a 3 horas', photos: '6 a 100 fotos digitales', price: 'desde US$70', photo: 'sel-cumple.jpg', alt: 'Sesión de cumpleaños con decoración temática', slug: 'cumpleanos-infantiles' },
  };

  const selector = document.querySelector('[data-selector]');
  if (selector) {
    const tabs = [...selector.querySelectorAll('[role="tab"]')];
    const panel = selector.querySelector('[role="tabpanel"]');
    const photoWrap = selector.querySelector('.selector__photo');
    const f = (name) => selector.querySelector(`[data-selector-field="${name}"]`);

    const select = (tab, focus = false) => {
      if (tab.getAttribute('aria-selected') === 'true') return;
      const data = SERVICES[tab.dataset.key];
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
      });
      panel.setAttribute('aria-labelledby', tab.id);
      if (focus) tab.focus();
      tab.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduceMotion.matches ? 'auto' : 'smooth' });

      crossfade([photoWrap, panel], () => {
        const img = f('photo');
        img.src = `assets/images/${data.photo}`;
        img.alt = data.alt;
        f('title').textContent = data.title;
        f('description').textContent = data.description;
        f('duration').textContent = data.duration;
        f('photos').textContent = data.photos;
        f('price').textContent = data.price;
        f('cta').href = `/servicio-detalle?sesion=${data.slug}`;
      });
    };

    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(tab));
      tab.addEventListener('keydown', (e) => {
        const keys = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 };
        if (!(e.key in keys)) return;
        e.preventDefault();
        select(tabs[(keys[e.key] + tabs.length) % tabs.length], true);
      });
    });
  }

})();
