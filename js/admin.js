const ADMIN_PASSWORD_KEY = "admin_password";
const DEFAULT_PASSWORD = "jungang2026";
const NEWS_REPORT_CATEGORIES = ["상권분석", "창업정보", "투자전략", "부동산뉴스"];

const ADMIN_SITE_DEFAULTS = {
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
  sms_notify_url: "/api/aligo-sms",
  registration_no: "제44133-2015-04204호"
};

const ADMIN_SAMPLE_PROPERTIES = [
  { id: 1, title: "두정역 인근 상가점포", province: "충청남도", city: "천안시 서북구", area: "두정동", address_detail: "", address: "충청남도 천안시 서북구 두정동", property_type: "상가점포", category: "음식점", deal_type: "월세", price_info: "보증금 3,000/월 150", maintenance_fee: "확인필요", size_m2: 45, area_basis: "전용면적", floor: "1층", total_floor: "확인필요", direction: "확인필요", available_date: "즉시", parking: "인근 주차장", building_use: "제2종 근린생활시설", violation_status: "확인필요", transaction_status: "거래가능", verified_date: "", tags: ["역세권", "먹자골목"], is_featured: true, is_active: true },
  { id: 2, title: "두정 먹자골목 카페 자리", province: "충청남도", city: "천안시 서북구", area: "두정동", address_detail: "", address: "충청남도 천안시 서북구 두정동", property_type: "상가점포", category: "카페", deal_type: "매매", price_info: "권리금 포함 5,500만", maintenance_fee: "확인필요", size_m2: 33, area_basis: "전용면적", floor: "1층", total_floor: "확인필요", direction: "확인필요", available_date: "협의", parking: "확인필요", building_use: "제2종 근린생활시설", violation_status: "확인필요", transaction_status: "거래가능", verified_date: "", tags: ["먹자골목", "유동인구"], is_featured: true, is_active: true }
];

function read(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    localStorage.removeItem(key);
    return [];
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getProperties() {
  ensurePropertySeed();
  return read("properties");
}

function setProperties(properties) {
  write("properties", properties);
}

function getNewsReports() {
  return read("news_reports");
}

function setNewsReports(reports) {
  write("news_reports", reports);
}

function ensurePropertySeed() {
  if (!localStorage.getItem("properties")) {
    setProperties(ADMIN_SAMPLE_PROPERTIES);
  }
}

function requireAuth() {
  if (localStorage.getItem("admin_auth") === "true") return;
  const gate = document.createElement("div");
  gate.className = "login-gate open";
  gate.innerHTML = `
    <form class="login-box">
      <h2>관리자 로그인</h2>
      <p>비밀번호를 입력하세요.</p>
      <div class="field"><input type="password" name="password" required autofocus></div>
      <button class="btn btn-primary btn-full" type="submit">로그인</button>
    </form>
  `;
  document.body.appendChild(gate);
  gate.querySelector("form").addEventListener("submit", (event) => {
    event.preventDefault();
    const saved = localStorage.getItem(ADMIN_PASSWORD_KEY) || DEFAULT_PASSWORD;
    if (event.target.password.value === saved) {
      localStorage.setItem("admin_auth", "true");
      gate.remove();
    } else {
      alert("비밀번호가 올바르지 않습니다.");
    }
  });
}

function allInquiries() {
  return [
    ...read("general_inquiries").map((x) => ({ ...x, type: x.inquiry_type || "일반문의" })),
    ...read("consulting_requests").map((x) => ({ ...x, type: "창업컨설팅" })),
    ...read("investment_requests").map((x) => ({ ...x, type: "투자상담" })),
    ...read("property_inquiries").map((x) => ({ ...x, type: "매물알림" })),
    ...read("newsletter").map((x) => ({ ...x, type: "뉴스레터" }))
  ].sort((a, b) => String(b.submitted_at).localeCompare(String(a.submitted_at)));
}

function maskPhone(phone = "") {
  return phone.replace(/(\d{3})-?(\d{3,4})-?(\d{4})/, "$1-****-$3");
}

function renderDashboard() {
  const root = document.querySelector("[data-dashboard]");
  if (!root) return;
  const inquiries = allInquiries();
  const consulting = read("consulting_requests").length;
  const alerts = read("property_inquiries").length;
  const newsletter = read("newsletter").length;
  const newsReports = getNewsReports().length;
  root.innerHTML = [
    ["총 문의", inquiries.length],
    ["상담 신청", consulting],
    ["매물알림", alerts],
    ["뉴스레터", newsletter],
    ["뉴스·리포트", newsReports]
  ].map(([label, value]) => `<article class="card stat-card"><span>${label}</span><strong>${value}</strong></article>`).join("");
}

function renderInquiries() {
  const body = document.querySelector("[data-inquiry-body]");
  if (!body) return;
  const data = allInquiries();
  body.innerHTML = data.map((item, index) => `<tr><td>${index + 1}</td><td>${item.name || "-"}</td><td>${maskPhone(item.phone || "")}</td><td>${item.type}</td><td>${(item.submitted_at || "").slice(0, 10)}</td><td>${item.status || "new"}</td><td><button type="button" class="btn btn-secondary btn-sm" data-detail='${JSON.stringify(item).replaceAll("'", "&apos;")}'>상세</button></td></tr>`).join("") || `<tr><td colspan="7">아직 문의가 없습니다.</td></tr>`;
}

function formatDetailDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR");
}

