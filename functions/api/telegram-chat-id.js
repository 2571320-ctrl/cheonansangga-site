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

function simplifyUpdate(update) {
  const message = update.message || update.edited_message || update.channel_post || update.my_chat_member || {};
  const chat = message.chat || {};
  const from = message.from || {};

  return {
    update_id: update.update_id,
    chat_id: chat.id || "",
    chat_type: chat.type || "",
    chat_title: chat.title || "",
    username: chat.username || from.username || "",
    first_name: chat.first_name || from.first_name || "",
    last_name: chat.last_name || from.last_name || "",
    text: message.text || ""
  };
}

export async function onRequest({ request, env = {} }) {
  if (request.method !== "GET") {
    return jsonResponse({ ok: false, error: "GET 요청만 사용할 수 있습니다." }, 405);
  }

  const token = String(env.TELEGRAM_BOT_TOKEN || "").trim();
  if (!token) {
    return jsonResponse({
      ok: false,
      error: "TELEGRAM_BOT_TOKEN 환경변수가 설정되지 않았습니다."
    }, 500);
  }

  try {
    const response = await fetch(`${TELEGRAM_API_BASE}/bot${token}/getUpdates`, {
      method: "GET"
    });
    const result = await response.json().catch(() => null);

    if (!response.ok || !result || result.ok === false) {
      return jsonResponse({
        ok: false,
        httpStatus: response.status,
        result
      }, 200);
    }

    const updates = Array.isArray(result.result) ? result.result.map(simplifyUpdate).filter((item) => item.chat_id) : [];
    const uniqueChats = [];
    const seen = new Set();
    for (const item of updates.reverse()) {
      const key = String(item.chat_id);
      if (!seen.has(key)) {
        seen.add(key);
        uniqueChats.push(item);
      }
    }

    return jsonResponse({
      ok: true,
      instruction: "아래 chat_id 값을 Cloudflare 환경변수 TELEGRAM_CHAT_ID에 넣으세요.",
      chats: uniqueChats
    });
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: error && error.message ? error.message : "텔레그램 chat_id 조회에 실패했습니다."
    }, 502);
  }
}
