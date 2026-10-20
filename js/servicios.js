// Servicios: filtro por categoría (role="tablist"). El layout se adapta al número de resultados:
// 1 = tarjeta horizontal centrada · 2 = dos columnas 3:2 · 3+ = filas de tres.
(() => {
  const tabs = [...document.querySelectorAll('[data-filter]')];
  const grid = document.getElementById('lista-sesiones');
  if (!tabs.length || !grid) return;

  const cards = [...grid.querySelectorAll('.service-card')];
  const count = document.querySelector('[data-results-count]');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  const apply = (filter) => {
    let visible = 0;
    cards.forEach((card) => {
      const show = filter === 'todas' || card.dataset.category === filter;
      card.hidden = !show;
      card.classList.remove('service-card--horizontal');
      if (show) visible += 1;
    });
    if (visible === 1) cards.find((c) => !c.hidden).classList.add('service-card--horizontal');
    grid.dataset.count = visible >= 3 ? 'many' : String(visible);
    count.textContent = `${visible} ${visible === 1 ? 'sesión' : 'sesiones'}`;
  };

  const select = (tab, { focus = false, updateUrl = true } = {}) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    if (focus) tab.focus();
    const filter = tab.dataset.filter;

    if (reduceMotion.matches) {
      apply(filter);
    } else {
      grid.classList.add('is-filtering');
      setTimeout(() => {
        apply(filter);
        grid.classList.remove('is-filtering');
      }, 150);
    }

    if (updateUrl) {
      const url = new URL(location.href);
      if (filter === 'todas') url.searchParams.delete('categoria');
      else url.searchParams.set('categoria', filter);
      history.replaceState(null, '', url);
    }
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (e) => {
      const keys = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 };
      if (!(e.key in keys)) return;
      e.preventDefault();
      select(tabs[(keys[e.key] + tabs.length) % tabs.length], { focus: true });
    });
  });

  // Preselección desde ?categoria= (enlaces del Homepage y del footer)
  const initial = new URLSearchParams(location.search).get('categoria');
  const initialTab = tabs.find((t) => t.dataset.filter === initial);
  if (initialTab) {
    tabs.forEach((t) => t.setAttribute('aria-selected', String(t === initialTab)));
    initialTab.tabIndex = 0;
    tabs.filter((t) => t !== initialTab).forEach((t) => { t.tabIndex = -1; });
    apply(initial);
  } else {
    grid.dataset.count = 'many';
  }
})();