function renderInquiryDetail(item) {
  const detail = document.querySelector("[data-inquiry-detail]");
  const modal = document.querySelector("[data-inquiry-modal]");
  if (!detail || !modal) {
    alert(JSON.stringify(item, null, 2));
    return;
  }
  const rows = [
    ["이름", item.name],
    ["연락처", item.phone],
    ["상담유형", item.type || item.inquiry_type],
    ["접수일시", formatDetailDate(item.submitted_at)],
    ["이메일", item.email],
    ["보유자산규모", item.asset_size],
    ["월 목표수익", item.monthly_target],
    ["희망날짜", item.preferred_date],
    ["희망시간", item.preferred_time],
    ["희망지역", item.preferred_area],
    ["희망업종", item.preferred_category],
    ["거래유형", item.deal_type],
    ["예산범위", item.budget],
    ["창업경험", item.startup_experience],
    ["희망아이템", item.preferred_item],
    ["개인정보동의", item.privacy_agree ? "동의" : "-"],
    ["문의내용", item.inquiry, "full"]
  ].filter(([, value]) => value !== undefined && value !== "");
  detail.innerHTML = rows.map(([label, value, full]) => `
    <div class="admin-detail-item ${full ? "full" : ""}">
      <div class="admin-detail-label">${label}</div>
      <div class="admin-detail-value">${value || "-"}</div>
    </div>
  `).join("");
  modal.hidden = false;
}

function closeAdminModal() {
  document.querySelectorAll(".admin-modal").forEach((modal) => {
    modal.hidden = true;
  });
}

