import { buildConsultationMessage, jsonResponse, sendAligoSms } from "./aligo-sms.js";

export async function onRequest({ request, env = {} }) {
  if (request.method !== "GET" && request.method !== "POST") {
    return jsonResponse({ ok: false, error: "GET 또는 POST 요청만 사용할 수 있습니다." }, 405);
  }

  const data = {
    name: "테스트",
    phone: env.ADMIN_PHONE || "",
    region: "천안",
    business: "알리고 연동",
    message: "알리고 SMS API 테스트 문자입니다.",
    table: "test_sms"
  };

  const result = await sendAligoSms({
    env,
    to: env.ADMIN_PHONE,
    data,
    message: buildConsultationMessage(data)
  });

  return jsonResponse(result, result.status || (result.ok ? 200 : 502));
}
