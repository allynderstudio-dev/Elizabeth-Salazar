// Galería: filtros por categoría (aria-pressed + ?categoria=), «Ver más fotos» y lightbox accesible
(() => {
  const grid = document.getElementById('galeria-grid');
  if (!grid) return;

  const chips = Array.from(document.querySelectorAll('.galeria-filtros [data-categoria]'));
  const cards = Array.from(grid.querySelectorAll('.galeria-card'));
  const moreWrap = document.querySelector('.galeria-mas');
  const moreBtn = document.querySelector('[data-galeria-mas]');
  const status = document.querySelector('[data-galeria-estado]');
  const validSlugs = chips.map((chip) => chip.dataset.categoria);

  // Una tarjeta es visible si no está oculta por CSS (extras) ni por el filtro
  const isVisible = (card) => !card.hidden && card.getClientRects().length > 0;

  // Botones de cada foto: etiqueta accesible a partir del texto alternativo
  cards.forEach((card) => {
    const img = card.querySelector('img');
    card.querySelector('.galeria-card__media').setAttribute('aria-label', `Ver foto ampliada: ${img.alt}`);
  });

  /* ---------- Filtros ---------- */
  const setFilter = (slug, { updateUrl = true, announce = true } = {}) => {
    if (!validSlugs.includes(slug)) slug = 'todas';
    const all = slug === 'todas';

    chips.forEach((chip) => chip.setAttribute('aria-pressed', String(chip.dataset.categoria === slug)));
    grid.classList.toggle('is-filtrada', !all);
    cards.forEach((card) => {
      const cats = card.dataset.categorias.split(' ');
      card.hidden = !all && !cats.includes(slug);
    });

    // «Ver más fotos» solo tiene sentido con «Todas» y antes de expandir
    moreWrap.hidden = !all || grid.classList.contains('is-expandida');

    if (updateUrl) {
      const url = new URL(location.href);
      if (all) url.searchParams.delete('categoria');
      else url.searchParams.set('categoria', slug);
      history.replaceState(null, '', url);
    }

    if (announce && status) {
      const count = cards.filter(isVisible).length;
      const label = chips.find((chip) => chip.dataset.categoria === slug).textContent.trim();
      status.textContent = all ? `Mostrando todas las fotos (${count})` : `Mostrando ${count} fotos de ${label}`;
    }
  };

  chips.forEach((chip) => {
    chip.addEventListener('click', () => setFilter(chip.dataset.categoria));
  });

  // Preselección por URL: /galeria?categoria=<slug>
  const initial = new URLSearchParams(location.search).get('categoria');
  setFilter(initial || 'todas', { updateUrl: false, announce: false });
  if (initial && validSlugs.includes(initial) && initial !== 'todas') {
    // En móvil, desplaza el chip seleccionado a la vista
    chips.find((chip) => chip.dataset.categoria === initial)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  /* ---------- Ver más fotos ---------- */
  moreBtn?.addEventListener('click', () => {
    const before = new Set(cards.filter(isVisible));
    grid.classList.add('is-expandida');
    moreWrap.hidden = true;
    // Lleva el foco a la primera foto nueva (según el orden visual)
    const added = cards
      .filter((card) => isVisible(card) && !before.has(card))
      .sort((a, b) => (parseFloat(getComputedStyle(a).order) || 0) - (parseFloat(getComputedStyle(b).order) || 0));
    added[0]?.querySelector('.galeria-card__media').focus();
    if (status) status.textContent = `Se agregaron ${added.length} fotos`;
  });

  /* ---------- Lightbox ---------- */
  const lb = document.getElementById('lightbox');
  if (!lb) return;
  const lbImg = lb.querySelector('[data-lb-img]');
  const lbCounter = lb.querySelector('[data-lb-contador]');
  const lbCaption = lb.querySelector('[data-lb-caption]');
  let items = [];
  let index = 0;
  let trigger = null;

  // Fotos visibles en el orden en que se ven (respeta el «order» de CSS en móvil y filtros)
  const visibleItems = () =>
    cards
      .filter(isVisible)
      .map((card, domIndex) => ({ card, domIndex, order: parseFloat(getComputedStyle(card).order) || 0 }))
      .sort((a, b) => a.order - b.order || a.domIndex - b.domIndex)
      .map((entry) => entry.card);

  const data = (card) => {
    const img = card.querySelector('img');
    return {
      src: img.currentSrc || img.src,
      alt: img.alt,
      caption: card.dataset.descripcion || card.querySelector('figcaption').textContent.trim(),
    };
  };

  const preload = (i) => {
    if (items.length < 2) return;
    const next = items[(i + 1) % items.length];
    const img = new Image();
    img.src = data(next).src;
  };

  const render = () => {
    const d = data(items[index]);
    lbImg.src = d.src;
    lbImg.alt = d.alt;
    lbCaption.textContent = d.caption;
    lbCounter.textContent = `${index + 1} / ${items.length}`;
    lb.querySelectorAll('[data-lb="anterior"], [data-lb="siguiente"]').forEach((btn) => {
      btn.hidden = items.length < 2;
    });
    preload(index); // solo la siguiente
  };

  const go = (step) => {
    if (items.length < 2) return;
    index = (index + step + items.length) % items.length;
    render();
  };

  const focusables = () =>
    Array.from(lb.querySelectorAll('button:not([hidden])')).filter((el) => el.getClientRects().length > 0);

  const open = (card) => {
    items = visibleItems();
    index = Math.max(0, items.indexOf(card));
    trigger = card.querySelector('.galeria-card__media');
    render();
    lb.hidden = false;
    document.body.classList.add('is-locked');
    lb.querySelector('[data-lb="cerrar"]').focus();
    document.addEventListener('keydown', onKeydown);
  };

  const close = () => {
    lb.hidden = true;
    document.body.classList.remove('is-locked');
    document.removeEventListener('keydown', onKeydown);
    trigger?.focus();
  };

  function onKeydown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(1);
    } else if (e.key === 'Tab') {
      // Trampa de foco dentro del diálogo
      const els = focusables();
      if (!els.length) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (!lb.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  grid.addEventListener('click', (e) => {
    const media = e.target.closest('.galeria-card__media');
    if (media) open(media.closest('.galeria-card'));
  });

  lb.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-lb]');
    if (!btn) return;
    if (btn.dataset.lb === 'cerrar') close();
    else if (btn.dataset.lb === 'anterior') go(-1);
    else if (btn.dataset.lb === 'siguiente') go(1);
  });

  // Deslizar en táctil: izquierda → siguiente, derecha → anterior
  const stage = lb.querySelector('.lightbox__stage');
  let startX = null;
  let startY = 0;
  stage.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    startX = e.clientX;
    startY = e.clientY;
  });
  stage.addEventListener('pointerup', (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    startX = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
  });
  stage.addEventListener('pointercancel', () => {
    startX = null;
  });
})();