function exportCSV() {
  const rows = allInquiries();
  const header = ["name", "phone", "type", "submitted_at", "inquiry"];
  const csv = [header.join(","), ...rows.map((row) => header.map((key) => `"${String(row[key] || "").replaceAll('"', '""')}"`).join(","))].join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "jungang-inquiries.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

function renderPropertyTable() {
  const body = document.querySelector("[data-properties-body]");
  if (!body) return;
  const props = getProperties();
  body.innerHTML = props.map((p, i) => `
    <tr>
      <td>${p.title || "-"}</td>
      <td>${p.address || p.area || "-"}<br><small>${p.property_type || "상가"} · ${p.category || "-"}</small></td>
      <td>${p.deal_type || "-"}</td>
      <td>${p.price_info || "-"}</td>
      <td>${p.verified_date || "-"}<br><small>대장 ${p.building_register_checked_at || "-"}</small></td>
      <td>${p.transaction_status || "거래가능"}</td>
      <td>${p.is_featured ? "추천" : "-"}</td>
      <td class="admin-actions">
        <button type="button" class="btn btn-secondary btn-sm" data-edit="${i}">수정</button>
        <button type="button" class="btn btn-secondary btn-sm" data-delete="${i}">삭제</button>
      </td>
    </tr>
  `).join("") || `<tr><td colspan="8">아직 등록된 매물이 없습니다.</td></tr>`;
}

function setPropertyStatus(message, type = "error") {
  const status = document.querySelector("[data-property-status]");
  if (!status) {
    if (type === "error") alert(message);
    return;
  }
  status.textContent = message;
  status.className = `admin-form-status visible ${type}`;
  status.scrollIntoView({ behavior: "smooth", block: "center" });
}

function validatePropertyForm(form) {
  const required = [...form.querySelectorAll("[required]")];
  const missing = required.find((node) => {
    if (node.type === "checkbox") return !node.checked;
    return !String(node.value || "").trim();
  });
  if (missing) {
    const label = missing.closest("label")?.textContent?.trim() || missing.closest(".field")?.querySelector("label")?.textContent?.trim() || "필수 항목";
    missing.focus?.();
    setPropertyStatus(`${label} 항목을 확인해 주세요.`, "error");
    return false;
  }
  return true;
}

function compressImage(file, maxWidth = 1200, quality = 0.78) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function setSelectValue(field, value) {
  if (!field) return;
  const exists = [...field.options].some((option) => option.value === value || option.textContent === value);
  if (value && !exists) field.add(new Option(value, value));
  field.value = value || field.value;
}

function setFormMode(mode, index = "") {
  const form = document.querySelector("[data-property-form]");
  const submit = document.querySelector("[data-property-submit]");
  const cancel = document.querySelector("[data-property-cancel]");
  const title = document.querySelector("[data-property-form-title]");
  if (!form) return;
  form.dataset.mode = mode;
  form.dataset.editIndex = String(index);
  if (submit) submit.textContent = mode === "edit" ? "매물 수정 저장" : "매물 추가";
  if (cancel) cancel.hidden = mode !== "edit";
  if (title) title.textContent = mode === "edit" ? "매물 수정" : "매물 등록";
}

function resetPropertyForm() {
  const form = document.querySelector("[data-property-form]");
  if (!form) return;
  form.reset();
  setFormMode("create");
  const preview = document.querySelector("[data-photo-preview]");
  if (preview) {
    preview.removeAttribute("src");
    preview.classList.remove("visible");
  }
  setDefaultDates(form);
}

function populatePropertyForm(index) {
  const form = document.querySelector("[data-property-form]");
  if (!form) return;
  const property = getProperties()[index];
  if (!property) return;
  form.reset();
  Object.entries(property).forEach(([key, value]) => {
    const field = form.elements[key];
    if (!field || key === "photo_file") return;
    if (field.type === "checkbox") {
      field.checked = Boolean(value);
    } else if (field.tagName === "SELECT") {
      setSelectValue(field, value);
    } else if (Array.isArray(value)) {
      field.value = value.join(", ");
    } else {
      field.value = value ?? "";
    }
  });
  form.querySelectorAll(".compliance-box input[type='checkbox']").forEach((checkbox) => {
    checkbox.checked = true;
  });
  const preview = document.querySelector("[data-photo-preview]");
  if (preview) {
    if (property.photo_url) {
      preview.src = property.photo_url;
      preview.classList.add("visible");
    } else {
      preview.removeAttribute("src");
      preview.classList.remove("visible");
    }
  }
  setFormMode("edit", index);
  setPropertyStatus("수정할 내용을 변경한 뒤 '매물 수정 저장'을 눌러주세요.", "success");
}

async function saveProperty(form) {
  try {
    if (!validatePropertyForm(form)) return;
    const data = Object.fromEntries(new FormData(form));
    const file = form.elements.photo_file?.files?.[0];
    if (file && file.size > 12 * 1024 * 1024) {
      setPropertyStatus("사진은 12MB 이하로 등록해 주세요.", "error");
      return;
    }

    const props = getProperties();
    const mode = form.dataset.mode || "create";
    const editIndex = Number(form.dataset.editIndex);
    const previous = mode === "edit" ? props[editIndex] || {} : {};

    data.photo_url = file ? await compressImage(file) : previous.photo_url || "";
    delete data.photo_file;
    data.id = previous.id || Date.now();
    data.address = [data.province, data.city, data.area, data.address_detail].filter(Boolean).join(" ");
    data.verified_date = data.verified_date || new Date().toISOString().slice(0, 10);
    data.transaction_status = data.transaction_status || "거래가능";
    data.size_m2 = Number(data.size_m2 || 0);
    data.tags = (data.tags || "").split(",").map((x) => x.trim()).filter(Boolean);
    data.is_active = true;
    data.is_featured = Boolean(data.is_featured);
    data.compliance_checked_at = new Date().toISOString();
    data.broker_name = "중앙부동산공인중개사사무소";
    data.broker_registration_no = "제44133-2015-04204호";
    data.broker_phone = "041-552-0014";

    if (mode === "edit" && Number.isInteger(editIndex) && props[editIndex]) {
      props[editIndex] = data;
    } else {
      props.push(data);
    }
    setProperties(props);
    renderPropertyTable();
    resetPropertyForm();
    setPropertyStatus(mode === "edit" ? "매물이 수정되었습니다." : "매물이 정상 등록되었습니다. 상가매물 페이지에 바로 반영됩니다.", "success");
  } catch (error) {
    setPropertyStatus("매물 저장 중 오류가 발생했습니다. 사진 용량을 줄이거나 필수 항목을 다시 확인해 주세요.", "error");
  }
}

function setNewsReportStatus(message, type = "error") {
  const status = document.querySelector("[data-news-report-status]");
  if (!status) {
    if (type === "error") alert(message);
    return;
  }
  status.textContent = message;
  status.className = `admin-form-status visible ${type}`;
  status.scrollIntoView({ behavior: "smooth", block: "center" });
}

function renderNewsReportTable() {
  const body = document.querySelector("[data-news-reports-body]");
  if (!body) return;
  const reports = getNewsReports();
  body.innerHTML = reports.map((report, index) => `
    <tr>
      <td>${report.title || "-"}</td>
      <td>${report.category || "-"}</td>
      <td>${report.date || "-"}</td>
      <td>${report.views || 0}</td>
      <td class="admin-actions">
        <button type="button" class="btn btn-secondary btn-sm" data-news-report-edit="${index}">수정</button>
        <button type="button" class="btn btn-secondary btn-sm" data-news-report-delete="${index}">삭제</button>
      </td>
    </tr>
  `).join("") || `<tr><td colspan="5">아직 등록한 뉴스·리포트가 없습니다.</td></tr>`;
}

function setNewsReportFormMode(mode, index = "") {
  const form = document.querySelector("[data-news-report-form]");
  const submit = document.querySelector("[data-news-report-submit]");
  const cancel = document.querySelector("[data-news-report-cancel]");
  const title = document.querySelector("[data-news-report-form-title]");
  if (!form) return;
  form.dataset.mode = mode;
  form.dataset.editIndex = String(index);
  if (submit) submit.textContent = mode === "edit" ? "뉴스·리포트 수정 저장" : "뉴스·리포트 추가";
  if (cancel) cancel.hidden = mode !== "edit";
  if (title) title.textContent = mode === "edit" ? "뉴스·리포트 수정" : "뉴스·리포트 등록";
}

function resetNewsReportForm() {
  const form = document.querySelector("[data-news-report-form]");
  if (!form) return;
  form.reset();
  if (form.elements.date) form.elements.date.value = new Date().toISOString().slice(0, 10);
  if (form.elements.views) form.elements.views.value = 0;
  setNewsReportFormMode("create");
}

function reportBodyToText(body = []) {
  return body.map(([, content]) => Array.isArray(content) ? content.join("\n") : content).join("\n\n");
}

function textToReportBody(text = "") {
  const paragraphs = String(text).split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
  return paragraphs.map((content, index) => [index === 0 ? "핵심 내용" : "상세 내용", content]);
}

function populateNewsReportForm(index) {
  const form = document.querySelector("[data-news-report-form]");
  if (!form) return;
  const report = getNewsReports()[index];
  if (!report) return;
  form.reset();
  ["title", "subtitle", "category", "point", "area", "check", "date", "views", "image", "heading", "lead"].forEach((key) => {
    if (form.elements[key]) form.elements[key].value = report[key] ?? "";
  });
  if (form.elements.body_text) form.elements.body_text.value = reportBodyToText(report.body);
  setNewsReportFormMode("edit", index);
  setNewsReportStatus("수정할 내용을 반영한 뒤 '뉴스·리포트 수정 저장'을 눌러주세요.", "success");
}

function saveNewsReport(form) {
  const data = Object.fromEntries(new FormData(form));
  const required = ["title", "subtitle", "category", "date", "image", "heading", "lead", "body_text"];
  const missing = required.find((key) => !String(data[key] || "").trim());
  if (missing) {
    form.elements[missing]?.focus?.();
    setNewsReportStatus("필수 항목을 확인해 주세요.", "error");
    return;
  }
  if (!NEWS_REPORT_CATEGORIES.includes(data.category)) {
    setNewsReportStatus("카테고리는 상권분석, 창업정보, 투자전략, 부동산뉴스 중 하나만 선택할 수 있습니다.", "error");
    return;
  }

  const reports = getNewsReports();
  const mode = form.dataset.mode || "create";
  const editIndex = Number(form.dataset.editIndex);
  const previous = mode === "edit" ? reports[editIndex] || {} : {};
  const report = {
    id: previous.id || `admin-report-${Date.now()}`,
    title: data.title.trim(),
    subtitle: data.subtitle.trim(),
    category: data.category,
    point: (data.point || data.category).trim(),
    heading: data.heading.trim(),
    lead: data.lead.trim(),
    area: (data.area || "-").trim(),
    check: (data.check || "-").trim(),
    date: data.date,
    views: Number(data.views || 0),
    image: data.image.trim(),
    body: textToReportBody(data.body_text)
  };

  if (mode === "edit" && Number.isInteger(editIndex) && reports[editIndex]) {
    reports[editIndex] = report;
  } else {
    reports.unshift(report);
  }
  setNewsReports(reports);
  renderNewsReportTable();
  resetNewsReportForm();
  setNewsReportStatus("뉴스·리포트가 저장되었습니다. 뉴스 페이지의 최신 상권 리포트 목록에 자동 반영됩니다.", "success");
}

function bindNewsReportForm() {
  const form = document.querySelector("[data-news-report-form]");
  if (!form) return;
  resetNewsReportForm();
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    saveNewsReport(form);
  });
  document.querySelector("[data-news-report-cancel]")?.addEventListener("click", resetNewsReportForm);
}

