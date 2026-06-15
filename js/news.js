(() => {
  const reports = Object.entries(window.NEWS_REPORTS || {});
  const grid = document.querySelector("[data-news-grid]");

  if (grid && reports.length) {
    grid.innerHTML = reports.map(([id, item]) => `
      <a class="card news-card" data-category="${item.category}" href="news-detail.html?id=${id}">
        <img class="news-thumb" src="${item.image}" alt="${item.title}">
        <div class="news-body">
          <span class="badge">${item.category}</span>
          <h3>${item.title}</h3>
          <p>${item.subtitle}</p>
          <div class="news-meta">${item.date} · 조회 ${item.views}</div>
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
