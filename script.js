const revealNodes = document.querySelectorAll(".reveal-card, .reveal-item");
const root = document.documentElement;
const backgroundScene = document.querySelector(".background-scene");
const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
);

const detectPerformanceTier = () => {
  const hardwareThreads = navigator.hardwareConcurrency || 8;
  const memory = navigator.deviceMemory || 8;
  const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;

  if (prefersReducedMotion.matches) {
    return "minimal";
  }

  if ((hardwareThreads <= 2 || memory <= 2) && isCoarsePointer) {
    return "minimal";
  }

  if (hardwareThreads <= 4 || memory <= 4 || (isCoarsePointer && hardwareThreads <= 6)) {
    return "reduced";
  }

  return "full";
};

const performanceTier = detectPerformanceTier();

root.dataset.performance = performanceTier;

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

const initElectricStrings = () => {
  if (!backgroundScene || performanceTier !== "full") {
    return;
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  canvas.className = "electric-strings-canvas";
  backgroundScene.prepend(canvas);

  let width = 0;
  let height = 0;
  let rafId = null;
  let time = 0;

  const pointer = { x: null, y: null };
  const target = { x: 0, y: 0 };
  const lastTarget = { x: 0, y: 0 };

  const distance = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);

  class Segment {
    constructor(parent, length, angle, first) {
      this.length = length;
      this.angle = angle;
      this.pos = first
        ? { x: parent.x, y: parent.y }
        : { x: parent.nextPos.x, y: parent.nextPos.y };
      this.nextPos = {
        x: this.pos.x + this.length * Math.cos(this.angle),
        y: this.pos.y + this.length * Math.sin(this.angle),
      };
    }

    update(targetPoint) {
      this.angle = Math.atan2(targetPoint.y - this.pos.y, targetPoint.x - this.pos.x);
      this.pos.x = targetPoint.x + this.length * Math.cos(this.angle - Math.PI);
      this.pos.y = targetPoint.y + this.length * Math.sin(this.angle - Math.PI);
      this.nextPos.x = this.pos.x + this.length * Math.cos(this.angle);
      this.nextPos.y = this.pos.y + this.length * Math.sin(this.angle);
    }

    fallback(targetPoint) {
      this.pos.x = targetPoint.x;
      this.pos.y = targetPoint.y;
      this.nextPos.x = this.pos.x + this.length * Math.cos(this.angle);
      this.nextPos.y = this.pos.y + this.length * Math.sin(this.angle);
    }

    drawLine() {
      context.lineTo(this.nextPos.x, this.nextPos.y);
    }
  }

  class StringLine {
    constructor(x, y, totalLength, segments) {
      this.x = x;
      this.y = y;
      this.totalLength = totalLength;
      this.segmentCount = segments;
      this.seed = Math.random();
      this.hue = 188 + Math.random() * 36;
      this.lightness = 62 + Math.random() * 22;
      this.width = 1.1 + Math.random() * 2.1;
      this.segments = [new Segment(this, totalLength / segments, 0, true)];

      for (let index = 1; index < segments; index += 1) {
        this.segments.push(
          new Segment(this.segments[index - 1], totalLength / segments, 0, false),
        );
      }
    }

    move(previousTarget, currentTarget) {
      const angle = Math.atan2(currentTarget.y - this.y, currentTarget.x - this.x);
      const delta = distance(previousTarget.x, previousTarget.y, currentTarget.x, currentTarget.y) + 4;
      const anchor = {
        x: currentTarget.x - 0.75 * delta * Math.cos(angle),
        y: currentTarget.y - 0.75 * delta * Math.sin(angle),
      };

      this.segments[this.segmentCount - 1].update(anchor);

      for (let index = this.segmentCount - 2; index >= 0; index -= 1) {
        this.segments[index].update(this.segments[index + 1].pos);
      }

      if (distance(this.x, this.y, currentTarget.x, currentTarget.y) <= this.totalLength + delta) {
        this.segments[0].fallback({ x: this.x, y: this.y });

        for (let index = 1; index < this.segmentCount; index += 1) {
          this.segments[index].fallback(this.segments[index - 1].nextPos);
        }
      }
    }

    draw(currentTarget) {
      if (distance(this.x, this.y, currentTarget.x, currentTarget.y) > this.totalLength) {
        return;
      }

      context.globalCompositeOperation = "lighter";
      context.beginPath();
      context.moveTo(this.x, this.y);

      this.segments.forEach((segment) => segment.drawLine());

      context.strokeStyle = `hsla(${this.hue}, 100%, ${this.lightness}%, 0.52)`;
      context.lineWidth = this.width;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.stroke();
      context.globalCompositeOperation = "source-over";
    }

    drawAnchor(currentTarget) {
      const isActive = distance(this.x, this.y, currentTarget.x, currentTarget.y) <= this.totalLength;

      context.beginPath();
      context.arc(
        this.x,
        this.y,
        isActive ? 1.8 + this.seed * 3.2 : 0.8 + this.seed * 1.8,
        0,
        Math.PI * 2,
      );

      context.fillStyle = isActive
        ? `rgba(255, 255, 255, ${0.72 + this.seed * 0.22})`
        : `rgba(33, 172, 188, ${0.35 + this.seed * 0.18})`;
      context.fill();
    }
  }

  const lines = [];

  const buildLines = () => {
    lines.length = 0;

    for (let index = 0; index < 220; index += 1) {
      lines.push(
        new StringLine(
          Math.random() * width,
          Math.random() * height,
          80 + Math.random() * 180,
          18,
        ),
      );
    }

    target.x = width * 0.5;
    target.y = height * 0.38;
    lastTarget.x = target.x;
    lastTarget.y = target.y;
  };

  const resizeCanvas = () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    buildLines();
  };

  const tick = () => {
    context.clearRect(0, 0, width, height);

    const driftTarget = pointer.x == null
      ? {
          x: width * 0.5 + Math.cos(time * 0.8) * width * 0.12,
          y: height * 0.34 + Math.sin(time * 1.1) * height * 0.08,
        }
      : pointer;

    target.x += (driftTarget.x - target.x) * 0.08;
    target.y += (driftTarget.y - target.y) * 0.08;

    context.beginPath();
    context.arc(
      target.x,
      target.y,
      distance(lastTarget.x, lastTarget.y, target.x, target.y) + 4,
      0,
      Math.PI * 2,
    );
    context.fillStyle = "rgba(173, 232, 255, 0.46)";
    context.fill();

    lines.forEach((line) => line.move(lastTarget, target));
    lines.forEach((line) => line.drawAnchor(target));
    lines.forEach((line) => line.draw(target));

    lastTarget.x = target.x;
    lastTarget.y = target.y;
    time += 0.008;
    rafId = window.requestAnimationFrame(tick);
  };

  window.addEventListener("pointermove", (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  });

  window.addEventListener("pointerleave", () => {
    pointer.x = null;
    pointer.y = null;
  });

  window.addEventListener("resize", () => {
    if (rafId) {
      window.cancelAnimationFrame(rafId);
    }

    resizeCanvas();
    tick();
  });

  resizeCanvas();
  tick();
};

