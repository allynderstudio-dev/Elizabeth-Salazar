// Navegación: página actual (aria-current) y menú móvil
(() => {
  // Ruta actual como URL limpia (/servicios, / para Inicio; también si se llega por la .html antigua).
  // data-nav en <body> marca la sección actual en páginas de detalle (p. ej. servicio-detalle → /servicios)
  const page = document.body.dataset.nav || location.pathname.replace(/\.html$/, '').replace(/\/index$/, '/');

  document.querySelectorAll('.site-nav .nav-link, .mobile-menu .nav-link, .site-footer .nav-link').forEach((link) => {
    const href = link.getAttribute('href');
    if (href && !href.includes('#') && !href.includes('?') && href === page) {
      link.setAttribute('aria-current', 'page');
    }
  });

  const toggle = document.querySelector('.menu-toggle');
  const menu = document.getElementById('menu-movil');
  if (!toggle || !menu) return;

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    menu.classList.toggle('is-open', open);
    menu.inert = !open;
    document.body.classList.toggle('is-locked', open);
    if (open) menu.querySelector('a')?.focus();
  };

  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));

  menu.addEventListener('click', (e) => {
    if (e.target.closest('a')) setOpen(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) {
      setOpen(false);
      toggle.focus();
    }
  });

  // Si se pasa a desktop con el menú abierto, se cierra
  matchMedia('(min-width: 960px)').addEventListener('change', (e) => {
    if (e.matches) setOpen(false);
  });
})();
