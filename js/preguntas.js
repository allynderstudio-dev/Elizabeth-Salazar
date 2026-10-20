// Preguntas y políticas: navegación de temas (scrollspy) y estado inicial del FAQ en mobile
(() => {
  /* ---------- FAQ: en mobile solo la primera pregunta de cada lista empieza abierta (Figma 27:19620) ---------- */
  if (matchMedia('(max-width: 767px)').matches) {
    document.querySelectorAll('.topic [data-faq]').forEach((list) => {
      list.querySelectorAll('.faq-item__question').forEach((button, index) => {
        if (index === 0) return;
        button.setAttribute('aria-expanded', 'false');
        const answer = document.getElementById(button.getAttribute('aria-controls'));
        if (answer) answer.hidden = true;
      });
    });
  }

  /* ---------- Scrollspy de la navegación de temas ---------- */
  const nav = document.querySelector('[data-topic-nav]');
  if (!nav) return;

  const links = [...nav.querySelectorAll('a[href^="#"]')];
  const topics = links
    .map((link) => document.getElementById(link.getAttribute('href').slice(1)))
    .filter(Boolean);

  const setCurrent = (id) => {
    links.forEach((link) => {
      if (link.getAttribute('href') === `#${id}`) {
        link.setAttribute('aria-current', 'true');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  };

  // El tema actual es el último cuyo inicio ya pasó la línea de referencia (bajo el header)
  let ticking = false;
  const update = () => {
    ticking = false;
    const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 80;
    const line = header + 40; // justo debajo del header (los anchors aterrizan en header-height)
    let current = topics[0];
    topics.forEach((topic) => {
      if (topic.getBoundingClientRect().top <= line) current = topic;
    });
    // Al llegar al final de la página se marca el último tema
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
      const last = topics[topics.length - 1];
      if (last.getBoundingClientRect().top < window.innerHeight) current = last;
    }
    setCurrent(current.id);
  };

  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });
  window.addEventListener('resize', update);

  links.forEach((link) => {
    link.addEventListener('click', () => setCurrent(link.getAttribute('href').slice(1)));
  });

  update();
})();
