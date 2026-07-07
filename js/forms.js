const API_BASE = "";
const DEFAULT_INQUIRY_ENDPOINT = "/api/inquiries";
const DEFAULT_SMS_ENDPOINT = "/api/aligo-sms";
const DEFAULT_TELEGRAM_ENDPOINT = "/api/telegram";

function getFormSettings() {
  const defaults = typeof SITE_DEFAULTS === "object" ? SITE_DEFAULTS : {};
  try {
    const saved = JSON.parse(localStorage.getItem("site_settings") || "{}");
    return { ...defaults, ...saved };
  } catch {
    return { ...defaults };
  }
}

function pickText(...values) {
  for (const value of values) {
    const text = String(value || "").trim();
    if (text) return text;
  }
  return "-";
}

function getFormType(tableName, data = {}) {
  const labels = {
    general_inquiries: "일반상담",
    consulting_requests: "창업컨설팅",
    investment_requests: "투자상담",
    property_inquiries: "매물문의",
    property_submissions: "매물접수"
  };
  return labels[tableName] || data.inquiry_type || tableName;
}

function formatSmsMessage(tableName, data) {
  const name = pickText(data.name, data.customer_name);
  const phone = pickText(data.phone, data.customer_phone);
  const region = pickText(data.region, data.preferred_area, data.area, data.address);
  const business = pickText(data.business, data.property_type, data.preferred_category, data.preferred_item, data.inquiry_type, data.category);
  const message = pickText(data.message, data.inquiry, data.description, data.memo, data.content);
  return `[상권연구소]\n\n신규 ${getFormType(tableName, data)} 접수\n\n이름 : ${name}\n연락처 : ${phone}\n지역 : ${region}\n구분 : ${business}\n\n문의내용 :\n${message}`;
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
    const body = await response.json().catch(() => null);
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

async function notifyTelegram(tableName, data) {
  try {
    const response = await fetch(DEFAULT_TELEGRAM_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: tableName,
        formType: getFormType(tableName, data),
        timestamp: data.submitted_at || new Date().toISOString(),
        data
      })
    });
    const body = await response.json().catch(() => null);
    return { ok: response.ok && (!body || body.ok !== false), status: response.status, body };
  } catch (error) {
    console.warn("Telegram notification failed", error);
    return { ok: false, error: error.message || String(error) };
  }
}

async function saveInquiryToServer(tableName, data) {
  try {
    const response = await fetch(DEFAULT_INQUIRY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: tableName,
        data
      })
    });
    const body = await response.json().catch(() => null);
    return { ok: response.ok && (!body || body.ok !== false), status: response.status, body };
  } catch (error) {
    console.warn("Inquiry server save failed", error);
    return { ok: false, error: error.message || String(error) };
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
    if (response.ok) await notifyTelegram(tableName, payload);
    return response;
  }
  const stored = JSON.parse(localStorage.getItem(tableName) || "[]");
  stored.push(payload);
  localStorage.setItem(tableName, JSON.stringify(stored));
  const server = await saveInquiryToServer(tableName, payload);
  const telegram = server.ok ? server.body?.telegram : await notifyTelegram(tableName, payload);
  return { ok: true, server, telegram };
}

function fileListToText(fileList) {
  return [...fileList].map((file) => file.name).filter(Boolean).join(", ");
}

function makeImagePreview(image, file, maxWidth, quality) {
  const scale = Math.min(1, maxWidth / image.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  return {
    name: file.name,
    type: "image/jpeg",
    dataUrl: canvas.toDataURL("image/jpeg", quality)
  };
}

function resizeImageFile(file, maxWidth = 640, quality = 0.58) {
  return new Promise((resolve) => {
    if (!file || !file.type?.startsWith("image/")) {
      resolve(null);
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => resolve(null);
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => resolve(null);
      image.onload = () => {
        let preview = makeImagePreview(image, file, maxWidth, quality);
        if (preview.dataUrl.length > 220000) {
          preview = makeImagePreview(image, file, 480, 0.5);
        }
        resolve(preview);
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function collectPhotoPreviews(form) {
  const photos = [];
  const inputs = [...form.querySelectorAll("input[type='file']")];
  for (const input of inputs) {
    const files = [...(input.files || [])].slice(0, 4 - photos.length);
    for (const file of files) {
      const photo = await resizeImageFile(file);
      if (photo) photos.push(photo);
      if (photos.length >= 4) break;
    }
  }
  return photos;
}

async function formToData(form) {
  const data = {};
  new FormData(form).forEach((value, key) => {
    if (value instanceof File) {
      if (!value.name) return;
      data[key] = data[key] ? `${data[key]}, ${value.name}` : value.name;
      return;
    }
    data[key] = value;
  });

  form.querySelectorAll("input[type='file'][multiple]").forEach((input) => {
    if (input.files?.length) data[input.name] = fileListToText(input.files);
  });

  const photoPreviews = await collectPhotoPreviews(form);
  if (photoPreviews.length) data.photo_previews = photoPreviews;

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
      const submitButton = form.querySelector("[type='submit']");
      if (submitButton) submitButton.disabled = true;
      const result = await submitForm(table, await formToData(form));
      if (submitButton) submitButton.disabled = false;

      if (result.ok) {
        form.reset();
        showToast(`${getFormType(table)}가 접수되었습니다. 빠르게 연락드리겠습니다.`);
      } else {
        showToast("접수 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.", "error");
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", handleFormSubmit);
