const propertyState = {
  category: "전체",
  sort: "latest",
  query: "",
  properties: []
};

function formatArea(item) {
  return item.exclusive_area || item.contract_area || "-";
}

function priceLabel(item) {
  if (item.deal_type === "매매") return item.sale_price;
  if (item.sale_price && item.sale_price !== "-") return item.sale_price;
  return `보증금 ${item.deposit} / 월세 ${item.monthly_rent}`;
}

function getFilteredProperties() {
  const query = propertyState.query.trim();
  const filtered = propertyState.properties.filter((item) => {
    const categoryMatched = propertyState.category === "전체" || item.category === propertyState.category;
    const text = `${item.title} ${item.region} ${item.address} ${item.category} ${item.deal_type} ${item.recommended_business}`;
    const queryMatched = !query || text.includes(query);
    return categoryMatched && queryMatched;
  });

  return filtered.sort((a, b) => {
    if (propertyState.sort === "featured") {
      return Number(b.is_featured) - Number(a.is_featured) || new Date(b.created_at) - new Date(a.created_at);
    }
    if (propertyState.sort === "price") return Number(a.price_sort || 0) - Number(b.price_sort || 0);
    if (propertyState.sort === "area") return Number(b.area_sort || 0) - Number(a.area_sort || 0);
    return new Date(b.created_at) - new Date(a.created_at);
  });
}

function renderCategoryRail() {
  const rail = document.querySelector("[data-property-categories]");
  if (!rail) return;

  const categories = ["전체", ...window.PropertyService.categories];
  rail.innerHTML = categories.map((category) => {
    const count = category === "전체"
      ? propertyState.properties.length
      : propertyState.properties.filter((item) => item.category === category).length;
    const active = propertyState.category === category ? " active" : "";
    return `
      <button class="property-category-card${active}" type="button" data-property-category="${category}">
        <span>${category}</span>
        <em>${count}개 매물</em>
      </button>
    `;
  }).join("");
}

function renderPropertyCards() {
  const grid = document.querySelector("[data-property-grid]");
  const count = document.querySelector("[data-property-count]");
  if (!grid) return;

  const items = getFilteredProperties();
  if (count) count.textContent = `${items.length}개 매물`;

  if (!items.length) {
    grid.innerHTML = `
      <div class="property-empty card">
        <h3>조건에 맞는 매물이 없습니다.</h3>
        <p>카테고리나 검색어를 조정해 주세요. 원하는 조건은 매물 알림 신청으로 남겨주시면 확인 후 안내드리겠습니다.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = items.map((item) => `
    <article class="card property-card" data-property-id="${item.id}">
      <button class="property-card-button" type="button" data-open-property="${item.id}">
        <div class="property-thumb">
          <img src="${item.image_url}" alt="${item.title}">
          <div class="property-badges">
            ${item.badges.map((badge) => `<span class="property-badge">${badge}</span>`).join("")}
          </div>
        </div>
        <div class="property-body">
          <div class="property-meta">
            <span>${item.deal_type}</span>
            <span>${item.category}</span>
          </div>
          <strong class="property-price">${priceLabel(item)}</strong>
          <h3>${item.title}</h3>
          <p class="property-card-desc">${item.short_description}</p>
          <dl class="property-card-specs">
            <div><dt>지역</dt><dd>${item.region}</dd></div>
            <div><dt>면적</dt><dd>${formatArea(item)}</dd></div>
            <div><dt>층수</dt><dd>${item.floor} / ${item.total_floor}</dd></div>
          </dl>
        </div>
      </button>
    </article>
  `).join("");
}

function detailRows(item) {
  return [
    ["매물번호", item.property_no],
    ["거래유형", item.deal_type],
    ["카테고리", item.category],
    ["소재지", item.address],
    ["보증금", item.deposit],
    ["월세", item.monthly_rent],
    ["매매가", item.sale_price],
    ["권리금", item.premium],
    ["관리비", item.maintenance_fee],
    ["계약면적", item.contract_area],
    ["전용면적", item.exclusive_area],
    ["해당층 / 총층", `${item.floor} / ${item.total_floor}`],
    ["방향", item.direction],
    ["주차", item.parking],
    ["엘리베이터", item.elevator],
    ["입주가능일", item.move_in_date],
    ["사용승인일", item.approval_date],
    ["건축물용도", item.building_use],
    ["용도지역", item.zoning],
    ["현재업종", item.current_business],
    ["추천업종", item.recommended_business]
  ];
}

function openPropertyModal(id) {
  const item = propertyState.properties.find((property) => property.id === id);
  const modal = document.querySelector("[data-property-modal]");
  if (!item || !modal) return;

  modal.querySelector("[data-modal-image]").src = item.image_url;
  modal.querySelector("[data-modal-image]").alt = item.title;
  modal.querySelector("[data-modal-title]").textContent = item.title;
  modal.querySelector("[data-modal-price]").textContent = priceLabel(item);
  modal.querySelector("[data-modal-summary]").textContent = item.short_description;
  modal.querySelector("[data-modal-badges]").innerHTML = item.badges.map((badge) => `<span class="property-badge">${badge}</span>`).join("");
  modal.querySelector("[data-modal-table]").innerHTML = detailRows(item).map(([label, value]) => `
    <div class="property-detail-row">
      <dt>${label}</dt>
      <dd>${value || "-"}</dd>
    </div>
  `).join("");
  modal.querySelector("[data-modal-description]").textContent = item.description;
  modal.querySelector("[data-modal-comment]").textContent = item.broker_comment;
  modal.querySelector("[data-modal-map]").textContent = `${item.region} 지도 영역`;
  modal.hidden = false;
  document.body.classList.add("modal-open");
}

function closePropertyModal() {
  const modal = document.querySelector("[data-property-modal]");
  if (!modal) return;
  modal.hidden = true;
  document.body.classList.remove("modal-open");
}

function bindPropertyEvents() {
  document.addEventListener("click", (event) => {
    const category = event.target.closest("[data-property-category]");
    if (category) {
      propertyState.category = category.dataset.propertyCategory;
      renderCategoryRail();
      renderPropertyCards();
      return;
    }

    const open = event.target.closest("[data-open-property]");
    if (open) {
      openPropertyModal(open.dataset.openProperty);
      return;
    }

    if (event.target.closest("[data-close-property-modal]")) {
      closePropertyModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closePropertyModal();
  });

  document.querySelector("[data-property-sort]")?.addEventListener("change", (event) => {
    propertyState.sort = event.target.value;
    renderPropertyCards();
  });

  document.querySelector("[data-property-search]")?.addEventListener("input", (event) => {
    propertyState.query = event.target.value;
    renderPropertyCards();
  });
}

function initPropertyPage() {
  if (!window.PropertyService || !document.querySelector("[data-property-grid]")) return;
  propertyState.properties = window.PropertyService.getProperties();
  const requestedCategory = new URLSearchParams(window.location.search).get("category");
  if (requestedCategory && window.PropertyService.categories.includes(requestedCategory)) {
    propertyState.category = requestedCategory;
  }
  renderCategoryRail();
  renderPropertyCards();
  bindPropertyEvents();
}

document.addEventListener("DOMContentLoaded", initPropertyPage);
