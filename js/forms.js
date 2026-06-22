const API_BASE = "";
const DEFAULT_SMS_ENDPOINT = "/api/aligo-sms";

function getFormSettings() {
  const defaults = typeof SITE_DEFAULTS === "object" ? SITE_DEFAULTS : {};
  try {
    const saved = JSON.parse(localStorage.getItem("site_settings") || "{}");
    return { ...defaults, ...saved };
  } catch {
    return { ...defaults };
  }
}

function formatSmsMessage(tableName, data) {
  const pick = (...values) => values.map((value) => String(value || "").trim()).find(Boolean) || "-";
  const name = pick(data.name, data.customer_name);
  const phone = pick(data.phone, data.customer_phone);
  const region = pick(data.region, data.preferred_area, data.area, data.address);
  const business = pick(data.business, data.preferred_category, data.preferred_item, data.inquiry_type, data.category);
  const message = pick(data.message, data.inquiry, data.memo, data.content);
  return `[상권연구소]\n\n신규 상담 신청\n\n이름 : ${name}\n연락처 : ${phone}\n지역 : ${region}\n업종 : ${business}\n\n문의내용 :\n${message}`;
}

function saveSmsFailureLog(tableName, data, result) {
  try {
    const logs = JSON.parse(localStorage.getItem("sms_failure_logs") || "[]");
    logs.push({
      id: Date.now(),
      table: tableName,
      name: data.name || data.customer_name || "",
      phone: data.phone || data.customer_phone || "",
      submitted_at: data.submitted_at || new Date().toISOString(),
      result
    });
    localStorage.setItem("sms_failure_logs", JSON.stringify(logs.slice(-100)));
  } catch (error) {
    console.warn("SMS failure log save failed", error);
  }
}

async function notifySms(tableName, data) {
  const settings = getFormSettings();
  const savedWebhookUrl = settings.sms_notify_url || "";
  const webhookUrl = !savedWebhookUrl || savedWebhookUrl.includes("munjanara-sms")
    ? DEFAULT_SMS_ENDPOINT
    : savedWebhookUrl;
  const recipient = settings.sms_notify_phone || settings.phone_mobile || "010-4122-0321";

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
    let body = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    const result = { ok: response.ok && (!body || body.ok !== false), status: response.status, body };
    if (!result.ok) saveSmsFailureLog(tableName, data, result);
    return result;
  } catch (error) {
    console.warn("SMS notification failed", error);
    const result = { ok: false, error: error.message || String(error) };
    saveSmsFailureLog(tableName, data, result);
    return result;
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
        showToast("상담 신청이 접수되었습니다. 빠르게 연락드리겠습니다.");
      } else {
        showToast("저장 중 문제가 발생했습니다.", "error");
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", handleFormSubmit);
