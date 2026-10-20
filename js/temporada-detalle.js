// Plantilla de temporada: rellena la página según ?t=<slug> con los datos de temporadas-data.js
// Se carga antes de main.js, que convierte data-whatsapp en el enlace final de wa.me.
(() => {
  const datos = window.ELY_TEMPORADAS;
  if (!datos) return;

  const slug = new URLSearchParams(location.search).get('t');
  const temporada =
    datos.TEMPORADAS.find((t) => t.slug === slug) ||
    datos.TEMPORADAS.find((t) => t.slug === datos.PREDETERMINADA);
  if (!temporada) return;

  // Contenido = plantilla + lo propio de la temporada (si existe)
  const contenido = {
    ...datos.PLANTILLA,
    ...(temporada.detalle || {}),
    paquete: { ...datos.PLANTILLA.paquete, ...((temporada.detalle && temporada.detalle.paquete) || {}) },
    nombre: temporada.nombre,
  };
  const leer = (ruta) => ruta.split('.').reduce((obj, clave) => (obj ? obj[clave] : undefined), contenido);

  // Textos
  document.querySelectorAll('[data-field]').forEach((el) => {
    const valor = leer(el.dataset.field);
    if (typeof valor === 'string') el.textContent = valor;
  });

  // Listas: se clona el primer elemento como molde
  document.querySelectorAll('[data-list]').forEach((lista) => {
    const items = leer(lista.dataset.list);
    const molde = lista.firstElementChild;
    if (!Array.isArray(items) || !molde) return;
    lista.replaceChildren(
      ...items.map((texto) => {
        const li = molde.cloneNode(true);
        li.querySelector('span:last-child').textContent = texto;
        return li;
      })
    );
  });

  // Fotos: si hay ruta, reemplaza el espacio pendiente por la imagen
  const fotos = contenido.fotos || [];
  const ponerFoto = (contenedor, ruta, alt) => {
    if (!contenedor || !ruta) return;
    const img = document.createElement('img');
    img.src = ruta;
    img.alt = alt;
    img.loading = 'lazy';
    contenedor.replaceChildren(img);
  };
  ponerFoto(document.querySelector('[data-photo="hero"]'), contenido.fotoHero, `Sesión de ${temporada.nombre}`);
  document.querySelectorAll('.tdet-card[data-photo]').forEach((card, i) => {
    ponerFoto(card.querySelector('.photo-pending'), fotos[i], `Sesión de ${temporada.nombre}`);
  });

  // Enlaces de reserva y WhatsApp
  document.querySelectorAll('[data-link="reservar"]').forEach((a) => {
    a.href = `reservar.html?temporada=${encodeURIComponent(temporada.slug)}`;
  });
  const estado = datos.ESTADOS[temporada.estado] || datos.ESTADOS.proximamente;
  document.querySelectorAll('a[data-whatsapp]').forEach((a) => {
    if (!a.closest('main')) return;
    a.dataset.whatsapp = estado.mensaje(temporada.nombre);
  });

  document.title = `${temporada.nombre} · Sesiones de temporada · Ely Salazar`;
})();
