function initParticles() {
  const canvas = document.querySelector(".hero-particles");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const particles = Array.from({ length: 50 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: Math.random() * 2 + 0.7,
    v: Math.random() * 0.55 + 0.18
  }));
  function resize() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(255,255,255,.62)";
    particles.forEach((p) => {
      p.y -= p.v / canvas.height;
      if (p.y < -0.02) p.y = 1.02;
      ctx.beginPath();
      ctx.arc(p.x * canvas.width, p.y * canvas.height, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  resize();
  window.addEventListener("resize", resize);
  draw();
}

function initCountUp() {
  document.querySelectorAll("[data-count]").forEach((node) => {
    const target = Number(node.dataset.count);
    const suffix = node.dataset.suffix || "";
    const start = performance.now();
    const duration = 1800;
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = target % 1 ? (target * eased).toFixed(1) : Math.round(target * eased);
      node.textContent = `${value}${suffix}`;
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}

function initCategorySlider() {
  const slider = document.querySelector("[data-category-slider]");
  if (!slider) return;

  let isDown = false;
  let startX = 0;
  let startScrollLeft = 0;
  let resumeTimer;

  function resumeMotion() {
    window.clearTimeout(resumeTimer);
    resumeTimer = window.setTimeout(() => {
      slider.classList.remove("is-dragging");
    }, 1200);
  }

  slider.addEventListener("pointerdown", (event) => {
    isDown = true;
    startX = event.clientX;
    startScrollLeft = slider.scrollLeft;
    slider.classList.add("is-dragging");
    slider.setPointerCapture?.(event.pointerId);
  });

  slider.addEventListener("pointermove", (event) => {
    if (!isDown) return;
    const delta = event.clientX - startX;
    slider.scrollLeft = startScrollLeft - delta;
  });

  ["pointerup", "pointercancel", "pointerleave"].forEach((type) => {
    slider.addEventListener(type, () => {
      if (!isDown) return;
      isDown = false;
      resumeMotion();
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initParticles();
  initCountUp();
  initCategorySlider();
});
