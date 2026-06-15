const API_BASE = "";

function getFormSettings() {
  const defaults = typeof SITE_DEFAULTS === "object" ? SITE_DEFAULTS : {};
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem("site_settings") || "{}") };
  } catch {
    return { ...defaults };
  }
}

function formatSmsMessage(tableName, data) {
  const typeMap = {
    general_inquiries: data.inquiry_type || "일반문의",
    consulting_requests: "창업컨설팅",
    investment_requests: "투자상담",
    property_inquiries: "매물문의",
    newsletter: "뉴스레터"
  };
  const name = data.name || data.customer_name || "이름 미입력";
  const phone = data.phone || data.customer_phone || "연락처 미입력";
  const inquiry = data.inquiry || data.message || data.preferred_category || "";
  return `[중앙부동산 문의접수]\n유형: ${typeMap[tableName] || tableName}\n이름: ${name}\n연락처: ${phone}${inquiry ? `\n내용: ${String(inquiry).slice(0, 80)}` : ""}`;
}

async function notifySms(tableName, data) {
  const settings = getFormSettings();
  const webhookUrl = settings.sms_notify_url;
  const recipient = settings.sms_notify_phone || settings.phone_mobile || "010-4122-0321";
  if (!webhookUrl) return { skipped: true };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: recipient,
        table: tableName,
        message: formatSmsMessage(tableName, data),
        data
      })
    });
    return { ok: response.ok };
  } catch (error) {
    console.warn("SMS notification failed", error);
    return { ok: false };
  }
}

async function submitForm(tableName, data) {
  const payload = { ...data, id: Date.now(), status: "new", submitted_at: new Date().toISOString() };
  if (API_BASE) {
    const response = await fetch(`${API_BASE}/${tableName}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (response.ok) await notifySms(tableName, payload);
    return response;
  }
  const stored = JSON.parse(localStorage.getItem(tableName) || "[]");
  stored.push(payload);
  localStorage.setItem(tableName, JSON.stringify(stored));
  const sms = await notifySms(tableName, payload);
  return { ok: true, sms };
}

function formToData(form) {
  const data = {};
  new FormData(form).forEach((value, key) => {
    data[key] = value;
  });
  return data;
}

function handleFormSubmit() {
  document.querySelectorAll("form[data-form]").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        showToast("필수 항목을 확인해 주세요.", "error");
        return;
      }
      const table = form.dataset.form;
      const result = await submitForm(table, formToData(form));
      if (result.ok) {
        form.reset();
        showToast("상담 신청이 저장되었습니다. 빠르게 연락드리겠습니다.");
      } else {
        showToast("저장 중 문제가 발생했습니다.", "error");
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", handleFormSubmit);
