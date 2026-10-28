// Datos de las páginas de servicio (Figma: "Servicio · …" Desktop/Mobile, página 22:1062)
// Todo el texto es literal de Figma. Lo derivado está marcado con «derivado».
// window.SERVICES_DATA[slug] lo usa js/servicio-detalle.js para pintar servicio-detalle.html?sesion=<slug>
(() => {
  const IMG = 'assets/images/servicio';

  // Textos comunes a todas las páginas de servicio
  const COMMON = {
    pricingNote: 'Precios en dólares estadounidenses. Los pagos en pesos colombianos se calculan según la tasa del día. Para reservar, se requiere un abono del 50%.',
    schedule: 'Lunes a sábado: 8:00 a. m., 10:00 a. m., 2:00 p. m. y 4:00 p. m. (hora de Venezuela).',
    depositHero: 'Abono del 50% para reservar',
    depositHeroShort: 'Abono del 50%', // versión mobile
    ctaEyebrow: 'Reserva tu sesión',
    faqEyebrow: 'Preguntas frecuentes',
    faqTitle: 'Sobre esta sesión',
    faqMore: 'Ver todas las preguntas',
    experienceEyebrow: 'La experiencia',
    forWhoLabel: 'Para quién es',
    expectLabel: 'Qué puedes esperar',
    includedTitle: 'Lo que incluye',
    preparationTitle: 'Antes de tu sesión',
    galleryMobile: 'Ver más fotos en la galería',
    bookLabel: 'Ver disponibilidad',
    whatsappLabel: 'Consultar por WhatsApp',
    packageCta: 'Elegir este paquete',
    // Encabezado de paquetes: plural (varios paquetes) o singular (uno solo)
    packagesMany: { eyebrow: 'Paquetes', title: 'Elige tu paquete' },
    packagesOne: { eyebrow: 'Paquete', title: 'Lo que incluye tu paquete' },
  };

  // Metadatos de paquete (orden de Figma: Duración, Fotos, Fotos impresas, Lugar)
  const meta = (duration, photos, place, printed) => {
    const items = [
      { icon: 'clock', label: 'Duración', value: duration },
      { icon: 'camera', label: 'Fotos', value: photos },
    ];
    if (printed) items.push({ icon: 'image', label: 'Fotos impresas', value: printed });
    items.push({ icon: 'map-pin', label: 'Lugar', value: place });
    return items;
  };

  // Abono = 50% del precio (coincide con todas las tarjetas de Figma)
  // «Costos adicionales» siempre termina con la foto digital adicional (Package Card 221:2259)
  const pkg = (slug, name, price, data) => ({
    slug,
    name,
    amount: price,
    price: `US$${price}`,
    deposit: `Abono para reservar: US$${price / 2} (50%)`,
    includes: [],
    excludes: [], // «No incluye» (icono menos)
    notes: [], // «A tener en cuenta» (icono info)
    ...data,
    extras: [...(data.extras || []), EXTRA_PHOTOS], // «Costos adicionales» (icono info, como en las instancias de Figma)
  });

  const photo = (slug, file, alt, pos) => ({ src: `${IMG}/${slug}/${file}`, alt, pos: pos || '50% 50%' });

  const DELIVERY = 'Fotos digitales editadas, entregadas con el logo de Ely Salazar';
  const DELIVERY_TIME = 'Entrega digital en 8 días hábiles';
  const EXTRA_PHOTOS = 'Fotografía digital adicional: US$4 c/u.';
  const MAKEUP = 'Maquillaje y peinado (opcional, con solicitud previa): US$50';
  const EXTRA_BABY = 'Bebé adicional: US$20 cada uno';
  const ON_TIME = 'Llega puntual: tienes 15 minutos de tolerancia.';
  const DEPOSIT_CONFIRM = 'Tu fecha se confirma con el abono del 50%.';
  const TRANSFER = 'Traslado: US$30, si aplica';
  const STUDIO_SETS = 'Fondos y escenografía del estudio';

  const SERVICES = {
    /* ---------- Embarazo (27:4175 / 27:4251) ---------- */
    embarazo: {
      name: 'Embarazo',
      category: 'embarazo-y-bebe',
      galleryCategory: 'embarazo',
      hero: {
        eyebrow: 'Embarazo y bebé',
        script: 'Embarazo',
        headline: 'La promesa de una nueva vida.',
        body: 'Retratos de tu embarazo entre la semana 28 y la 32: en el estudio, en Bathroom o en exteriores.',
        photo: photo('embarazo', 'hero.jpg', 'Mujer embarazada recostada de lado sobre telas color malva, vista desde arriba'),
      },
      experience: {
        title: 'Un amor que se expande y se transforma.',
        body: 'Una fotografía de embarazo expresa la promesa de una nueva vida… el reflejo de un amor que se expande y se transforma. Puedes elegir con anticipación vestidos, telas y coronas del estudio.',
        forWho: 'Mamás entre la semana 28 y la 32 de embarazo. Tu pareja y tu familia también pueden participar.',
        expect: 'Una sesión de 2 a 3 horas, con vestuario y escenografía del estudio, y tus fotos editadas en 8 días hábiles.',
      },
      story: {
        type: 'chapters',
        chapters: [
          {
            eyebrow: 'Embarazo · Capítulo 1 de 3',
            title: 'Cada semana cuenta una historia',
            body: 'Elige el ambiente que más se parezca a ti: la calma del estudio, la delicadeza de Bathroom o la luz de los exteriores.',
          },
          // Capítulo 2: frame «Service template — States» (27:5755). El capítulo 3 no existe en Figma.
          {
            eyebrow: 'Embarazo · Capítulo 2 de 3',
            title: 'Vestuario y detalles',
            body: 'Vestidos, telas, coronas, flores y alas del estudio para completar tu sesión. Elígelos con anticipación.',
          },
        ],
        rows: [
          { type: 'wide', chapter: 0, photos: [photo('embarazo', 'story-1.jpg', 'Retrato de una mujer sonriente con camisa blanca sobre fondo claro', '50% 8%')] },
          {
            type: 'pair',
            chapter: 1,
            photos: [
              photo('embarazo', 'story-2.jpg', 'Mujer embarazada de perfil sosteniendo un ramo de flores pequeñas sobre fondo marrón', '50% 10%'),
              photo('embarazo', 'story-3.jpg', 'Mujer embarazada en jeans sosteniendo hortensias azules y flores blancas', '50% 20%'),
            ],
          },
          { type: 'wide', chapter: 1, photos: [photo('embarazo', 'story-4.jpg', 'Vientre de embarazo con blusa de encaje blanco entre pétalos y rosas fucsia', '50% 45%')] },
        ],
      },
      packages: {
        layout: 'cols-3',
        items: [
          pkg('estudio', 'Estudio', 80, {
            meta: meta('2 horas', '6 fotos digitales', 'Estudio'),
            includes: ['2 cambios de vestuario', STUDIO_SETS],
            extras: [MAKEUP],
          }),
          pkg('bathroom', 'Bathroom', 100, {
            meta: meta('2 horas', '6 fotos digitales', 'Estudio'),
            includes: ['Bañera, set y accesorios del estudio'],
            extras: [MAKEUP],
          }),
          pkg('exteriores', 'Exteriores', 180, {
            meta: meta('2 a 3 horas', '20 fotos digitales', 'Exteriores'),
            includes: ['Vestidos del estudio, si los pides con anticipación'],
            extras: [TRANSFER, MAKEUP],
          }),
        ],
      },
      included: [DELIVERY, DELIVERY_TIME, 'Vestidos, telas, coronas, flores y alas del estudio'],
      // «06 Vestuario y accesorios» (215:9100 / 215:9220), después de los paquetes.
      // Las fotos de vestidos y accesorios están pendientes: se muestra solo el texto (BC-5).
      wardrobe: [
        {
          eyebrow: 'Vestuario',
          title: 'Vestidos disponibles',
          badge: 'Sin costo adicional',
          body: 'Contamos con una selección de vestidos que puedes utilizar durante tu sesión sin costo adicional. Te recomendamos consultar los modelos disponibles y coordinar tu elección con anticipación.',
          note: 'Los vestidos están sujetos a disponibilidad.',
        },
        {
          eyebrow: 'Detalles',
          title: 'Accesorios para tu sesión',
          badge: 'Sin costo adicional',
          body: 'Disponemos de telas, coronas, flores artificiales y otros accesorios que puedes incorporar a tus fotografías sin costo adicional, según disponibilidad.',
          note: 'Podemos orientarte para elegir las opciones que mejor se adapten al resultado que deseas.',
        },
      ],
      // «Recomendaciones para tu sesión» (215:9174) reemplaza «Antes de tu sesión» solo en Embarazo
      preparationTitle: 'Recomendaciones para tu sesión',
      preparation: [
        { label: 'Momento ideal', text: 'Te recomendamos realizar tu sesión de embarazo entre las semanas 28 y 32 de gestación.' },
        { label: 'Preparación de la piel', text: 'El día de la sesión, evita aplicar aceites o cremas corporales.' },
        { label: 'Vestuario', text: 'Puedes traer tus propias prendas o elegir, sin costo adicional, entre los vestidos disponibles en el estudio. Te recomendamos coordinar tu selección con anticipación.' },
        { label: 'Ropa interior', text: 'Te recomendamos llevar ropa interior adecuada a los cambios de vestuario. Si deseas fotografías con prendas más ligeras, podemos orientarte sobre las opciones más apropiadas.' },
        { label: 'Calzado y uñas', text: 'Procura llevar las uñas arregladas y seleccionar calzado que complemente el estilo de tus fotografías.' },
        { label: 'Maquillaje y peinado — US$50', badge: 'Costo adicional', text: 'Puedes complementar tu sesión con nuestro servicio de maquillaje y peinado, disponible en el estudio por US$50 adicionales. Es necesario solicitarlo con anticipación.' },
        { label: 'Fotografías en pareja', text: 'Si tu pareja participará en la sesión, recomendamos coordinar los colores y estilos de la vestimenta para lograr una composición armoniosa.' },
        { label: 'Sesiones en exteriores', text: 'Si deseas utilizar vestidos del estudio durante una sesión en exteriores, es importante coordinar su disponibilidad con anticipación.' },
      ],
      faq: [
        { q: '¿En qué semana debo hacer mi sesión?', a: 'Entre la semana 28 y la 32 de embarazo.' },
        { q: '¿Puedo usar vestidos del estudio?', a: 'Sí, sin costo adicional. Elige con anticipación vestidos, telas y coronas del estudio; para exteriores, debes pedirlos antes.' },
        { q: '¿Hay un costo adicional en exteriores?', a: 'Puede aplicar un recargo de US$30 por traslado, según la locación.' },
      ],
    },

    /* ---------- Newborn (27:4316 / 27:4391) ---------- */
    newborn: {
      name: 'Newborn',
      category: 'embarazo-y-bebe',
      galleryCategory: 'newborn',
      hero: {
        eyebrow: 'Embarazo y bebé',
        script: 'Newborn',
        headline: 'La ternura de los primeros días.',
        body: 'Sesiones para recién nacidos en el estudio, con fondos y escenografía. El posado clásico se realiza entre el día 8 y el 12 de nacido.',
        photo: photo('newborn', 'hero.jpg', 'Bebé recién nacido dormido en una canasta de mimbre decorada con rosas'),
      },
      experience: {
        title: 'Cada gesto, cada suspiro y cada mirada.',
        body: 'La fotografía Newborn captura la ternura de los primeros días: cada gesto, cada suspiro y cada mirada. Las sesiones Newborn son para bebés de hasta 3 meses; a partir del cuarto mes, te recomendamos la sesión Mes a Mes.',
        forWho: 'Bebés de hasta 3 meses. El posado clásico Newborn es para bebés entre el día 8 y el 12 de nacido.',
        expect: 'Una sesión de 2 a 3 horas en el estudio. Una persona puede acompañarte para ayudar.',
      },
      story: {
        type: 'chapters',
        chapters: [
          {
            eyebrow: 'Newborn · Capítulo 1 de 3',
            title: 'Los primeros días pasan muy rápido',
            body: 'Por eso recomendamos hacer el posado clásico entre el día 8 y el 12 de nacido.',
          },
        ],
        rows: [
          { type: 'wide', chapter: 0, photos: [photo('newborn', 'story-1.jpg', 'Bebé dormido con gorro blanco y lentes redondos junto a una cámara pequeña', '50% 35%')] },
          {
            type: 'pair',
            chapter: 0,
            photos: [
              photo('newborn', 'story-2.jpg', 'Bebé dormido con gorro de osito azul sobre una canasta, junto a un oso de peluche'),
              photo('newborn', 'story-3.jpg', 'Primer plano de una bebé dormida con tiara de perlas'),
            ],
          },
        ],
      },
      packages: {
        layout: 'cols-2',
        items: [
          pkg('sesion-newborn', 'Sesión Newborn', 80, {
            meta: meta('2 horas', '6 fotos digitales', 'Estudio'),
            includes: [STUDIO_SETS],
            extras: [EXTRA_BABY],
          }),
          pkg('sesion-retrato', 'Sesión + Retrato', 140, {
            meta: meta('2 a 3 horas', '6 fotos digitales', 'Estudio'),
            includes: ['Cuadro de 30×40 cm con moldes 3D de mano y pie', STUDIO_SETS],
            extras: [EXTRA_BABY],
          }),
        ],
      },
      included: [DELIVERY, DELIVERY_TIME, STUDIO_SETS],
      preparation: [
        'El posado clásico se realiza entre el día 8 y el 12 de nacido.',
        'Si tu bebé tiene más de 15 días, indícalo al reservar.',
        'Trae a tu bebé bañado y alimentado al menos 20 minutos antes.',
        'Una persona puede acompañarte para ayudar.',
      ],
      faq: [
        { q: '¿Cuándo es el mejor momento para la sesión?', a: 'El posado clásico Newborn se realiza entre el día 8 y el 12 de nacido.' },
        { q: '¿Hasta qué edad es la sesión Newborn?', a: 'Hasta los 3 meses. A partir del cuarto mes, te recomendamos la sesión Mes a Mes.' },
        { q: '¿Y si mi bebé tiene más de 15 días?', a: 'Indícalo al reservar para preparar una sesión adecuada a su edad.' },
      ],
    },

    /* ---------- Mes a Mes (27:4455 / 27:4530) ---------- */
    'mes-a-mes': {
      name: 'Mes a Mes',
      category: 'embarazo-y-bebe',
      galleryCategory: 'bebes',
      hero: {
        eyebrow: 'Embarazo y bebé',
        script: 'Mes a Mes',
        headline: 'Un instante único, un recuerdo eterno.',
        body: 'Sesiones para acompañar a tu bebé mes a mes, con escenografía y vestuario temático del estudio.',
        photo: photo('mes-a-mes', 'hero.jpg', 'Bebé sonriente con un gran lazo blanco en la cabeza recostada en un sillón'),
      },
      experience: {
        title: 'Cada mes trae algo nuevo.',
        body: 'La fotografía es mucho más que una imagen: es un instante único que se convierte en un recuerdo eterno. Si eliges una sesión temática, la escenografía y el vestuario temático del estudio no tienen costo adicional.',
        forWho: 'Bebés a partir del cuarto mes. Bathroom es desde los 7 meses, cuando tu bebé ya se sienta sin apoyo.',
        expect: 'Una sesión de 2 horas en el estudio y 6 fotos digitales editadas.',
      },
      story: {
        type: 'chapters',
        chapters: [
          {
            eyebrow: 'Mes a Mes · Capítulo 1 de 3',
            title: 'Sonrisas que cambian cada mes',
            body: 'Elige una sesión clásica, una temática o Bathroom para guardar cómo crece tu bebé.',
          },
        ],
        rows: [
          { type: 'wide', chapter: 0, photos: [photo('mes-a-mes', 'story-1.jpg', 'Bebé sonriente con tiara de perlas recostada sobre una manta blanca', '50% 30%')] },
          {
            type: 'pair',
            chapter: 0,
            photos: [
              photo('mes-a-mes', 'story-2.jpg', 'Bebé dormida con un gorro de flores de tela', '50% 40%'),
              photo('mes-a-mes', 'story-3.jpg', 'Bebé sonriente dentro de una bañera con espuma', '50% 15%'),
            ],
          },
        ],
      },
      packages: {
        layout: 'cols-2',
        items: [
          pkg('sesion-mes-a-mes', 'Sesión Mes a Mes', 70, {
            meta: meta('2 horas', '6 fotos digitales', 'Estudio'),
            includes: [STUDIO_SETS, 'Temática con vestuario del estudio, sin costo adicional'],
          }),
          pkg('bathroom', 'Bathroom', 80, {
            meta: meta('2 horas', '6 fotos digitales', 'Estudio'),
            includes: ['Bañera y set del estudio', 'Leche, espuma, frutas, flores o cereal'],
            notes: ['Desde los 7 meses, cuando tu bebé se sienta sin apoyo'],
          }),
        ],
      },
      included: [DELIVERY, DELIVERY_TIME, 'Escenografía y vestuario temático del estudio'],
      preparation: [
        'Bathroom es desde los 7 meses y cuando tu bebé ya se sienta sin apoyo.',
        ON_TIME,
        DEPOSIT_CONFIRM,
      ],
      faq: [
        { q: '¿Qué es una sesión temática?', a: 'Usamos escenografía y vestuario temático del estudio, sin costo adicional.' },
        { q: '¿Desde qué edad se puede hacer Bathroom?', a: 'Desde los 7 meses, cuando tu bebé ya se sienta sin apoyo.' },
        { q: '¿Puedo recibir más fotos?', a: 'Sí. Cada foto adicional cuesta US$4.' },
      ],
    },

    /* ---------- Cumpleaños infantiles (27:4594 / 27:4673) ---------- */
    'cumpleanos-infantiles': {
      name: 'Cumpleaños infantiles',
      category: 'cumpleanos-y-celebraciones',
      galleryCategory: 'cumpleanos',
      hero: {
        eyebrow: 'De 2 a 14 años',
        script: 'Cumpleaños',
        headline: 'Un universo de risas y colores.',
        body: 'Sesiones de cumpleaños para niñas y niños de 2 a 14 años: en el estudio, con cake smash, con temática o en exteriores.',
        photo: photo('cumpleanos-infantiles', 'hero.jpg', 'Niña con vestido rosado sentada en el piso entre globos rosados y en forma de corazón'),
      },
      experience: {
        title: 'La magia de la infancia en cada foto.',
        body: 'Cada cumpleaños es un universo de risas y colores, y la fotografía revive la magia de la infancia. Trae los atuendos que más te gusten para su sesión y pregunta por los fondos y accesorios del estudio.',
        forWho: 'Niñas y niños de 2 a 14 años y su celebración.',
        expect: 'Sesiones de 2 a 3 horas, con 6 a 20 fotos digitales editadas según el paquete.',
      },
      story: {
        type: 'chapters',
        chapters: [
          {
            eyebrow: 'Cumpleaños · Capítulo 1 de 3',
            title: 'Su día, a su manera',
            body: 'Desde una sesión sencilla en el estudio hasta una temática con cake smash: elige cómo quieres celebrarlo.',
          },
        ],
        rows: [
          { type: 'wide', chapter: 0, photos: [photo('cumpleanos-infantiles', 'story-1.jpg', 'Niña con vestido amarillo junto a una bicicleta blanca en un set de abejas y girasoles')] },
          {
            type: 'pair',
            chapter: 0,
            photos: [
              photo('cumpleanos-infantiles', 'story-2.jpg', 'Niña frente a una torta de cumpleaños con globos negros y el número 2', '60% 50%'),
              photo('cumpleanos-infantiles', 'story-3.jpg', 'Niña con vestido rojo sentada en un columpio decorado con rosas', '50% 30%'),
            ],
          },
          { type: 'wide', chapter: 0, photos: [photo('cumpleanos-infantiles', 'story-4.jpg', 'Niño rubio con camisa celeste al aire libre junto a una cerca de madera', '50% 15%')] },
        ],
      },
      packages: {
        layout: 'cols-2',
        items: [
          pkg('estudio', 'Estudio', 80, {
            meta: meta('2 a 3 horas', '6 fotos digitales', 'Estudio'),
            includes: ['Sets del estudio'],
            excludes: ['Temática ni globos'],
          }),
          pkg('cake-smash', 'Cake Smash', 130, {
            meta: meta('2 horas', '15 fotos digitales', 'Estudio'),
            includes: ['Torta decorada: ¼ de torta de vainilla con crema chantilly'],
            excludes: ['Globos ni confeti'],
          }),
          pkg('tematica-cake-smash', 'Temática + Cake Smash', 180, {
            meta: meta('2 horas', '15 fotos digitales', 'Estudio'),
            includes: ['Torta y escenario temático a tu elección, con globos y decoración'],
            excludes: ['Temáticas de personajes'],
          }),
          pkg('exteriores', 'Exteriores', 280, {
            meta: meta('2 horas', '20 fotos digitales', 'Exteriores'),
            excludes: ['Torta ni decoración'],
            extras: [TRANSFER],
          }),
        ],
      },
      included: [DELIVERY, DELIVERY_TIME, 'Fondos y accesorios del estudio'],
      preparation: [
        'Trae los atuendos que quieras usar.',
        'Pide tu temática con 2 semanas de anticipación.',
        'Si traes globos o accesorios, deben llegar al estudio 2 días antes.',
        'Indica al reservar si quieres cake smash.',
        'No trabajamos temáticas de personajes.',
      ],
      faq: [
        { q: '¿Con cuánta anticipación debo pedir la temática?', a: 'Con 2 semanas de anticipación.' },
        { q: '¿Puedo llevar mis propios globos?', a: 'Sí. Deben llegar al estudio 2 días antes de la sesión.' },
        { q: '¿Qué torta incluye el cake smash?', a: 'Un cuarto de torta de vainilla con crema chantilly, decorada para la sesión.' },
      ],
    },

    /* ---------- Cumpleaños adultos (27:4739 / 27:4814) ---------- */
    'cumpleanos-adultos': {
      name: 'Cumpleaños adultos',
      category: 'cumpleanos-y-celebraciones',
      galleryCategory: 'cumpleanos',
      hero: {
        eyebrow: 'Adultos',
        script: 'Cumpleaños',
        headline: 'Celebra un año más de ti.',
        body: 'Una sesión de cumpleaños en el estudio, con fondos y escenografía, o en exteriores.',
        photo: photo('cumpleanos-adultos', 'hero.jpg', 'Mujer rubia de labios rojos posando entre telas rojas'),
      },
      experience: {
        title: 'Fotos que se parezcan a ti.',
        body: 'Tu cumpleaños también merece fotos que te representen. Trae tu outfit, tus accesorios y tus globos, y pregunta qué fondos del estudio combinan con tu temática.',
        forWho: 'Adultos que quieren celebrar su cumpleaños con una sesión de fotos.',
        expect: 'Una sesión de 2 horas, con 6 fotos en el estudio o 20 en exteriores.',
      },
      story: {
        type: 'chapters',
        chapters: [
          {
            eyebrow: 'Cumpleaños adultos · Capítulo 1 de 3',
            title: 'Tu estilo, tu celebración',
            body: 'Elige el estudio para jugar con fondos y escenografía, o los exteriores para una sesión al aire libre.',
          },
        ],
        rows: [
          { type: 'wide', chapter: 0, photos: [photo('cumpleanos-adultos', 'story-1.jpg', 'Mujer de cabello rizado recostada con blusa negra de transparencias sobre fondo beige')] },
          {
            type: 'pair',
            chapter: 0,
            photos: [
              photo('cumpleanos-adultos', 'story-2.jpg', 'Mujer recostada sobre fondo blanco con el cabello extendido y un ramo de flores blancas'),
              photo('cumpleanos-adultos', 'story-3.jpg', 'Mujer con abrigo negro posando en un haz de luz sobre fondo oscuro', '50% 15%'),
            ],
          },
        ],
      },
      packages: {
        layout: 'cols-2',
        items: [
          pkg('estudio', 'Estudio', 70, {
            meta: meta('2 horas', '6 fotos digitales', 'Estudio'),
            includes: [STUDIO_SETS],
          }),
          pkg('exteriores', 'Exteriores', 180, {
            meta: meta('2 horas', '20 fotos digitales', 'Exteriores'),
            excludes: ['Set ni decoración'],
            extras: [TRANSFER],
          }),
        ],
      },
      included: [DELIVERY, DELIVERY_TIME, STUDIO_SETS],
      preparation: [
        'Trae tu outfit, tus accesorios y tus globos.',
        'Pregunta qué fondos del estudio combinan con tu temática.',
        ON_TIME,
        DEPOSIT_CONFIRM,
      ],
      faq: [
        { q: '¿Puedo llevar globos y accesorios?', a: 'Sí, trae tus globos y accesorios para la sesión.' },
        { q: '¿La sesión en exteriores incluye decoración?', a: 'No. En exteriores no se incluye set ni decoración.' },
        { q: '¿Cuántas fotos recibo?', a: '6 fotos en el estudio o 20 en exteriores, editadas.' },
      ],
    },

    /* ---------- Quince años (27:4878 / 27:4956) ---------- */
    'quince-anos': {
      name: 'Quince años',
      category: 'cumpleanos-y-celebraciones',
      galleryCategory: 'quince-anos',
      hero: {
        eyebrow: 'Cumpleaños y celebraciones',
        script: 'Quince años',
        headline: 'Sueños que comienzan a florecer.',
        body: 'Sesiones de quince años en el estudio, en la iglesia o en exteriores, y la cobertura de tu recepción.',
        photo: photo('quince-anos', 'hero.jpg', 'Quinceañera de cabello largo con vestido de plumas rosadas sobre fondo negro'),
      },
      experience: {
        title: 'Belleza, elegancia y sueños.',
        body: 'Cada foto es un testimonio de belleza, elegancia y sueños que comienzan a florecer. Puedes elegir sesión en estudio, en iglesia o en exteriores, y la cobertura de la recepción.',
        forWho: 'Quinceañeras que quieren recordar este momento, antes o durante su celebración.',
        expect: 'Sesiones de 2 a 3 horas con 6 a 20 fotos, o unas 3 horas de cobertura en tu recepción.',
      },
      story: {
        type: 'chapters',
        chapters: [
          {
            eyebrow: 'Quince años · Capítulo 1 de 3',
            title: 'Un momento que se celebra una vez',
            body: 'Elige dónde quieres vivirlo: el estudio, la iglesia, los exteriores o tu recepción.',
          },
        ],
        rows: [
          { type: 'wide', chapter: 0, photos: [photo('quince-anos', 'story-1.jpg', 'Quinceañera con vestido dorado y lazo rosado entre globos rosados', '50% 35%')] },
          {
            type: 'pair',
            chapter: 0,
            photos: [
              photo('quince-anos', 'story-2.jpg', 'Quinceañera con vestido rojo de tul en un jardín', '50% 20%'),
              photo('quince-anos', 'story-3.jpg', 'Retrato de quinceañera de cabello oscuro sobre fondo negro'),
            ],
          },
          { type: 'wide', chapter: 0, photos: [photo('quince-anos', 'story-4.jpg', 'Quinceañera con corona recibe un beso de sus padres en la mejilla')] },
        ],
      },
      packages: {
        layout: 'masonry',
        items: [
          pkg('estudio', 'Estudio', 80, {
            meta: meta('2 horas', '6 fotos digitales', 'Estudio'),
            includes: [STUDIO_SETS],
          }),
          pkg('iglesia', 'Iglesia', 130, {
            meta: meta('2 horas', '20 fotos digitales', 'Iglesia'),
          }),
          pkg('exteriores', 'Exteriores', 280, {
            meta: meta('2 a 3 horas', '20 fotos digitales', 'Exteriores'),
            extras: [TRANSFER],
            notes: ['Recomendamos 2 o 3 cambios de vestuario'],
          }),
          pkg('recepcion', 'Recepción', 400, {
            meta: meta('Unas 3 horas', '100 fotos digitales', 'Lugar del evento', '20 fotos impresas'),
            includes: ['Cobertura de tu celebración'],
          }),
        ],
      },
      included: [DELIVERY, DELIVERY_TIME],
      preparation: [
        'Para la sesión en exteriores, trae 2 o 3 cambios de vestuario.',
        ON_TIME,
        DEPOSIT_CONFIRM,
      ],
      faq: [
        { q: '¿Cuántos cambios de vestuario recomiendan?', a: 'Para la sesión en exteriores, 2 o 3 cambios.' },
        { q: '¿Qué incluye la cobertura de la recepción?', a: 'Unas 3 horas de cobertura, 100 fotos digitales y 20 fotos impresas.' },
        { q: '¿Hay costo por traslado en exteriores?', a: 'Puede aplicar un recargo de US$30 por traslado, según la locación.' },
      ],
    },

    /* ---------- Revelación de sexo (27:5022 / 27:5097) ---------- */
    'revelacion-de-sexo': {
      name: 'Revelación de sexo',
      category: 'cumpleanos-y-celebraciones',
      galleryCategory: 'eventos',
      hero: {
        eyebrow: 'Cumpleaños y celebraciones',
        script: 'Revelación',
        headline: 'El siguiente capítulo de tu historia.',
        body: 'Descubre quién será el nuevo integrante de la familia en una sesión en el estudio o en exteriores.',
        photo: photo('revelacion-de-sexo', 'hero.jpg', 'Pareja con su hija en brazos frente a una decoración de globos azules y rosados con osos de peluche'),
      },
      experience: {
        title: 'Un momento para descubrir juntos.',
        body: 'Es hora de conocer el siguiente capítulo de tu historia y descubrir quién será el nuevo integrante de la familia. Elige cómo hacer la revelación: pintura, pastel, confeti, globo, paraguas o humo.',
        forWho: 'Futuros papás y sus familias.',
        expect: 'Una sesión de 2 horas, con 15 o 20 fotos digitales editadas según el paquete.',
      },
      story: {
        type: 'chapters',
        chapters: [
          {
            eyebrow: 'Revelación · Capítulo 1 de 2',
            title: '¿Niña o niño?',
            body: 'Prepara la sorpresa con la forma de revelación que más te guste; nosotros guardamos el momento.',
          },
        ],
        rows: [
          { type: 'wide', chapter: 0, photos: [photo('revelacion-de-sexo', 'story-1.jpg', 'Pareja cortando un pastel de revelación entre globos color crema y dorado', '50% 30%')] },
          {
            type: 'pair',
            chapter: 0,
            photos: [
              photo('revelacion-de-sexo', 'story-2.jpg', 'Pareja abrazada bajo una lluvia de confeti azul'),
              null, // Figma: «Foto pendiente»
            ],
          },
        ],
      },
      packages: {
        layout: 'cols-2',
        items: [
          pkg('estudio', 'Estudio', 150, {
            meta: meta('2 horas', '15 fotos digitales', 'Estudio'),
            includes: ['Decoración', 'Revelación con pintura, pastel, confeti, globo, paraguas o humo'],
          }),
          pkg('exteriores', 'Exteriores', 280, {
            meta: meta('2 horas', '20 fotos digitales', 'Exteriores'),
            extras: [TRANSFER],
          }),
        ],
      },
      included: [DELIVERY, DELIVERY_TIME],
      preparation: [ON_TIME, DEPOSIT_CONFIRM, 'Indicaciones específicas por confirmar con Ely.'],
      faq: [
        { q: '¿Cómo se hace la revelación?', a: 'Puedes elegir pintura, pastel, confeti, globo, paraguas o humo.' },
        { q: '¿Qué incluye la sesión en estudio?', a: 'Decoración, 2 horas de sesión y 15 fotos digitales editadas.' },
        { q: '¿Puedo hacerla en exteriores?', a: 'Sí, por US$280. Puede aplicar un recargo de US$30 por traslado.' },
      ],
    },

    /* ---------- Recepciones (27:5161 / 27:5243) ---------- */
    recepciones: {
      name: 'Recepciones',
      category: 'cumpleanos-y-celebraciones',
      galleryCategory: 'eventos',
      hero: {
        eyebrow: 'Cumpleaños y celebraciones',
        script: 'Recepciones',
        headline: 'Cobertura para tu celebración.',
        body: 'Unas 3 horas de cobertura de tu fiesta, con 100 fotos digitales y 20 fotos impresas.',
        photo: photo('recepciones', 'hero.jpg', 'Quinceañera con vestido corto dorado junto a una torta blanca con lazos rosados y globos'),
      },
      experience: {
        title: 'Los momentos que no quieres perderte.',
        body: 'Cobertura de tu celebración, con 100 fotos digitales y 20 fotos impresas, para quince años, cumpleaños y otras fiestas.',
        forWho: 'Quince años, cumpleaños y otras celebraciones.',
        expect: 'Unas 3 horas de cobertura en el lugar de tu evento.',
      },
      story: {
        type: 'simple',
        eyebrow: 'Recepciones · Tu fiesta',
        title: 'Cada detalle de tu celebración',
        body: 'La decoración, los abrazos y los momentos importantes, guardados en 100 fotos digitales.',
        photos: [
          photo('recepciones', 'story-1.jpg', 'Decoración de fiesta al aire libre con inflable blanco, globos rosados y mesas con flores'),
          null, // Figma: «Foto pendiente»
        ],
      },
      packages: {
        layout: 'single',
        photo: photo('quince-anos', 'story-1.jpg', 'Quinceañera con vestido dorado y lazo rosado entre globos rosados'),
        items: [
          pkg('recepcion', 'Recepción', 380, {
            meta: meta('Unas 3 horas', '100 fotos digitales', 'Lugar del evento', '20 fotos impresas'),
            includes: ['Cobertura de tu celebración'],
            notes: ['Tamaño de las fotos impresas por confirmar'],
          }),
        ],
      },
      included: [
        '100 fotos digitales editadas, entregadas con el logo de Ely Salazar',
        '20 fotos impresas (tamaño por confirmar)',
        DELIVERY_TIME,
      ],
      preparation: [
        'Al reservar, indica el tipo de evento, la fecha, el lugar y la duración.',
        'Cuéntanos cualquier requerimiento adicional de tu evento.',
        DEPOSIT_CONFIRM,
      ],
      faq: [
        { q: '¿Cuánto dura la cobertura?', a: 'Aproximadamente 3 horas.' },
        { q: '¿Qué recibo?', a: '100 fotos digitales editadas y 20 fotos impresas.' },
        { q: '¿Qué necesitas saber de mi evento?', a: 'El tipo de evento, la fecha, el lugar, la duración y cualquier requerimiento adicional.' },
      ],
    },

    /* ---------- Familiar (27:5312 / 27:5387) ---------- */
    familiar: {
      name: 'Familiar',
      category: 'familia-y-pareja',
      galleryCategory: 'familia',
      hero: {
        eyebrow: 'Familia y pareja',
        script: 'Familiar',
        headline: 'Juntos, como son.',
        body: 'Retratos de familia en el estudio, con fondos y escenografía. Tu mascota también puede salir en las fotos con fondo blanco.',
        photo: photo('familiar', 'hero.jpg', 'Familia de cuatro abrazada en un retrato sobre fondo negro'),
      },
      experience: {
        title: 'Un recuerdo para toda la familia.',
        body: 'Las fotos familiares parecen un instante juntos, pero en realidad son un recuerdo eterno. Si quieres incluir a tu mascota, también puede salir en las fotos con fondo blanco.',
        forWho: 'Familias: mamá, papá, hijos y también tu mascota.',
        expect: 'Una sesión de 2 horas en el estudio y 6 fotos digitales editadas.',
      },
      story: {
        type: 'chapters',
        chapters: [
          {
            eyebrow: 'Familiar · Capítulo 1 de 2',
            title: 'Todos en la foto',
            body: 'Abrazos, risas y miradas entre ustedes: así se ve tu familia hoy.',
          },
        ],
        rows: [
          { type: 'wide', chapter: 0, photos: [photo('familiar', 'story-1.jpg', 'Familia numerosa vestida de blanco sentada en el piso del estudio')] },
          {
            type: 'pair',
            chapter: 0,
            photos: [
              photo('familiar', 'story-2.jpg', 'Familia vestida de negro posando en vertical, con el bebé sobre los hombros del papá'),
              photo('familiar', 'story-3.jpg', 'Papá, mamá e hija sonriendo sobre fondo marrón', '60% 50%'),
            ],
          },
        ],
      },
      packages: {
        layout: 'single',
        photo: photo('familiar', 'story-1.jpg', 'Familia numerosa vestida de blanco sentada en el piso del estudio'),
        items: [
          pkg('sesion-familiar', 'Sesión familiar', 80, {
            meta: meta('2 horas', '6 fotos digitales', 'Estudio'),
            includes: [STUDIO_SETS, 'Mascotas en fotos con fondo blanco'],
            notes: ['Número de personas por confirmar al reservar'],
          }),
        ],
      },
      included: [DELIVERY, DELIVERY_TIME, STUDIO_SETS],
      preparation: [
        'Si incluyes a otros familiares, los adultos deben ayudarnos con el orden y el silencio durante la sesión.',
        'Las mascotas pueden participar en fotos con fondo blanco, sin escenarios.',
        'No enviamos fotos sin editar.',
        DEPOSIT_CONFIRM,
      ],
      faq: [
        { q: '¿Puede venir nuestra mascota?', a: 'Sí, en fotos con fondo blanco, sin escenarios.' },
        { q: '¿Cuántas personas pueden participar?', a: 'Indícalo al reservar y lo confirmamos contigo.' },
        { q: '¿Recibimos fotos sin editar?', a: 'No. Solo entregamos fotos editadas.' },
      ],
    },

    /* ---------- Parejas (27:5449 / 27:5531) ---------- */
    parejas: {
      name: 'Parejas',
      category: 'familia-y-pareja',
      galleryCategory: 'parejas',
      hero: {
        eyebrow: 'Familia y pareja',
        script: 'Parejas',
        headline: 'Los recuerdos importan tanto como los años juntos.',
        body: 'Una sesión para los dos en el estudio: 2 horas y 6 fotos digitales editadas.',
        photo: photo('parejas', 'hero.jpg', 'Hombre cargando en brazos a su pareja, ambos con camisa blanca y jeans'),
      },
      experience: {
        title: 'Amor + unión.',
        body: 'Cada mirada compartida es un verso que la cámara transforma en un recuerdo para toda la vida.',
        forWho: 'Parejas que quieren celebrar su historia.',
        expect: 'Una sesión de 2 horas en el estudio y 6 fotos digitales editadas.',
      },
      story: {
        type: 'simple',
        eyebrow: 'Parejas · Su historia',
        title: 'Una sesión para los dos',
        body: 'Miradas, abrazos y complicidad, en un espacio tranquilo para ustedes.',
        photos: [
          photo('parejas', 'story-1.jpg', 'Pareja de camisas blancas abrazada, frente con frente, sobre fondo claro'),
          null, // Figma: «Foto pendiente»
        ],
      },
      packages: {
        layout: 'single',
        photo: photo('parejas', 'story-1.jpg', 'Pareja de camisas blancas abrazada, frente con frente, sobre fondo claro', '50% 35%'),
        items: [
          pkg('sesion-de-pareja', 'Sesión de pareja', 80, {
            meta: meta('2 horas', '6 fotos digitales', 'Estudio'),
          }),
        ],
      },
      included: [DELIVERY, DELIVERY_TIME],
      preparation: [ON_TIME, DEPOSIT_CONFIRM, 'Indicaciones específicas por confirmar con Ely.'],
      faq: [
        { q: '¿Qué incluye la sesión?', a: '2 horas de sesión y 6 fotos digitales editadas.' },
        { q: '¿Puedo recibir más fotos?', a: 'Sí. Cada foto adicional cuesta US$4.' },
        { q: '¿Cuándo recibimos las fotos?', a: 'En 8 días hábiles.' },
      ],
    },

    /* ---------- Fotografía profesional y comercial (27:5600 / 27:5682) ---------- */
    'fotografia-profesional-y-comercial': {
      name: 'Fotografía profesional y comercial',
      category: 'marca-y-productos',
      galleryCategory: 'fotografia-comercial',
      galleryLabel: 'fotografía comercial', // Figma: «Ver más fotos de fotografía comercial en la galería»
      hero: {
        eyebrow: 'Marca y productos',
        script: 'Profesional',
        headline: 'La mejor inversión para tu marca.',
        body: 'Fotografía profesional y comercial para tus productos, tus servicios o tu trabajo.',
        photo: photo('fotografia-profesional-y-comercial', 'hero.jpg', 'Mujer recostada entre flores fucsia con maquillaje rosado y productos de belleza'),
      },
      experience: {
        title: 'Imágenes que hablan por tu trabajo.',
        body: 'Una sesión profesional siempre será la mejor inversión para tus productos o servicios. Trae tu vestuario, tus productos o tus elementos de trabajo; el estudio pone los fondos y la escenografía.',
        forWho: 'Emprendedores, profesionales y marcas que necesitan fotos de sus productos o servicios.',
        expect: 'Una sesión de 2 horas en el estudio y 6 fotos digitales editadas.',
      },
      story: {
        type: 'simple',
        eyebrow: 'Profesional y comercial · Tu marca',
        title: 'Tu trabajo, bien contado',
        body: 'Retratos profesionales y fotos de producto con los fondos y la escenografía del estudio.',
        photos: [
          photo('fotografia-profesional-y-comercial', 'story-1.jpg', 'Profesional de la salud con uniforme celeste rodeada de manos con guantes que sostienen instrumentos', '50% 25%'),
          photo('fotografia-profesional-y-comercial', 'story-2.jpg', 'Doctora con bata blanca y estetoscopio posando sobre fondo negro', '50% 20%'),
        ],
      },
      packages: {
        layout: 'single',
        photo: photo('fotografia-profesional-y-comercial', 'paquete.jpg', 'Mujer aplicándose brillo labial en una sesión de producto sobre fondo claro', '50% 35%'),
        items: [
          pkg('sesion-profesional', 'Sesión profesional', 80, {
            meta: meta('2 horas', '6 fotos digitales', 'Estudio'),
            includes: [STUDIO_SETS],
            notes: ['Trae tu vestuario y tus productos o elementos de trabajo'],
          }),
        ],
      },
      included: [DELIVERY, DELIVERY_TIME],
      preparation: [
        'Trae tu vestuario.',
        'Trae los productos o elementos de trabajo que quieras fotografiar.',
        ON_TIME,
        DEPOSIT_CONFIRM,
      ],
      faq: [
        { q: '¿Qué debo llevar?', a: 'Tu vestuario y los productos o elementos de trabajo que quieras fotografiar.' },
        { q: '¿Cuántas fotos recibo?', a: '6 fotos digitales editadas. Cada foto adicional cuesta US$4.' },
        { q: '¿Cuánto dura la sesión?', a: '2 horas, en el estudio.' },
      ],
    },
  };

  // Campos derivados de los anteriores (sin texto nuevo)
  Object.entries(SERVICES).forEach(([slug, s]) => {
    s.slug = slug;
    // «desde US$…» con el paquete más barato; sin «desde» si hay un solo paquete
    const items = s.packages.items;
    s.hero.price = `${items.length > 1 ? 'desde ' : ''}US$${Math.min(...items.map((p) => p.amount))}`;
    s.ctaPriceLine = `${s.hero.price} · Abono del 50% para confirmar.`;
    s.galleryDesktop = `Ver más fotos de ${s.galleryLabel || s.name} en la galería`;
    // Título de pestaña y descripción (derivado: nombre + cuerpo del hero)
    s.documentTitle = `${s.name} · Sesiones · Ely Salazar`;
    s.metaDescription = `${s.hero.headline} ${s.hero.body}`;
  });

  window.SERVICES_DATA = SERVICES;
  window.SERVICES_COMMON = COMMON;
  window.SERVICES_DEFAULT = 'embarazo';
})();
