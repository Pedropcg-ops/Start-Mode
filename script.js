const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function initRevealAnimations() {
  const revealItems = document.querySelectorAll(".reveal");

  // Progressive enhancement: content stays visible if motion or observer support is limited.
  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.target.classList.contains("component-card")) {
          entry.target.classList.toggle("is-visible", entry.isIntersecting);
          return;
        }

        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.16,
      rootMargin: "0px 0px -8% 0px"
    }
  );

  revealItems.forEach((item, index) => {
    item.style.transitionDelay = `${Math.min(index % 4, 3) * 80}ms`;
    observer.observe(item);
  });
}

function initFaq() {
  const faqItems = document.querySelectorAll(".faq__item");

  faqItems.forEach((item) => {
    const button = item.querySelector(".faq__question");
    const answer = item.querySelector(".faq__answer");

    button.addEventListener("click", () => {
      const isOpen = item.classList.contains("is-open");

      faqItems.forEach((otherItem) => {
        const otherButton = otherItem.querySelector(".faq__question");
        const otherAnswer = otherItem.querySelector(".faq__answer");
        otherItem.classList.remove("is-open");
        otherButton.setAttribute("aria-expanded", "false");
        otherAnswer.style.maxHeight = null;
      });

      if (!isOpen) {
        item.classList.add("is-open");
        button.setAttribute("aria-expanded", "true");
        answer.style.maxHeight = `${answer.scrollHeight}px`;
      }
    });
  });
}

function initAnchorOffset() {
  const header = document.querySelector(".site-header");
  const links = document.querySelectorAll('a[href^="#"]');

  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      const targetId = link.getAttribute("href");

      if (!targetId || targetId === "#") return;

      const target = document.querySelector(targetId);
      if (!target) return;

      event.preventDefault();

      const headerOffset = header ? header.offsetHeight + 18 : 0;
      const targetTop = target.getBoundingClientRect().top + window.scrollY - headerOffset;

      window.scrollTo({
        top: targetTop,
        behavior: prefersReducedMotion ? "auto" : "smooth"
      });
    });
  });
}

function initSubtleParallax() {
  if (prefersReducedMotion) return;

  const parallaxItems = document.querySelectorAll(".product-render--hero, .lab-visual");
  let ticking = false;

  // Kept intentionally small so the page feels premium without fighting readability.
  const updateParallax = () => {
    parallaxItems.forEach((item) => {
      const rect = item.getBoundingClientRect();
      const viewportCenter = window.innerHeight / 2;
      const itemCenter = rect.top + rect.height / 2;
      const distance = (itemCenter - viewportCenter) / viewportCenter;
      const movement = Math.max(Math.min(distance * -14, 14), -14);

      item.style.transform = `translateY(${movement}px)`;
    });

    ticking = false;
  };

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        window.requestAnimationFrame(updateParallax);
        ticking = true;
      }
    },
    { passive: true }
  );

  updateParallax();
}

function initConsultModal() {
  const modal = document.querySelector("#compatibility-modal");
  if (!modal) return;

  const openButtons = document.querySelectorAll("[data-modal-open]");
  const closeButtons = modal.querySelectorAll("[data-modal-close]");
  const form = modal.querySelector(".consult-form");
  const status = modal.querySelector(".consult-form__status");
  const firstInput = modal.querySelector("input");

  const openModal = () => {
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-modal-open");
    window.setTimeout(() => firstInput?.focus(), 120);
  };

  const closeModal = () => {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-modal-open");
  };

  openButtons.forEach((button) => {
    button.addEventListener("click", openModal);
  });

  closeButtons.forEach((button) => {
    button.addEventListener("click", closeModal);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("is-open")) {
      closeModal();
    }
  });

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (status) {
      status.textContent = "Consulta preparada. Falta conectar este formulario al canal de contacto.";
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initRevealAnimations();
  initFaq();
  initAnchorOffset();
  initSubtleParallax();
  initConsultModal();
});