function initSettingsForm() {
  const form = document.querySelector("[data-settings-form]");
  if (!form) return;
  const settings = { ...ADMIN_SITE_DEFAULTS, ...JSON.parse(localStorage.getItem("site_settings") || "{}") };
  ["sns_blog", "sns_naver_profile", "sns_youtube", "sns_instagram"].forEach((key) => {
    settings[key] = ADMIN_SITE_DEFAULTS[key];
  });
  Object.entries(settings).forEach(([key, value]) => {
    if (form.elements[key]) form.elements[key].value = value;
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    localStorage.setItem("site_settings", JSON.stringify(Object.fromEntries(new FormData(form))));
    alert("설정이 저장되었습니다. 일반 페이지를 Ctrl+F5로 새로고침하면 SNS 링크가 반영됩니다.");
  });
}

function setDefaultDates(form) {
  const today = new Date().toISOString().slice(0, 10);
  ["verified_date", "building_register_checked_at", "land_register_checked_at"].forEach((name) => {
    if (form?.elements[name] && !form.elements[name].value) form.elements[name].value = today;
  });
}

function bindPropertyForm() {
  const form = document.querySelector("[data-property-form]");
  if (!form) return;
  setFormMode("create");
  setDefaultDates(form);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    saveProperty(form);
  });
  document.querySelector("[data-property-cancel]")?.addEventListener("click", resetPropertyForm);
  form.elements.photo_file?.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    const preview = document.querySelector("[data-photo-preview]");
    if (!file || !preview) return;
    if (file.size > 12 * 1024 * 1024) {
      setPropertyStatus("사진은 12MB 이하로 등록해 주세요.", "error");
      event.target.value = "";
      preview.classList.remove("visible");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      preview.src = reader.result;
      preview.classList.add("visible");
    };
    reader.readAsDataURL(file);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  requireAuth();
  ensurePropertySeed();
  renderDashboard();
  renderInquiries();
  renderPropertyTable();
  renderNewsReportTable();
  initSettingsForm();
  bindPropertyForm();
  bindNewsReportForm();
  document.querySelector("[data-export]")?.addEventListener("click", exportCSV);

  document.addEventListener("click", (event) => {
    const detail = event.target.closest("[data-detail]");
    if (detail) renderInquiryDetail(JSON.parse(detail.dataset.detail));

    if (event.target.closest("[data-modal-close]")) closeAdminModal();

    const edit = event.target.closest("[data-edit]");
    if (edit) populatePropertyForm(Number(edit.dataset.edit));

    const del = event.target.closest("[data-delete]");
    if (del && confirm("이 매물을 삭제할까요?")) {
      const props = getProperties();
      props.splice(Number(del.dataset.delete), 1);
      setProperties(props);
      renderPropertyTable();
      resetPropertyForm();
      setPropertyStatus("매물이 삭제되었습니다.", "success");
    }

    const reportEdit = event.target.closest("[data-news-report-edit]");
    if (reportEdit) populateNewsReportForm(Number(reportEdit.dataset.newsReportEdit));

    const reportDelete = event.target.closest("[data-news-report-delete]");
    if (reportDelete && confirm("이 뉴스·리포트를 삭제할까요?")) {
      const reports = getNewsReports();
      reports.splice(Number(reportDelete.dataset.newsReportDelete), 1);
      setNewsReports(reports);
      renderNewsReportTable();
      resetNewsReportForm();
      setNewsReportStatus("뉴스·리포트가 삭제되었습니다.", "success");
    }

    const clear = event.target.closest("[data-clear-properties]");
    if (clear && confirm("등록된 매물을 모두 삭제할까요? 이 작업은 되돌릴 수 없습니다.")) {
      setProperties([]);
      renderPropertyTable();
      resetPropertyForm();
      setPropertyStatus("모든 매물이 삭제되었습니다.", "success");
    }

    const clearReports = event.target.closest("[data-clear-news-reports]");
    if (clearReports && confirm("등록한 뉴스·리포트를 모두 삭제할까요? 이 작업은 되돌릴 수 없습니다.")) {
      setNewsReports([]);
      renderNewsReportTable();
      resetNewsReportForm();
      setNewsReportStatus("모든 뉴스·리포트가 삭제되었습니다.", "success");
    }
  });
});
