const SAMPLE_PROPERTIES = [
  { id: 1, title: "두정역 인근 상가점포", area: "두정동", address: "충청남도 천안시 서북구 두정동", property_type: "상가점포", category: "음식점", deal_type: "월세", price_info: "보증금 3,000/월 150", maintenance_fee: "확인필요", size_m2: 45, area_basis: "전용면적", floor: "1층", total_floor: "확인필요", building_use: "제2종 근린생활시설", transaction_status: "거래가능", verified_date: "", tags: ["역세권", "먹자골목"], is_featured: true, is_active: true },
  { id: 2, title: "두정 먹자골목 카페 자리", area: "두정동", address: "충청남도 천안시 서북구 두정동", property_type: "상가점포", category: "카페", deal_type: "매매", price_info: "권리금 포함 5,500만", maintenance_fee: "확인필요", size_m2: 33, area_basis: "전용면적", floor: "1층", total_floor: "확인필요", building_use: "제2종 근린생활시설", transaction_status: "거래가능", verified_date: "", tags: ["먹자골목", "유동인구"], is_featured: true, is_active: true },
  { id: 3, title: "불당동 음식점 점포", area: "불당동", address: "충청남도 천안시 서북구 불당동", property_type: "상가점포", category: "음식점", deal_type: "월세", price_info: "보증금 5,000/월 200", maintenance_fee: "확인필요", size_m2: 66, area_basis: "전용면적", floor: "1층", total_floor: "확인필요", building_use: "제2종 근린생활시설", transaction_status: "거래가능", verified_date: "", tags: ["대형상권"], is_featured: true, is_active: true }
];

function safeRead(key, fallback = []) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    return value ?? fallback;
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
}

function loadProperties() {
  const stored = safeRead("properties", null);
  if (Array.isArray(stored)) return stored.filter((item) => item.is_active !== false);
  localStorage.setItem("properties", JSON.stringify(SAMPLE_PROPERTIES));
  return SAMPLE_PROPERTIES;
}

function renderProperties(data) {
  const grid = document.querySelector("[data-property-grid]");
  if (!grid) return;
  const wished = safeRead("wishlist", []);
  if (!data.length) {
    grid.innerHTML = `<div class="card property-body"><h3>조건에 맞는 매물이 없습니다.</h3><p>필터를 초기화하거나 관리자에서 매물을 등록해 주세요.</p></div>`;
    return;
  }
  grid.innerHTML = data.map((item) => `
    <article class="card property-card fade-in">
      <div class="property-thumb">
        ${item.photo_url ? `<img src="${item.photo_url}" alt="${item.title || "매물"} 사진">` : "<span>🏪</span>"}
        <button type="button" class="wish-btn" data-wish="${item.id}" aria-label="찜하기">${wished.includes(item.id) ? "♥" : "♡"}</button>
      </div>
      <div class="property-body">
        <div class="property-meta">📍 ${item.area || "지역"} · ${item.property_type || "상가"} · ${item.category || "업종"}</div>
        <h3>${item.title || "매물명 미입력"}</h3>
        <div class="property-price">${item.price_info || "가격 확인필요"}</div>
        <p>📐 ${item.area_basis || "면적"} ${item.size_m2 || "-"}㎡ · 🏢 ${item.floor || "-"} / ${item.total_floor || "전체층 확인필요"} · 관리비 ${item.maintenance_fee || "확인필요"}</p>
        <p class="property-address">${item.address || "주소 확인필요"}</p>
        <p class="property-address">상태 ${item.transaction_status || "거래가능"} · 확인일 ${item.verified_date || "확인필요"} · 용도 ${item.building_use || "확인필요"}</p>
        <p>${(item.tags || []).map((tag) => `<span class="tag">${tag}</span>`).join(" ")}</p>
        <p class="property-broker">중개: ${item.broker_name || "중앙부동산공인중개사사무소"} · ${item.broker_registration_no || "제44133-2015-04204호"}</p>
        <a class="btn btn-primary btn-full" href="contact.html">상담 문의하기</a>
      </div>
    </article>
  `).join("");
  if (window.initScrollFadeIn) window.initScrollFadeIn();
}

function applyFilter() {
  const query = document.querySelector("[data-search]")?.value.trim() || "";
  const category = document.querySelector("[data-category]")?.value || "";
  const deal = document.querySelector("[data-deal]")?.value || "";
  const data = loadProperties().filter((item) => {
    const text = `${item.title || ""} ${item.area || ""} ${item.address || ""} ${item.category || ""} ${item.property_type || ""} ${(item.tags || []).join(" ")}`;
    return (!query || text.includes(query)) && (!category || item.category === category) && (!deal || item.deal_type === deal);
  });
  renderProperties(data);
}

function initPropertyPage() {
  if (!document.querySelector("[data-property-grid]")) return;
  applyFilter();
  document.querySelectorAll("[data-search], [data-category], [data-deal]").forEach((node) => node.addEventListener("input", applyFilter));
  window.addEventListener("storage", (event) => {
    if (event.key === "properties") applyFilter();
  });
  document.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-wish]");
    if (!btn) return;
    const id = Number(btn.dataset.wish);
    const wished = safeRead("wishlist", []);
    const next = wished.includes(id) ? wished.filter((item) => item !== id) : [...wished, id];
    localStorage.setItem("wishlist", JSON.stringify(next));
    btn.textContent = next.includes(id) ? "♥" : "♡";
  });
}

document.addEventListener("DOMContentLoaded", initPropertyPage);
