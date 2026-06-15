(() => {
  const tabs = document.querySelectorAll(".faq-tabs .tab");
  const items = document.querySelectorAll(".faq-item");
  const empty = document.querySelector(".empty-faq");

  if (!tabs.length || !items.length) return;

  const openFirstVisible = () => {
    let opened = false;
    items.forEach((item) => {
      const shouldOpen = !opened && !item.hidden;
      item.classList.toggle("open", shouldOpen);
      if (shouldOpen) opened = true;
    });
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const filter = tab.dataset.filter || "all";
      let visibleCount = 0;

      tabs.forEach((item) => item.classList.toggle("active", item === tab));

      items.forEach((item) => {
        const matches = filter === "all" || item.dataset.category === filter;
        item.hidden = !matches;
        if (matches) visibleCount += 1;
      });

      if (empty) empty.hidden = visibleCount > 0;
      openFirstVisible();
    });
  });

  items.forEach((item) => {
    const question = item.querySelector(".faq-question");
    if (!question) return;

    question.addEventListener("click", () => {
      if (item.hidden) return;
      item.classList.toggle("open");
    });
  });
})();
