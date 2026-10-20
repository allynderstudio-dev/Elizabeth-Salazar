// Temporada: aplica el estado de cada temporada (Próximamente / Reservas abiertas) desde temporadas-data.js
// Se carga antes de main.js, que convierte data-whatsapp en el enlace final de wa.me.
(() => {
  const datos = window.ELY_TEMPORADAS;
  if (!datos) return;

  datos.TEMPORADAS.forEach((t) => {
    const seccion = document.querySelector(`[data-temporada="${t.slug}"]`);
    const estado = datos.ESTADOS[t.estado] || datos.ESTADOS.proximamente;
    if (!seccion) return;

    seccion.dataset.estado = t.estado;

    const badge = seccion.querySelector('[data-season-badge]');
    if (badge) {
      badge.classList.toggle('season-badge--strong', estado.ctaPrimario);
      badge.querySelector('img').src = estado.icono;
      badge.querySelector('span').textContent = estado.badge;
    }

    const nota = seccion.querySelector('[data-season-note]');
    if (nota) nota.textContent = estado.nota;

    const cta = seccion.querySelector('[data-season-cta]');
    if (cta) {
      cta.classList.toggle('btn--primary', estado.ctaPrimario);
      cta.classList.toggle('btn--secondary', !estado.ctaPrimario);
      cta.querySelector('img').src = estado.ctaPrimario
        ? 'assets/icons/whatsapp-inverse.svg'
        : 'assets/icons/whatsapp.svg';
      cta.querySelector('span').textContent = estado.cta;
      cta.dataset.whatsapp = estado.mensaje(t.nombre);
    }
  });
})();
