// Utilidades globales: año dinámico, enlaces de WhatsApp con mensaje, FAQ y aparición al hacer scroll
(() => {
  const WHATSAPP_NUMBER = '584266463929';
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
