(() => {
  const readAdminReports = () => {
    try {
      const value = JSON.parse(localStorage.getItem("news_reports") || "[]");
      return Array.isArray(value) ? value : [];
    } catch {
      localStorage.removeItem("news_reports");
      return [];
    }
  };

  const escapeHTML = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[char]);

  const adminReports = Object.fromEntries(readAdminReports().map((item) => [item.id, item]));
  const reports = Object.entries({ ...(window.NEWS_REPORTS || {}), ...adminReports });
  const grid = document.querySelector("[data-news-grid]");

  if (grid && reports.length) {
    grid.innerHTML = reports.map(([id, item]) => `
      <a class="card news-card" data-category="${escapeHTML(item.category)}" href="news-detail.html?id=${encodeURIComponent(id)}">
        <img class="news-thumb" src="${escapeHTML(item.image)}" alt="${escapeHTML(item.title)}">
        <div class="news-body">
          <span class="badge">${escapeHTML(item.category)}</span>
          <h3>${escapeHTML(item.title)}</h3>
          <p>${escapeHTML(item.subtitle)}</p>
          <div class="news-meta">${escapeHTML(item.date)} · 조회 ${escapeHTML(item.views || 0)}</div>
          <span class="read-more">상세 리포트 보기</span>
        </div>
      </a>
    `).join("");
  }

  const tabs = document.querySelectorAll(".news-tabs .tab");
  const cards = document.querySelectorAll(".news-card");
  const empty = document.querySelector(".empty-news");

  if (!tabs.length || !cards.length) return;

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const filter = tab.dataset.filter || "all";
      let visibleCount = 0;

      tabs.forEach((item) => item.classList.toggle("active", item === tab));

      cards.forEach((card) => {
        const matches = filter === "all" || card.dataset.category === filter;
        card.hidden = !matches;
        if (matches) visibleCount += 1;
      });

      if (empty) empty.hidden = visibleCount > 0;
    });
  });
})();
