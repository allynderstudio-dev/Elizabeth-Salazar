// Catálogo para el flujo de reserva.
// Fuentes Figma: Reservar · Paso 1 (servicios, "desde US$…", nº de paquetes),
// Reservar · Paso 2 (paquetes de Embarazo con su línea de detalle) y las secciones
// "05 Packages" de cada Servicio · Desktop (nombres, precios, duración, fotos, lugar).
// La línea "details" de los paquetes que no son de Embarazo se arma con
// Duración · Fotos de su tarjeta (derivado; Figma solo muestra Embarazo en el paso 2).
(() => {
  const NOTICE_EXTERIORES = {
    title: 'Sesiones en exteriores',
    body: 'Pueden tener un recargo de US$30 por traslado, según la locación.',
  };

  const CATEGORIES = [
    { slug: 'todas', label: 'Todas las categorías' },
    { slug: 'embarazo-y-bebe', label: 'Embarazo y bebé' },
    { slug: 'cumpleanos-y-celebraciones', label: 'Cumpleaños y celebraciones' },
    { slug: 'familia-y-pareja', label: 'Familia y pareja' },
    { slug: 'marca-y-productos', label: 'Marca y productos' },
  ];

  // form: id del formulario del paso 4 (Figma: Conditional detail forms + Paso 4 Embarazo).
  // Los servicios sin formulario propio en Figma usan 'general' (solo "Cuéntanos un poco más").
  const SERVICES = [
    {
      slug: 'embarazo', name: 'Embarazo', category: 'embarazo-y-bebe', form: 'embarazo',
      phrase: 'tu sesión de embarazo', notice: NOTICE_EXTERIORES,
      packages: [
        { slug: 'estudio', name: 'Estudio', price: 70, place: 'estudio', details: '2 h · 6 fotos digitales · 2 cambios de vestuario' },
        { slug: 'bathroom', name: 'Bathroom', price: 90, place: 'estudio', details: '2 h · 6 fotos digitales · bañera y set del estudio' },
        { slug: 'exteriores', name: 'Exteriores', price: 140, place: 'exteriores', details: '2 a 3 h · 20 fotos digitales' },
      ],
    },
    {
      slug: 'newborn', name: 'Newborn', category: 'embarazo-y-bebe', form: 'newborn',
      phrase: 'tu sesión newborn',
      packages: [
        { slug: 'sesion-newborn', name: 'Sesión Newborn', price: 70, place: 'estudio', details: '2 h · 6 fotos digitales' },
        { slug: 'sesion-retrato', name: 'Sesión + Retrato', price: 120, place: 'estudio', details: '2 a 3 h · 6 fotos digitales' },
      ],
    },
    {
      slug: 'mes-a-mes', name: 'Mes a Mes', category: 'embarazo-y-bebe', form: 'general',
      phrase: 'tu sesión mes a mes',
      packages: [
        { slug: 'sesion-mes-a-mes', name: 'Sesión Mes a Mes', price: 50, place: 'estudio', details: '2 h · 6 fotos digitales' },
        { slug: 'bathroom', name: 'Bathroom', price: 60, place: 'estudio', details: '2 h · 6 fotos digitales' },
      ],
    },
    {
      slug: 'cumpleanos-infantiles', name: 'Cumpleaños infantiles', category: 'cumpleanos-y-celebraciones', form: 'cumpleanos-infantiles',
      phrase: 'tu sesión de cumpleaños', notice: NOTICE_EXTERIORES,
      packages: [
        { slug: 'estudio', name: 'Estudio', price: 70, place: 'estudio', details: '2 a 3 h · 6 fotos digitales' },
        { slug: 'cake-smash', name: 'Cake Smash', price: 120, place: 'estudio', details: '2 h · 15 fotos digitales', cakeSmash: true },
        { slug: 'tematica-cake-smash', name: 'Temática + Cake Smash', price: 180, place: 'estudio', details: '2 h · 15 fotos digitales', cakeSmash: true, tematica: true },
        { slug: 'exteriores', name: 'Exteriores', price: 200, place: 'exteriores', details: '2 h · 20 fotos digitales' },
      ],
    },
    {
      slug: 'cumpleanos-adultos', name: 'Cumpleaños adultos', category: 'cumpleanos-y-celebraciones', form: 'general',
      phrase: 'tu sesión de cumpleaños', notice: NOTICE_EXTERIORES,
      packages: [
        { slug: 'estudio', name: 'Estudio', price: 70, place: 'estudio', details: '2 h · 6 fotos digitales' },
        { slug: 'exteriores', name: 'Exteriores', price: 120, place: 'exteriores', details: '2 h · 20 fotos digitales' },
      ],
    },
    {
      slug: 'quince-anos', name: 'Quince años', category: 'cumpleanos-y-celebraciones', form: 'general',
      phrase: 'tu sesión de quince años', notice: NOTICE_EXTERIORES,
      packages: [
        { slug: 'estudio', name: 'Estudio', price: 70, place: 'estudio', details: '2 h · 6 fotos digitales' },
        { slug: 'iglesia', name: 'Iglesia', price: 120, place: 'iglesia', details: '2 h · 20 fotos digitales' },
        { slug: 'exteriores', name: 'Exteriores', price: 200, place: 'exteriores', details: '2 a 3 h · 20 fotos digitales' },
        { slug: 'recepcion', name: 'Recepción', price: 380, place: 'evento', details: 'Unas 3 h · 100 fotos digitales · 20 fotos impresas' },
      ],
    },
    {
      slug: 'revelacion-de-sexo', name: 'Revelación de sexo', category: 'cumpleanos-y-celebraciones', form: 'general',
      phrase: 'tu sesión de revelación de sexo', notice: NOTICE_EXTERIORES,
      packages: [
        { slug: 'estudio', name: 'Estudio', price: 150, place: 'estudio', details: '2 h · 20 fotos digitales' },
        { slug: 'exteriores', name: 'Exteriores', price: 200, place: 'exteriores', details: '2 h · 20 fotos digitales' },
      ],
    },
    {
      slug: 'recepciones', name: 'Recepciones', category: 'cumpleanos-y-celebraciones', form: 'recepciones',
      phrase: 'la cobertura de tu evento',
      packages: [
        { slug: 'recepcion', name: 'Recepción', price: 380, place: 'evento', details: 'Unas 3 h · 100 fotos digitales · 20 fotos impresas' },
      ],
    },
    {
      slug: 'familiar', name: 'Familiar', category: 'familia-y-pareja', form: 'familiar',
      phrase: 'tu sesión familiar',
      packages: [
        { slug: 'sesion-familiar', name: 'Sesión familiar', price: 70, place: 'estudio', details: '2 h · 6 fotos digitales' },
      ],
    },
    {
      slug: 'parejas', name: 'Parejas', category: 'familia-y-pareja', form: 'general',
      phrase: 'tu sesión de pareja',
      packages: [
        { slug: 'sesion-de-pareja', name: 'Sesión de pareja', price: 70, place: 'estudio', details: '2 h · 6 fotos digitales' },
      ],
    },
    {
      slug: 'fotografia-profesional-y-comercial', name: 'Fotografía profesional y comercial', category: 'marca-y-productos', form: 'general',
      phrase: 'tu sesión profesional',
      packages: [
        { slug: 'sesion-profesional', name: 'Sesión profesional', price: 80, place: 'estudio', details: '2 h · 6 fotos digitales' },
      ],
    },
  ];

  SERVICES.forEach((s) => {
    s.thumb = `assets/images/reservar/thumb-${s.slug}.jpg`;
  });

  const BOOKING_DATA = { CATEGORIES, SERVICES };
  // El navegador lo usa como global; el backend (api/_lib) lo importa para validar precios.
  if (typeof window !== 'undefined') window.BOOKING_DATA = BOOKING_DATA;
  if (typeof module !== 'undefined' && module.exports) module.exports = BOOKING_DATA;
})();
