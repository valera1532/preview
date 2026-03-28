const revealNodes = document.querySelectorAll(".reveal-card, .reveal-item");

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    });
  },
  {
    threshold: 0.18,
    rootMargin: "0px 0px -8% 0px",
  },
);

revealNodes.forEach((node) => revealObserver.observe(node));

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
