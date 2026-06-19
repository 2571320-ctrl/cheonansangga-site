const SITE_DEFAULTS = {
  phone_office: "041-552-0014",
  phone_mobile: "010-4122-0321",
  fax: "041-552-0035",
  address: "충청남도 천안시 서북구 원두정9길 18, 101호",
  business_hours: "평일·주말 09:00 – 24:00",
  sns_blog: "https://blog.naver.com/2571320",
  sns_naver_profile: "https://search.naver.com/search.naver?where=nexearch&sm=tab_etc&mra=bjky&pkid=1&os=39660109&qvt=0&query=%EA%B9%80%ED%98%84%EC%8B%9D",
  sns_youtube: "https://www.youtube.com/@%EC%83%81%EA%B6%8C%EC%97%B0%EA%B5%AC%EC%86%8C",
  sns_instagram: "https://www.instagram.com/hyunsickim1",
  map_embed_url: "",
  sms_notify_phone: "010-4122-0321",
  sms_notify_url: "",
  registration_no: "제44133-2015-04204호"
};

function normalizeUrl(value) {
  if (!value) return "#";
  if (value === "#") return "#";
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function normalizeSocialValue(key, value) {
  const canonicalSocialLinks = {
    sns_blog: SITE_DEFAULTS.sns_blog,
    sns_naver_profile: SITE_DEFAULTS.sns_naver_profile,
    sns_youtube: SITE_DEFAULTS.sns_youtube,
    sns_instagram: SITE_DEFAULTS.sns_instagram
  };
  if (canonicalSocialLinks[key]) {
    return canonicalSocialLinks[key];
  }
  return value;
}

function getSettings() {
  try {
    return { ...SITE_DEFAULTS, ...JSON.parse(localStorage.getItem("site_settings") || "{}") };
  } catch {
    localStorage.removeItem("site_settings");
    return { ...SITE_DEFAULTS };
  }
}

function initSiteSettings() {
  const settings = getSettings();
  document.querySelectorAll("[data-setting]").forEach((node) => {
    const key = node.dataset.setting;
    const value = normalizeSocialValue(key, settings[key] || "");
    if (node.tagName === "A" && key.startsWith("sns_")) {
      node.href = normalizeUrl(value);
      node.target = "_blank";
      node.rel = "noopener";
      node.setAttribute("aria-label", key.replace("sns_", ""));
      node.hidden = !value || value === "#";
    } else if (node.tagName === "A" && key.startsWith("phone_")) {
      node.href = `tel:${value.replace(/[^0-9]/g, "")}`;
      node.textContent = value;
    } else {
      node.textContent = value;
    }
  });
  document.querySelectorAll("[data-map-frame]").forEach((frame) => {
    frame.src = settings.map_embed_url || "about:blank";
  });
}

function initFixedSocialLinks() {
  const links = {
    ".fixed-social-item.social-naver": SITE_DEFAULTS.sns_naver_profile,
    ".fixed-social-item.social-youtube": SITE_DEFAULTS.sns_youtube,
    ".fixed-social-item.social-instagram": SITE_DEFAULTS.sns_instagram,
    ".fixed-social-item.social-blog": SITE_DEFAULTS.sns_blog
  };

  Object.entries(links).forEach(([selector, href]) => {
    document.querySelectorAll(selector).forEach((link) => {
      link.href = href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.hidden = false;
    });
  });
}

function initHeader() {
  const header = document.querySelector(".site-header");
  const onScroll = () => header?.classList.toggle("scrolled", window.scrollY > 20);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

function initMobileNav() {
  const toggle = document.querySelector(".mobile-toggle");
  const nav = document.querySelector(".nav");
  toggle?.addEventListener("click", () => {
    nav?.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(nav?.classList.contains("open")));
  });
  nav?.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => nav.classList.remove("open")));
}

function markActiveNav() {
  const current = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav a").forEach((link) => {
    const href = link.getAttribute("href");
    link.classList.toggle("active", href === current || (current === "" && href === "index.html"));
  });
}

function initScrollFadeIn() {
  const nodes = document.querySelectorAll(".fade-in");
  if (!("IntersectionObserver" in window)) {
    nodes.forEach((node) => node.classList.add("visible"));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  nodes.forEach((node) => observer.observe(node));
}

function initBackToTop() {
  const btn = document.createElement("button");
  btn.className = "back-to-top";
  btn.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
  btn.setAttribute("aria-label", "맨 위로");
  document.body.appendChild(btn);
  btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  window.addEventListener("scroll", () => btn.classList.toggle("visible", window.scrollY > 400), { passive: true });
}

function showToast(message, type = "success") {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `toast ${type === "error" ? "error" : ""} is-visible`;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 3500);
}

function initPartnerSlider() {
  document.querySelectorAll(".partner-slider").forEach((slider) => {
    const track = slider.querySelector(".partner-links");
    const prev = slider.querySelector("[data-partner-prev]");
    const next = slider.querySelector("[data-partner-next]");
    if (!track) return;

      const step = () => {
        const card = track.querySelector(".partner-card");
        const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 10;
        return card ? card.getBoundingClientRect().width + gap : Math.floor(track.clientWidth / 5);
      };
      const cycleWidth = () => Math.max(0, track.scrollWidth / 2);
      const wrapIfNeeded = () => {
        const cycle = cycleWidth();
        if (cycle > 0 && track.scrollLeft >= cycle) track.scrollLeft -= cycle;
      };
  
      prev?.addEventListener("click", () => {
        if (track.scrollLeft <= 2) track.scrollLeft += cycleWidth();
        track.scrollBy({ left: -step(), behavior: "smooth" });
      });
      next?.addEventListener("click", () => track.scrollBy({ left: step(), behavior: "smooth" }));

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const speed = 0.6;
      window.setInterval(() => {
        track.scrollLeft += speed;
        wrapIfNeeded();
      }, 24);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initSiteSettings();
  initHeader();
  initMobileNav();
  markActiveNav();
  initScrollFadeIn();
  initPartnerSlider();
  initFixedSocialLinks();
  initBackToTop();
});
