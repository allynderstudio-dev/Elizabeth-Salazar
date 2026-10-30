// Utilidades globales: año dinámico, enlaces de WhatsApp con mensaje, FAQ y aparición al hacer scroll
(() => {
  const WHATSAPP_NUMBER = '584126463929';
  const WHATSAPP_MESSAGE = 'Hola Ely, quisiera información sobre una sesión de fotos.';

  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = new Date().getFullYear();
  });

  document.querySelectorAll('a[data-whatsapp]').forEach((link) => {
    const message = link.dataset.whatsapp || WHATSAPP_MESSAGE;
    link.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  });

  /* ---------- FAQ (acordeón) ---------- */
  document.querySelectorAll('[data-faq] .faq-item__question').forEach((button) => {
    const answer = document.getElementById(button.getAttribute('aria-controls'));
    button.addEventListener('click', () => {
      const open = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(open));
      answer.hidden = !open;
    });
  });

  /* ---------- Precarga de la foto del hero al apuntar a una sesión ----------
     Al pasar el cursor, enfocar o tocar un enlace a /servicio-detalle?sesion=<slug>,
     se descarga su foto del hero para que la página la tenga en caché al abrirse.
     new Image() en vez de <link rel="prefetch">: Safari no soporta prefetch. */
  const warmed = new Set();
  const warmHero = (e) => {
    const link = e.target.closest && e.target.closest('a[href*="servicio-detalle?"]');
    if (!link) return;
    const slug = new URL(link.href, location.href).searchParams.get('sesion');
    if (!slug || !/^[a-z0-9-]+$/.test(slug) || warmed.has(slug)) return;
    warmed.add(slug);
    const img = new Image();
    img.decoding = 'async';
    img.src = `assets/images/servicio/${slug}/hero.jpg`;
  };
  ['pointerover', 'focusin', 'touchstart'].forEach((type) => document.addEventListener(type, warmHero, { passive: true }));

  /* ---------- Aparición de secciones al hacer scroll ----------
     Solo las secciones que empiezan fuera de la pantalla; la primera nunca se oculta. */
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });

    document.querySelectorAll('main > section:not(:first-child)').forEach((section) => {
      if (section.getBoundingClientRect().top < window.innerHeight) return;
      section.classList.add('reveal');
      observer.observe(section);
    });
  }
})();
