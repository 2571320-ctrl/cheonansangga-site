const MUNJANARA_URL = "https://munjanara.co.kr/send.sys";

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

function parseMunjanaraResult(raw) {
  const text = String(raw || "").trim();
  const parts = text.split("|");
  return {
    ok: parts[0] === "1",
    code: parts[0] || "",
    balance: parts[1] || "",
    sentCount: parts[2] || "",
    reserved: parts[3] || "",
    raw: text
  };
}

export async function onRequest({ request, env = {} }) {
  try {
    if (request.method !== "POST") {
      return jsonResponse({ ok: false, error: "POST 요청만 사용할 수 있습니다." }, 405);
    }

    let input = {};
    try {
      input = await request.json();
    } catch {
      return jsonResponse({ ok: false, error: "잘못된 요청 형식입니다." }, 400);
    }

    const userid = env.MUNJANARA_USERID || "";
    const passwd = env.MUNJANARA_PASSWD || "";
    const sender = onlyDigits(env.MUNJANARA_SENDER || "");
    const receiver = onlyDigits(input.to || env.SMS_NOTIFY_PHONE || "01041220321");
    const message = String(input.message || "").trim().slice(0, 1900);
    const url = new URL(request.url);

    if (url.searchParams.get("debug") === "1") {
      return jsonResponse({
        ok: true,
        hasUserid: Boolean(userid),
        hasPasswd: Boolean(passwd),
        hasSender: Boolean(sender),
        receiver,
        hasMessage: Boolean(message)
      });
    }

    if (!userid || !passwd || !sender) {
      return jsonResponse({
        ok: false,
        error: "문자나라 환경변수가 설정되지 않았습니다.",
        required: ["MUNJANARA_USERID", "MUNJANARA_PASSWD", "MUNJANARA_SENDER"]
      }, 500);
    }

    if (!receiver || !message) {
      return jsonResponse({ ok: false, error: "수신번호 또는 문자 내용이 없습니다." }, 400);
    }

    const receiverName = input.data && input.data.name ? String(input.data.name) : "상담알림";
    const params = new URLSearchParams({
      userid,
      passwd,
      sender,
      receiver,
      message,
      sender_name: "Jungang",
      receiver_name: receiverName.slice(0, 20),
      end_alert: "1",
      allow_mms: "1"
    });

    const response = await fetch(MUNJANARA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString()
    });
    const raw = await response.text();
    const result = parseMunjanaraResult(raw);

    return jsonResponse({
      ok: response.ok && result.ok,
      httpStatus: response.status,
      result
    }, response.ok && result.ok ? 200 : 502);
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: error && error.message ? error.message : "문자 발송에 실패했습니다."
    }, 500);
  }
}
