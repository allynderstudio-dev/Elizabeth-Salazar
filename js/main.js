// Utilidades globales: año dinámico y enlaces de WhatsApp con mensaje
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
})();
