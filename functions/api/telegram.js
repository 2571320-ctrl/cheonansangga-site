const TELEGRAM_API_BASE = "https://api.telegram.org";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function pick(...values) {
  for (const value of values) {
    const text = String(value || "").trim();
    if (text) return text;
  }
  return "-";
}

function getFormType(tableName, data = {}) {
  const inquiryType = pick(data.inquiry_type, data.category, data.preferred_category);
  const labels = {
    general_inquiries: "일반상담",
    consulting_requests: "창업컨설팅",
    investment_requests: "투자상담",
    property_inquiries: "매물문의",
    property_submissions: "매물접수"
  };
  return labels[tableName] || inquiryType || tableName || "문의";
}

function formatKoreanTime(value = "") {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return value || new Date().toISOString();
  return date.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

function buildPropertySubmitMessage({ formType = "매물접수", data = {}, timestamp = "" }) {
  const name = pick(data.name, data.customer_name);
  const phone = pick(data.phone, data.customer_phone);
  const propertyType = pick(data.property_type, data.category);
  const address = pick(data.address, data.region, data.preferred_area);
  const description = pick(data.description, data.message, data.inquiry, data.memo, data.content);
  const photos = pick(data.photos, data.photo_names, data.photo_file_names);
  const submittedAt = formatKoreanTime(timestamp || data.submitted_at);

  return `🔔 신규 매물접수

구분: ${formType}

이름: ${name}
연락처: ${phone}
매물종류: ${propertyType}
주소: ${address}

간단한 설명:
${description}

사진첨부:
${photos}

접수시간:
${submittedAt}`;
}

function buildTelegramMessage({ table = "", formType = "", data = {}, timestamp = "" }) {
  if (table === "property_submissions") {
    return buildPropertySubmitMessage({ formType: formType || getFormType(table, data), data, timestamp });
  }

  const name = pick(data.name, data.customer_name);
  const phone = pick(data.phone, data.customer_phone);
  const message = pick(data.message, data.inquiry, data.description, data.memo, data.content, data.preferred_item, data.preferred_area);
  const submittedAt = formatKoreanTime(timestamp || data.submitted_at);

  return `🔔 신규 문의 접수

구분: ${formType || getFormType(table, data)}

이름: ${name}
연락처: ${phone}

문의내용:
${message}

접수시간:
${submittedAt}`;
}

async function sendTelegramMessage({ env = {}, text = "" }) {
  const token = String(env.TELEGRAM_BOT_TOKEN || "").trim();
  const chatId = String(env.TELEGRAM_CHAT_ID || "").trim();

  if (!token || !chatId) {
    return {
      ok: false,
      status: 500,
      error: "텔레그램 환경변수가 설정되지 않았습니다.",
      required: ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"],
      configured: {
        hasToken: Boolean(token),
        hasChatId: Boolean(chatId)
      }
    };
  }

  try {
    const response = await fetch(`${TELEGRAM_API_BASE}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true
      })
    });
    const result = await response.json().catch(() => null);
    const ok = response.ok && (!result || result.ok !== false);

    if (!ok) {
      console.error("TELEGRAM_NOTIFICATION_FAILED", {
        status: response.status,
        result
      });
    }

    return {
      ok,
      status: 200,
      httpStatus: response.status,
      result
    };
  } catch (error) {
    console.error("TELEGRAM_NOTIFICATION_ERROR", {
      error: error && error.message ? error.message : String(error)
    });
    return {
      ok: false,
      status: 502,
      error: error && error.message ? error.message : "텔레그램 알림 발송에 실패했습니다."
    };
  }
}

function dataUrlToBlob(dataUrl = "") {
  const [header, base64] = String(dataUrl).split(",");
  if (!header || !base64) return null;
  const mime = header.match(/data:(.*?);base64/)?.[1] || "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mime });
}

async function sendTelegramPhotos({ env = {}, photos = [] }) {
  const token = String(env.TELEGRAM_BOT_TOKEN || "").trim();
  const chatId = String(env.TELEGRAM_CHAT_ID || "").trim();

  if (!token || !chatId || !Array.isArray(photos) || !photos.length) {
    return { ok: false, skipped: true };
  }

  const results = [];
  for (const [index, photo] of photos.slice(0, 4).entries()) {
    const blob = dataUrlToBlob(photo.dataUrl);
    if (!blob) continue;

    try {
      const form = new FormData();
      form.append("chat_id", chatId);
      form.append("caption", photo.name || `매물접수 사진 ${index + 1}`);
      form.append("photo", blob, photo.name || `property-photo-${index + 1}.jpg`);

      const response = await fetch(`${TELEGRAM_API_BASE}/bot${token}/sendPhoto`, {
        method: "POST",
        body: form
      });
      const result = await response.json().catch(() => null);
      results.push({
        ok: response.ok && (!result || result.ok !== false),
        status: response.status,
        result
      });
    } catch (error) {
      results.push({
        ok: false,
        error: error && error.message ? error.message : String(error)
      });
    }
  }

  return {
    ok: results.length > 0 && results.every((result) => result.ok),
    results
  };
}

export async function onRequest({ request, env = {} }) {
  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "POST 요청만 사용할 수 있습니다." }, 405);
  }

  let input = {};
  try {
    input = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "잘못된 요청 형식입니다." }, 400);
  }

  const data = input.data || {};
  const result = await sendTelegramMessage({
    env,
    text: input.message || buildTelegramMessage({
      table: input.table || "",
      formType: input.formType || "",
      data,
      timestamp: input.timestamp || data.submitted_at || ""
    })
  });

  return jsonResponse(result, result.status || (result.ok ? 200 : 502));
}

export { buildTelegramMessage, sendTelegramMessage, sendTelegramPhotos };
