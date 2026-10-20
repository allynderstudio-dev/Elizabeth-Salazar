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
     Copy de Figma: Embarazo (slide 1), Newborn (estado 2) y Quince años (estado 4).
     Familiar, Parejas y Cumpleaños usan el texto de su categoría en "Testigo de tu historia"
     hasta tener el copy definitivo (ver README). */
  const SLIDES = [
    { key: 'embarazo', service: 'Embarazo', description: 'Retratos de tu embarazo entre la semana 28 y la 32, en el estudio o en exteriores.', meta: '2 a 3 h · desde US$70' },
    { key: 'newborn', service: 'Newborn', description: 'La ternura de los primeros días, con posado clásico entre el día 8 y el 12 de nacido.', meta: '2 a 3 h · desde US$70' },
    { key: 'familiar', service: 'Familiar', description: 'Sesiones familiares y de pareja en estudio, con fondos y escenografía disponibles.', meta: '2 h · desde US$70' },
    { key: 'quince-anos', service: 'Quince años', description: 'Estudio, iglesia, exteriores o la cobertura de tu recepción.', meta: '2 a 3 h · desde US$70' },
    { key: 'parejas', service: 'Parejas', description: 'Sesiones familiares y de pareja en estudio, con fondos y escenografía disponibles.', meta: '2 h · desde US$70' },
    { key: 'cumpleanos-infantiles', service: 'Cumpleaños', description: 'Cumpleaños infantiles y de adultos, quince años, revelación de sexo y recepciones.', meta: '2 a 3 h · desde US$70' },
  ];

  const hero = document.querySelector('.hero');
  if (hero) {
    const slides = [...hero.querySelectorAll('.carousel__slide')];
    const dots = [...hero.querySelectorAll('.carousel-dot')];
    const counter = hero.querySelector('.carousel-controls__counter');
    const info = hero.querySelector('.slide-info');
    const field = (name) => info.querySelector(`[data-slide-field="${name}"]`);
    const viewport = hero.querySelector('.carousel__viewport');
    const total = slides.length;
    let active = 0;

    const pad = (n) => String(n).padStart(2, '0');

    const render = (index, animate = true) => {
      active = (index + total) % total;
      slides.forEach((slide, i) => {
        slide.style.order = (i - active + total) % total;
        const isActive = i === active;
        slide.classList.toggle('is-active', isActive);
        slide.setAttribute('aria-hidden', String(!isActive));
        if (isActive && animate) {
          slide.classList.remove('is-entering');
          void slide.offsetWidth;
          slide.classList.add('is-entering');
        }
      });
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
        cta.href = `servicio-detalle.html?sesion=${data.key}`;
        cta.querySelector('span').textContent = `Ver sesión de ${data.service}`;
      };
      animate ? crossfade([info], update) : update();
    };

    hero.querySelector('[data-carousel="prev"]').addEventListener('click', () => render(active - 1));
    hero.querySelector('[data-carousel="next"]').addEventListener('click', () => render(active + 1));
    dots.forEach((dot, i) => dot.addEventListener('click', () => render(i)));
    slides.forEach((slide, i) => slide.addEventListener('click', () => i !== active && render(i)));

    hero.querySelector('.carousel').addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); render(active - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); render(active + 1); }
    });

    // Swipe en táctil
    let startX = null;
    viewport.addEventListener('pointerdown', (e) => { startX = e.clientX; });
    viewport.addEventListener('pointerup', (e) => {
      if (startX === null) return;
      const dx = e.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 40) render(active + (dx < 0 ? 1 : -1));
    });
    viewport.addEventListener('pointercancel', () => { startX = null; });

    render(0, false);
  }

  /* ---------- 04 Service selector ----------
     Figma define Embarazo (por defecto) y Newborn (estado). El resto toma
     duración, fotos y precio de su categoría (ver README). */
  const SERVICES = {
    embarazo: { title: 'Embarazo', description: 'Entre la semana 28 y la 32 de embarazo, con vestidos, telas y coronas del estudio.', duration: '2 a 3 horas', photos: '6 a 20 fotos digitales', price: 'desde US$70', photo: 'sel-embarazo.jpg', alt: 'Mujer embarazada con sombrero negro sentada sobre un cubo blanco', slug: 'embarazo' },
    newborn: { title: 'Newborn', description: 'Entre el día 8 y el 12 de nacido, con fondos y escenografía del estudio.', duration: '2 a 3 horas', photos: '6 fotos digitales', price: 'desde US$70', photo: 'sel-newborn.jpg', alt: 'Recién nacido en una sesión newborn del estudio', slug: 'newborn' },
    familiar: { title: 'Familiar', description: 'Sesiones familiares y de pareja en estudio, con fondos y escenografía disponibles.', duration: '2 horas', photos: '6 fotos digitales', price: 'desde US$70', photo: 'sel-familiar.jpg', alt: 'Retrato familiar en el estudio', slug: 'familiar' },
    parejas: { title: 'Parejas', description: 'Sesiones familiares y de pareja en estudio, con fondos y escenografía disponibles.', duration: '2 horas', photos: '6 fotos digitales', price: 'desde US$70', photo: 'sel-parejas.jpg', alt: 'Sesión de pareja en el estudio', slug: 'parejas' },
    quince: { title: 'Quince años', description: 'Estudio, iglesia, exteriores o la cobertura de tu recepción.', duration: '2 a 3 horas', photos: '6 a 100 fotos digitales', price: 'desde US$70', photo: 'sel-quince.jpg', alt: 'Retrato de quince años en el estudio', slug: 'quince-anos' },
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
        f('cta').href = `servicio-detalle.html?sesion=${data.slug}`;
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
