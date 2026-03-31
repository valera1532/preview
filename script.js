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

const circuitDiagramObject = document.querySelector("[data-circuit-diagram]");

const initCircuitDiagram = () => {
  if (!circuitDiagramObject) {
    return;
  }

  if (circuitDiagramObject.dataset.ready === "true") {
    return;
  }

  const svgDocument = circuitDiagramObject.contentDocument;

  if (!svgDocument) {
    return;
  }

  const svg = svgDocument.querySelector("svg");

  if (!svg) {
    return;
  }

  circuitDiagramObject.dataset.ready = "true";

  const wires = new Map();
  const orb = svgDocument.createElementNS("http://www.w3.org/2000/svg", "circle");
  let activeAnimationFrame = null;
  let activeAnimationToken = 0;

  orb.classList.add("wire-orb");
  orb.setAttribute("r", "0");
  svg.appendChild(orb);

  svgDocument.querySelectorAll(".wire-line").forEach((wire) => {
    const length = Math.ceil(wire.getTotalLength());
    const overlay = wire.cloneNode();

    overlay.removeAttribute("id");
    overlay.classList.add("wire-line-overlay");
    overlay.dataset.wireOverlay = wire.id;
    overlay.style.strokeDasharray = String(length);
    overlay.style.strokeDashoffset = String(length);

    wire.insertAdjacentElement("afterend", overlay);
    wires.set(wire.id, { base: wire, overlay, length });
  });

  const nodes = document.querySelectorAll(".network-node[data-wire]");
  let activeTimeout = null;

  const resetWire = (activeWire) => {
    activeWire.classList.remove("is-energized");
    activeWire.style.transition = "none";
    activeWire.style.strokeDashoffset = activeWire.style.strokeDasharray;
    void activeWire.getBoundingClientRect();
    activeWire.style.transition = "";
  };

  const resetOrb = () => {
    if (activeAnimationFrame) {
      window.cancelAnimationFrame(activeAnimationFrame);
      activeAnimationFrame = null;
    }

    orb.style.opacity = "0";
    orb.setAttribute("r", "0");
  };

  const animateOrb = (wireEntry, token) => {
    const startTime = performance.now();
    const duration = 1350;

    const step = (now) => {
      if (token !== activeAnimationToken) {
        return;
      }

      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const point = wireEntry.base.getPointAtLength(wireEntry.length * eased);
      const radius = 7 + Math.sin(progress * Math.PI * 4) * 2.2;

      orb.style.opacity = progress >= 1 ? "0" : "1";
      orb.setAttribute("cx", String(point.x));
      orb.setAttribute("cy", String(point.y));
      orb.setAttribute("r", String(Math.max(4.6, radius)));

      if (progress < 1) {
        activeAnimationFrame = window.requestAnimationFrame(step);
        return;
      }

      activeAnimationFrame = null;
      orb.style.opacity = "0";
      orb.setAttribute("r", "0");
    };

    activeAnimationFrame = window.requestAnimationFrame(step);
  };

  const energizeWire = (wireId, node) => {
    const wireEntry = wires.get(wireId);

    if (!wireEntry) {
      return;
    }

    const wire = wireEntry.overlay;

    if (activeTimeout) {
      window.clearTimeout(activeTimeout);
    }

    activeAnimationToken += 1;

    document
      .querySelectorAll(".network-node.is-active")
      .forEach((activeNode) => activeNode.classList.remove("is-active"));

    svgDocument
      .querySelectorAll(".wire-line-overlay.is-energized")
      .forEach((activeWire) => resetWire(activeWire));

    node.classList.add("is-active");
    resetWire(wire);
    resetOrb();
    void wire.getBoundingClientRect();
    wire.classList.add("is-energized");

    window.requestAnimationFrame(() => {
      wire.style.strokeDashoffset = "0";
      animateOrb(wireEntry, activeAnimationToken);
    });

    activeTimeout = window.setTimeout(() => {
      resetWire(wire);
      resetOrb();
      node.classList.remove("is-active");
    }, 1500);
  };

  nodes.forEach((node) => {
    const wireId = node.dataset.wire;

    node.addEventListener("mouseenter", () => energizeWire(wireId, node));
    node.addEventListener("focus", () => energizeWire(wireId, node));
  });
};

if (circuitDiagramObject) {
  circuitDiagramObject.addEventListener("load", initCircuitDiagram);

  if (circuitDiagramObject.contentDocument) {
    initCircuitDiagram();
  }
}
