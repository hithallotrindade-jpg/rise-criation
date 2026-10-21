(() => {
  const root = document.documentElement;
  const header = document.querySelector(".cabecalho");
  const menuButton = document.querySelector(".menu-toggle");
  const navigation = document.querySelector(".navegacao");
  const mobile = window.matchMedia("(max-width: 850px)");
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const year = document.getElementById("ano-atual");
  if (year) year.textContent = String(new Date().getFullYear());

  if (header && menuButton && navigation) {
    const closeMenu = (restoreFocus = false) => {
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.setAttribute("aria-label", "Abrir menu");
      header.classList.remove("menu-aberto");
      if (restoreFocus) menuButton.focus();
    };
    menuButton.hidden = false;
    menuButton.addEventListener("click", () => {
      const open = menuButton.getAttribute("aria-expanded") !== "true";
      menuButton.setAttribute("aria-expanded", String(open));
      menuButton.setAttribute(
        "aria-label",
        open ? "Fechar menu" : "Abrir menu",
      );
      header.classList.toggle("menu-aberto", open);
    });
    navigation.addEventListener("click", (event) => {
      const link = event.target.closest("a");
      if (!link) return;
      const target = document.getElementById(link.hash.slice(1));
      if (target && mobile.matches) {
        target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      }
      closeMenu();
    });
    document.addEventListener("keydown", (event) => {
      if (
        event.key === "Escape" &&
        menuButton.getAttribute("aria-expanded") === "true"
      )
        closeMenu(true);
    });
    document.addEventListener("click", (event) => {
      if (!header.contains(event.target)) closeMenu();
    });
    header.addEventListener("focusout", (event) => {
      if (!header.contains(event.relatedTarget)) closeMenu();
    });
    mobile.addEventListener("change", () => closeMenu());
    const updateHeader = () =>
      header.classList.toggle("rolou", window.scrollY > 24);
    window.addEventListener("scroll", updateHeader, { passive: true });
    updateHeader();
    // Mede o cabeçalho real para que as âncoras também funcionem com zoom.
    if ("ResizeObserver" in window) {
      new ResizeObserver(() =>
        root.style.setProperty(
          "--altura-cabecalho",
          `${header.offsetHeight}px`,
        ),
      ).observe(header);
    }
    root.classList.add("com-js");
  }

  if ("IntersectionObserver" in window) {
    const links = [...document.querySelectorAll(".navegacao a")];
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          for (const link of links) {
            if (link.hash === `#${entry.target.id}`)
              link.setAttribute("aria-current", "location");
            else link.removeAttribute("aria-current");
          }
        }
      },
      { rootMargin: "-15% 0px -55% 0px", threshold: 0 },
    );
    document
      .querySelectorAll("main section[id]")
      .forEach((section) => sectionObserver.observe(section));

    if (!motion.matches) {
      const revealObserver = new IntersectionObserver(
        (entries, observer) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            entry.target.classList.remove("pendente");
            observer.unobserve(entry.target);
          }
        },
        { threshold: 0.08 },
      );
      document
        .querySelectorAll(
          ".inicio .destaque, .inicio h1, .descricao-inicio, .acoes-inicio, .sobre-composicao, .servicos-intro, .servico-card, .portfolio-intro, .projeto-card, .contato-container",
        )
        .forEach((element) => {
          element.classList.add("revelar", "pendente");
          revealObserver.observe(element);
        });
      // Um link ou atalho de teclado nunca deve focar conteúdo invisível.
      document.addEventListener("focusin", (event) => {
        event.target.closest(".pendente")?.classList.remove("pendente");
      });
      motion.addEventListener("change", (event) => {
        if (event.matches) {
          document
            .querySelectorAll(".pendente")
            .forEach((element) => element.classList.remove("pendente"));
          revealObserver.disconnect();
        }
      });
    }
  }
})();
