const revealNodes = document.querySelectorAll(".reveal-card, .reveal-item");
const root = document.documentElement;
const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
);

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
      } else {
        entry.target.classList.remove("is-visible");
      }
    });
  },
  {
    threshold: 0.18,
    rootMargin: "0px 0px -8% 0px",
  },
);

revealNodes.forEach((node) => revealObserver.observe(node));

if (!prefersReducedMotion.matches) {
  let pointerFrame = null;
  let nextPointerX = 0;
  let nextPointerY = 0;

  window.addEventListener("pointermove", (event) => {
    nextPointerX = event.clientX - window.innerWidth / 2;
    nextPointerY = event.clientY - window.innerHeight / 2;

    if (pointerFrame) {
      return;
    }

    pointerFrame = window.requestAnimationFrame(() => {
      root.style.setProperty("--pointer-x", `${nextPointerX}px`);
      root.style.setProperty("--pointer-y", `${nextPointerY}px`);
      pointerFrame = null;
    });
  });
}

const form = document.querySelector(".contact-form");

if (form) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const button = form.querySelector("button");
    const originalText = button.querySelector("span").textContent;

    button.querySelector("span").textContent = "Запрос отправлен";
    button.disabled = true;

    window.setTimeout(() => {
      button.querySelector("span").textContent = originalText;
      button.disabled = false;
      form.reset();
    }, 2200);
  });
}
