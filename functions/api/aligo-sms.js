const ALIGO_SEND_URL = "https://apis.aligo.in/send/";

export function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function onlyDigits(value) {
  return String(value || "").replace(/[^0-9]/g, "");
}

function fingerprint(value) {
  const text = String(value || "").trim();
  return {
    length: text.length,
    first2: text.slice(0, 2),
    last4: text.slice(-4)
  };
}

function pick(...values) {
  for (const value of values) {
    const text = String(value || "").trim();
    if (text) return text;
  }
  return "-";
}

export function buildConsultationMessage(data = {}) {
  const name = pick(data.name, data.customer_name);
  const phone = pick(data.phone, data.customer_phone);
  const region = pick(data.region, data.preferred_area, data.area, data.address);
  const business = pick(data.business, data.preferred_category, data.preferred_item, data.inquiry_type, data.category);
  const message = pick(data.message, data.inquiry, data.memo, data.content);

  return `[상권연구소]

신규 상담 신청

이름 : ${name}
연락처 : ${phone}
지역 : ${region}
업종 : ${business}

문의내용 :
${message}`;
}

export async function sendAligoSms({ env = {}, to, data = {}, message }) {
  const key = String(env.ALIGO_API_KEY || "").trim();
  const userId = String(env.ALIGO_USER_ID || "").trim();
  const sender = onlyDigits(env.ALIGO_SENDER || "");
  const receiver = onlyDigits(to || env.ADMIN_PHONE || "");
  const msg = String(message || buildConsultationMessage(data)).trim();

  if (!key || !userId || !sender || !receiver) {
    return {
      ok: false,
      status: 500,
      error: "알리고 환경변수가 설정되지 않았습니다.",
      required: ["ALIGO_API_KEY", "ALIGO_USER_ID", "ALIGO_SENDER", "ADMIN_PHONE"],
      configured: {
        hasKey: Boolean(key),
        hasUserId: Boolean(userId),
        hasSender: Boolean(sender),
        hasReceiver: Boolean(receiver)
      }
    };
  }

  const params = new URLSearchParams({
    key,
    user_id: userId,
    sender,
    receiver,
    msg,
    msg_type: "LMS",
    title: "상권연구소 상담신청"
  });

  try {
    const response = await fetch(ALIGO_SEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString()
    });
    const text = await response.text();
    let result = null;
    try {
      result = JSON.parse(text);
    } catch {
      result = { raw: text };
    }
    const resultCode = String(result.result_code || result.code || "");
    const ok = response.ok && resultCode === "1";
    if (!ok) {
      console.error("ALIGO_SMS_FAILED", {
        status: response.status,
        result,
        receiver,
        table: data.table || ""
      });
    }
    return {
      ok,
      status: 200,
      httpStatus: response.status,
      result
    };
  } catch (error) {
    console.error("ALIGO_SMS_ERROR", {
      error: error && error.message ? error.message : String(error),
      receiver,
      table: data.table || ""
    });
    return {
      ok: false,
      status: 502,
      error: error && error.message ? error.message : "알리고 문자 발송에 실패했습니다."
    };
  }
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

  const url = new URL(request.url);
  const data = { ...(input.data || {}), table: input.table || "" };

  if (url.searchParams.get("debug") === "1") {
    return jsonResponse({
      ok: true,
      hasKey: Boolean(env.ALIGO_API_KEY),
      hasUserId: Boolean(env.ALIGO_USER_ID),
      hasSender: Boolean(env.ALIGO_SENDER),
      hasAdminPhone: Boolean(env.ADMIN_PHONE),
      userId: fingerprint(env.ALIGO_USER_ID),
      apiKey: fingerprint(env.ALIGO_API_KEY),
      sender: fingerprint(onlyDigits(env.ALIGO_SENDER || "")),
      adminPhone: fingerprint(onlyDigits(env.ADMIN_PHONE || ""))
    });
  }

  if (url.searchParams.get("probe") === "1") {
    const probeResponse = await fetch(ALIGO_SEND_URL, { method: "GET" });
    return jsonResponse({
      ok: true,
      aligoStatus: probeResponse.status,
      aligoContentType: probeResponse.headers.get("content-type") || ""
    });
  }

  if (url.searchParams.get("postprobe") === "1") {
    const probeParams = new URLSearchParams({
      key: "x",
      user_id: "x",
      sender: "01000000000",
      receiver: "01000000000",
      msg: "test",
      msg_type: "SMS"
    });
    const probeResponse = await fetch(ALIGO_SEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: probeParams.toString()
    });
    return jsonResponse({
      ok: true,
      aligoStatus: probeResponse.status,
      aligoContentType: probeResponse.headers.get("content-type") || "",
      body: await probeResponse.text()
    });
  }

  const result = await sendAligoSms({
    env,
    to: input.to || env.ADMIN_PHONE,
    data,
    message: buildConsultationMessage(data)
  });

  return jsonResponse(result, result.status || (result.ok ? 200 : 502));
}
