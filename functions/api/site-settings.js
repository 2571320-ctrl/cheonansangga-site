const SETTINGS_KV_BINDING_NAMES = ["SITE_SETTINGS_KV", "SETTINGS_KV"];
const CACHE_STORAGE_URL = "https://sangkwon.local/site-settings";

const DEFAULT_SETTINGS = {
  phone_office: "041-552-0014",
  phone_mobile: "010-4122-0321",
  fax: "041-552-0035",
  address: "충청남도 천안시 서북구 원두정9길 18, 101호",
  business_hours: "평일·주말 09:00 – 24:00",
  sns_blog: "https://blog.naver.com/2571320",
  sns_naver_profile: "https://search.naver.com/search.naver?where=nexearch&sm=tab_etc&mra=bjky&pkid=1&os=39660109&qvt=0&query=%EA%B9%80%ED%98%84%EC%8B%9D",
  sns_youtube: "https://www.youtube.com/@%EC%83%81%EA%B6%8C%EC%97%B0%EA%B5%AC%EC%86%8C",
  sns_instagram: "https://www.instagram.com/hyunsickim1",
  map_embed_url: "",
  sms_notify_phone: "010-4122-0321",
  sms_notify_url: "/api/aligo-sms",
  registration_no: "제44133-2015-04204호"
};

const ALLOWED_KEYS = Object.keys(DEFAULT_SETTINGS);

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function getSettingsKV(env = {}) {
  for (const name of SETTINGS_KV_BINDING_NAMES) {
    if (env[name]) return env[name];
  }
  return null;
}

function getAdminPassword(env = {}) {
  return String(env.ADMIN_PASSWORD || "1234").trim();
}

function sanitizeSettings(input = {}) {
  return ALLOWED_KEYS.reduce((settings, key) => {
    const value = input[key];
    settings[key] = typeof value === "string" ? value.trim() : DEFAULT_SETTINGS[key];
    return settings;
  }, {});
}

async function readSettingsFromCache() {
  if (typeof caches === "undefined") return {};
  const response = await caches.default.match(new Request(CACHE_STORAGE_URL));
  if (!response) return {};
  const body = await response.json().catch(() => null);
  return body?.settings && typeof body.settings === "object" ? body.settings : {};
}

async function writeSettingsToCache(settings) {
  if (typeof caches === "undefined") {
    return { ok: false, configured: false, storage: "cache", error: "Cloudflare Cache API를 사용할 수 없습니다." };
  }

  await caches.default.put(
    new Request(CACHE_STORAGE_URL),
    new Response(JSON.stringify({ settings }), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=31536000"
      }
    })
  );
  return { ok: true, configured: true, storage: "cache" };
}

async function readSettings(env) {
  const kv = getSettingsKV(env);
  if (kv) {
    const settings = await kv.get("site_settings", "json");
    return { ...DEFAULT_SETTINGS, ...(settings || {}) };
  }

  return { ...DEFAULT_SETTINGS, ...(await readSettingsFromCache()) };
}

async function writeSettings(env, settings) {
  const kv = getSettingsKV(env);
  if (kv) {
    await kv.put("site_settings", JSON.stringify(settings));
    return { ok: true, configured: true, storage: "kv" };
  }

  return writeSettingsToCache(settings);
}

export async function onRequest({ request, env = {} }) {
  if (request.method === "GET") {
    return jsonResponse({ ok: true, settings: await readSettings(env) });
  }

  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "GET 또는 POST 요청만 사용할 수 있습니다." }, 405);
  }

  const password = request.headers.get("x-admin-password") || "";
  if (password !== getAdminPassword(env)) {
    return jsonResponse({ ok: false, error: "관리자 인증이 필요합니다." }, 401);
  }

  let input = {};
  try {
    input = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "잘못된 요청 형식입니다." }, 400);
  }

  const settings = sanitizeSettings(input.settings || input);
  const storage = await writeSettings(env, settings);
  return jsonResponse({ ok: storage.ok, settings, storage }, storage.ok ? 200 : 503);
}
