import { sendTelegramMessage } from "./telegram.js";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

export async function onRequest({ request, env = {} }) {
  if (request.method !== "GET" && request.method !== "POST") {
    return jsonResponse({ ok: false, error: "GET 또는 POST 요청만 사용할 수 있습니다." }, 405);
  }

  const result = await sendTelegramMessage({
    env,
    text: "텔레그램 연동 테스트 성공"
  });

  return jsonResponse(result, result.status || (result.ok ? 200 : 502));
}
