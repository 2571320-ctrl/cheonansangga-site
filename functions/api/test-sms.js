const ALIGO_SEND_URL = "https://apis.aligo.in/send/";

function jsonResponse(body, status = 200) {
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

export async function onRequest({ request, env = {} }) {
  if (request.method !== "GET" && request.method !== "POST") {
    return jsonResponse({ ok: false, error: "GET 또는 POST 요청만 사용할 수 있습니다." }, 405);
  }

  const url = new URL(request.url);
  const key = env.ALIGO_API_KEY || "";
  const userId = env.ALIGO_USER_ID || "";
  const sender = onlyDigits(env.ALIGO_SENDER || "");
  const receiver = onlyDigits(env.ADMIN_PHONE || "");

  if (url.searchParams.get("debug") === "1") {
    return jsonResponse({
      ok: true,
      hasKey: Boolean(key),
      hasUserId: Boolean(userId),
      hasSender: Boolean(sender),
      hasReceiver: Boolean(receiver)
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

  if (!key || !userId || !sender || !receiver) {
    return jsonResponse({
      ok: false,
      error: "알리고 환경변수가 설정되지 않았습니다.",
      required: ["ALIGO_API_KEY", "ALIGO_USER_ID", "ALIGO_SENDER", "ADMIN_PHONE"],
      configured: {
        hasKey: Boolean(key),
        hasUserId: Boolean(userId),
        hasSender: Boolean(sender),
        hasReceiver: Boolean(receiver)
      }
    }, 500);
  }

  const message = `[상권연구소]

신규 상담 신청

이름 : 테스트
연락처 : ${receiver}
지역 : 천안
업종 : 알리고 연동

문의내용 :
알리고 SMS API 테스트 문자입니다.`;

  const params = new URLSearchParams({
    key,
    user_id: userId,
    sender,
    receiver,
    msg: message,
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
    const ok = response.ok && String(result.result_code || result.code || "") === "1";
    if (!ok) {
      console.error("ALIGO_TEST_SMS_FAILED", { status: response.status, result, receiver });
    }
    return jsonResponse({ ok, httpStatus: response.status, result }, 200);
  } catch (error) {
    console.error("ALIGO_TEST_SMS_ERROR", {
      error: error && error.message ? error.message : String(error),
      receiver
    });
    return jsonResponse({
      ok: false,
      error: error && error.message ? error.message : "알리고 테스트 문자 발송에 실패했습니다."
    }, 502);
  }
}