initElectricStrings();

if (performanceTier === "full") {
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
  const orbEnabled = performanceTier === "full";
  const orb = orbEnabled
    ? svgDocument.createElementNS("http://www.w3.org/2000/svg", "circle")
    : null;
  let activeAnimationFrame = null;
  let activeAnimationToken = 0;

  if (orb) {
    orb.classList.add("wire-orb");
    orb.setAttribute("r", "0");
    svg.appendChild(orb);
  }

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

  const nodes = document.querySelectorAll(".network-node[data-wires]");
  let activeTimeout = null;
  let arriveTimeout = null;
  const lineDuration = 1350;
  const cardFillDelay = 700;
  let currentNode = null;
  let currentWires = [];

  const resetWire = (activeWire) => {
    activeWire.classList.remove("is-energized");
    activeWire.style.transition = "none";
    activeWire.style.strokeDashoffset = activeWire.style.strokeDasharray;
    void activeWire.getBoundingClientRect();
    activeWire.style.transition = "";
  };

  const resetOrb = () => {
    if (!orbEnabled || !orb) {
      return;
    }

    if (activeAnimationFrame) {
      window.cancelAnimationFrame(activeAnimationFrame);
      activeAnimationFrame = null;
    }

    orb.style.opacity = "0";
    orb.setAttribute("r", "0");
  };

  const resetNodeState = (activeNode) => {
    activeNode.classList.remove("is-pending", "is-active");
  };

  const clearCurrentInteraction = () => {
    if (activeTimeout) {
      window.clearTimeout(activeTimeout);
      activeTimeout = null;
    }

    if (arriveTimeout) {
      window.clearTimeout(arriveTimeout);
      arriveTimeout = null;
    }

    activeAnimationToken += 1;
    resetOrb();

    if (currentWires.length) {
      currentWires.forEach((wire) => resetWire(wire));
      currentWires = [];
    }

    if (currentNode) {
      resetNodeState(currentNode);
      currentNode = null;
    }
  };

  const animateOrb = (wireEntry, token) => {
    if (!orbEnabled || !orb) {
      return;
    }

    const startTime = performance.now();
    const duration = lineDuration;

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

  const energizeWire = (wireIds, node) => {
    const wireEntries = wireIds
      .map((wireId) => wires.get(wireId))
      .filter(Boolean);

    if (!wireEntries.length) {
      return;
    }

    const activeWireEntry = wireEntries[0];
    clearCurrentInteraction();
    currentNode = node;
    currentWires = wireEntries.map((entry) => entry.overlay);
    node.classList.add("is-pending");
    currentWires.forEach((wire) => resetWire(wire));
    resetOrb();
    currentWires.forEach((wire) => {
      void wire.getBoundingClientRect();
      wire.classList.add("is-energized");
    });

    window.requestAnimationFrame(() => {
      currentWires.forEach((wire) => {
        wire.style.strokeDashoffset = "0";
      });

      if (orbEnabled) {
        animateOrb(activeWireEntry, activeAnimationToken);
      }
    });

    arriveTimeout = window.setTimeout(() => {
      node.classList.add("is-active");
    }, cardFillDelay);

    activeTimeout = window.setTimeout(() => {
      activeTimeout = null;
      currentWires.forEach((wire) => resetWire(wire));
      resetOrb();
      currentWires = [];
    }, lineDuration + 350);
  };

  const releaseNode = (node) => {
    if (node !== currentNode) {
      resetNodeState(node);
      return;
    }

    clearCurrentInteraction();
  };

  nodes.forEach((node) => {
    const wireIds = (node.dataset.wires || "")
      .split(",")
      .map((wireId) => wireId.trim())
      .filter(Boolean);

    node.addEventListener("mouseenter", () => energizeWire(wireIds, node));
    node.addEventListener("focus", () => energizeWire(wireIds, node));
    node.addEventListener("mouseleave", () => releaseNode(node));
    node.addEventListener("blur", () => releaseNode(node));
  });
};

if (circuitDiagramObject) {
  circuitDiagramObject.addEventListener("load", initCircuitDiagram);

  if (circuitDiagramObject.contentDocument) {
    initCircuitDiagram();
  }
}
