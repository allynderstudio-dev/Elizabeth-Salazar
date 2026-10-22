// Datos de las temporadas (Figma: Temporada — Desktop/Mobile y Temporada · plantilla)
// Para abrir una temporada, cambia su `estado` a 'abiertas' (Figma: Status=Reservas abiertas).
// En producción todas están en 'proximamente' hasta que Ely confirme la campaña.
(() => {
  // Copias de cada estado (Seasonal Section · Status)
  const ESTADOS = {
    proximamente: {
      badge: 'Próximamente',
      icono: 'assets/icons/clock-sm.svg',
      nota: 'Pronto compartiremos más información sobre esta temporada.',
      cta: 'Consultar por WhatsApp',
      ctaPrimario: false,
      mensaje: (nombre) => `Hola, Ely. Me gustaría recibir información sobre las sesiones de ${nombre}.`,
    },
    abiertas: {
      badge: 'Reservas abiertas',
      icono: 'assets/icons/calendar-sm.svg',
      nota: 'Consulta las fechas y horarios disponibles para esta temporada.',
      cta: 'Consultar disponibilidad por WhatsApp',
      ctaPrimario: true,
      mensaje: (nombre) => `Hola, Ely. Me gustaría consultar la disponibilidad para las sesiones de ${nombre}.`,
    },
  };

  // Contenido de la plantilla de detalle. Figma solo trae contenido de ejemplo
  // ("por confirmar") mostrado con Navidad; se usa igual para todas las temporadas
  // hasta que cada una tenga su texto propio (sobrescribir con `detalle` por temporada).
  const PLANTILLA = {
    fechasBadge: 'Fechas por anunciar',
    titular: 'Una sesión para celebrar la temporada.',
    texto: 'Texto de la campaña por confirmar con Ely: qué incluye, para quién es y cuándo se realiza.',
    precio: 'Precio por confirmar',
    fotos: [null, null, null], // rutas de fotos; null = espacio pendiente
    paquete: {
      titulo: 'Sesión de temporada',
      precio: 'Precio por confirmar',
      nota: 'Abono del 50% para reservar',
      duracion: 'Por confirmar',
      fotos: 'Por confirmar',
      lugar: 'Por confirmar',
      incluye: ['2 cambios de vestuario', 'Fondos y escenografía disponibles'],
    },
    fechas: ['Fecha por confirmar', 'Fecha por confirmar', 'Fecha por confirmar'],
    horarios: 'Horarios por confirmar. Las sesiones de temporada pueden tener horarios distintos a los habituales.',
    aviso: {
      titulo: 'Reserva de temporada',
      texto: 'Tu horario queda apartado provisionalmente cuando tu solicitud queda registrada. Para confirmar tu sesión, debes realizar un abono del 50% del valor total.',
    },
    loQueIncluye: ['Detalles del paquete por confirmar'],
    antes: [
      'Llega puntual: tienes 15 minutos de tolerancia.',
      'Tu fecha se confirma con el abono del 50%.',
      'Indicaciones de la temporada por confirmar.',
    ],
    ctaTitulo: 'Reserva tu sesión de temporada',
    ctaTexto: 'Disponible cuando se publiquen las fechas.',
  };

  const TEMPORADAS = [
    { slug: 'san-valentin', nombre: 'San Valentín', mes: 'Febrero', estado: 'proximamente',
      descripcion: 'Un recuerdo especial para celebrar el amor y compartir momentos juntos.' },
    { slug: 'carnaval', nombre: 'Carnaval', mes: 'Febrero o marzo', estado: 'proximamente',
      descripcion: 'Color y alegría para celebrar el Carnaval en familia.' },
    { slug: 'dia-de-la-madre', nombre: 'Día de la Madre', mes: 'Mayo', estado: 'proximamente',
      descripcion: 'Un homenaje a mamá: retratos para celebrar a quien nos cuida.' },
    { slug: 'dia-del-padre', nombre: 'Día del Padre', mes: 'Junio', estado: 'proximamente',
      descripcion: 'Momentos con papá que vale la pena guardar.' },
    { slug: 'halloween', nombre: 'Halloween', mes: 'Octubre', estado: 'proximamente',
      descripcion: 'Disfraces y diversión para una sesión diferente en familia.' },
    { slug: 'navidad', nombre: 'Navidad', mes: 'Diciembre', estado: 'proximamente',
      descripcion: 'La magia de la Navidad en retratos para compartir con los tuyos.' },
  ];

  window.ELY_TEMPORADAS = { ESTADOS, PLANTILLA, TEMPORADAS, PREDETERMINADA: 'navidad' };
})();
