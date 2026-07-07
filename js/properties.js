const propertyState = {
  category: "전체",
  sort: "latest",
  query: "",
  properties: []
};

const PROPERTY_CATEGORY_ORDER = [
  "상가임대",
  "상가주택매매",
  "상가건물매매",
  "토지매매",
  "원룸건물매매",
  "공장·창고",
  "기타"
];

const PROPERTY_CATEGORY_IMAGES = {
  "상가임대": {
    src: "images/category/store-rent.jpg",
    alt: "상가임대 매물"
  },
  "상가주택매매": {
    src: "images/category/shop-house.jpg",
    alt: "상가주택매매 매물"
  },
  "상가건물매매": {
    src: "images/category/commercial-building.jpg",
    alt: "상가건물매매 매물"
  },
  "토지매매": {
    src: "images/category/land-sale.jpg",
    alt: "토지매매 매물"
  },
  "원룸건물매매": {
    src: "images/category/studio-building.jpg",
    alt: "원룸건물매매 매물"
  },
  "공장·창고": {
    src: "images/category/warehouse.jpg",
    alt: "공장·창고 매물"
  },
  "기타": {
    src: "images/category/city-investment.jpg",
    alt: "기타 매물"
  }
};

function formatArea(item) {
  return item.exclusive_area || item.contract_area || "-";
}

function priceLabel(item) {
  if (item.price_info) return item.price_info;
  if (item.deal_type === "매매") return item.sale_price;
  if (item.sale_price && item.sale_price !== "-") return item.sale_price;
  return `보증금 ${item.deposit} / 월세 ${item.monthly_rent}`;
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function cleanDescriptionLine(line) {
  return String(line || "")
    .replace(/#{1,6}/g, "")
    .replace(/\*\*/g, "")
    .replace(/^[\s*ㆍ•\-✓✔]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatPropertyDescription(text) {
  const normalized = String(text || "")
    .replace(/\r/g, "")
    .replace(/#{1,6}\s*/g, "\n")
    .replace(/[✓✔]/g, "\n")
    .replace(/\s\*\s*(?=[^*:\n]{1,28}\s*[:：])/g, "\n")
    .replace(/\s{2,}/g, " ")
    .trim();

  const lines = normalized
    .split(/\n+/)
    .map(cleanDescriptionLine)
    .filter(Boolean);

  if (!lines.length) return "<p>-</p>";

  const facts = [];
  const paragraphs = [];

  lines.forEach((line) => {
    const match = line.match(/^([^:：]{1,18})\s*[:：]\s*(.+)$/);
    if (match) {
      facts.push([match[1].trim(), match[2].trim()]);
    } else {
      paragraphs.push(line);
    }
  });

  const paragraphHTML = paragraphs.map((line) => `<p>${escapeHTML(line)}</p>`).join("");
  const factHTML = facts.length
    ? `<dl class="property-description-list">${facts.map(([label, value]) => `
        <div><dt>${escapeHTML(label)}</dt><dd>${escapeHTML(value)}</dd></div>
      `).join("")}</dl>`
    : "";

  return `${paragraphHTML}${factHTML}`;
}

function extractMapURL(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const srcMatch = raw.match(/\ssrc=["']([^"']+)["']/i);
  const url = srcMatch ? srcMatch[1] : raw;
  return /^https?:\/\//i.test(url) ? url : "";
}

function renderPropertyMap(item) {
  const map = document.querySelector("[data-modal-map]");
  if (!map) return;
  const configuredURL = extractMapURL(item.map_url);
  const searchURL = `https://map.naver.com/p/search/${encodeURIComponent(item.address || item.region || item.title || "")}`;

  if (configuredURL && /<iframe|\bembed\b/i.test(String(item.map_url || ""))) {
    map.innerHTML = `
      <iframe src="${escapeHTML(configuredURL)}" title="${escapeHTML(item.title)} 지도" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
      <a href="${escapeHTML(configuredURL)}" target="_blank" rel="noopener">지도 크게 보기</a>
    `;
    return;
  }

  const linkURL = configuredURL || searchURL;
  map.innerHTML = `
    <div>
      <strong>${escapeHTML(item.region || "매물 위치")}</strong>
      <span>${escapeHTML(item.address || "소재지 기준으로 지도를 확인하세요.")}</span>
      <a href="${escapeHTML(linkURL)}" target="_blank" rel="noopener">지도에서 위치 확인</a>
    </div>
  `;
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

  const categories = [...PROPERTY_CATEGORY_ORDER, ...PROPERTY_CATEGORY_ORDER];
  rail.innerHTML = categories.map((category, index) => {
    const active = propertyState.category === category ? " active" : "";
    const visual = PROPERTY_CATEGORY_IMAGES[category] || PROPERTY_CATEGORY_IMAGES["기타"];
    const duplicateAttrs = index >= PROPERTY_CATEGORY_ORDER.length ? ' aria-hidden="true" tabindex="-1"' : "";
    return `
      <button class="property-category-card${active}" type="button" data-property-category="${category}"${duplicateAttrs}>
        <img src="${visual.src}" alt="${visual.alt}">
        <span>${category}</span>
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
  const item = propertyState.properties.find((property) => String(property.id) === String(id));
  const modal = document.querySelector("[data-property-modal]");
  if (!item || !modal) return;

  modal.querySelector("[data-modal-image]").src = item.image_url;
  modal.querySelector("[data-modal-image]").alt = item.title;
  modal.querySelector("[data-modal-title]").textContent = item.title;
  modal.querySelector("[data-modal-price]").textContent = priceLabel(item);
  modal.querySelector("[data-modal-badges]").innerHTML = item.badges.map((badge) => `<span class="property-badge">${badge}</span>`).join("");
  modal.querySelector("[data-modal-table]").innerHTML = detailRows(item).map(([label, value]) => `
    <div class="property-detail-row">
      <dt>${label}</dt>
      <dd>${value || "-"}</dd>
    </div>
  `).join("");
  modal.querySelector("[data-modal-description]").innerHTML = formatPropertyDescription(item.description);
  modal.querySelector("[data-modal-comment]").textContent = item.broker_comment;
  renderPropertyMap(item);
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
  if (requestedCategory && PROPERTY_CATEGORY_ORDER.includes(requestedCategory)) {
    propertyState.category = requestedCategory;
  }
  renderCategoryRail();
  renderPropertyCards();
  bindPropertyEvents();
}

document.addEventListener("DOMContentLoaded", initPropertyPage);
