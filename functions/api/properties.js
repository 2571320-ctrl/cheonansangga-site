const KV_BINDING_NAMES = ["PROPERTIES_KV", "PROPERTY_KV", "INQUIRIES_KV"];
const CACHE_STORAGE_URL = "https://sangkwon.local/admin-properties-cache";
const CACHE_KEY = "properties";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function getAdminPassword(env = {}) {
  return String(env.ADMIN_PASSWORD || "1234").trim();
}

function getPropertiesKV(env = {}) {
  for (const name of KV_BINDING_NAMES) {
    if (env[name]) return env[name];
  }
  return null;
}

function normalizeRecords(input) {
  const records = Array.isArray(input?.records) ? input.records : Array.isArray(input) ? input : [];
  return records
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      ...item,
      id: item.id || Date.now(),
      is_active: item.is_active !== false,
      synced_at: new Date().toISOString()
    }));
}

async function readCacheRecords() {
  if (typeof caches === "undefined") return [];
  const response = await caches.default.match(new Request(CACHE_STORAGE_URL));
  if (!response) return [];
  const body = await response.json().catch(() => null);
  return Array.isArray(body?.records) ? body.records : [];
}

async function writeCacheRecords(records) {
  if (typeof caches === "undefined") {
    return {
      ok: false,
      configured: false,
      storage: "cache",
      error: "Cloudflare Cache API를 사용할 수 없습니다."
    };
  }

  await caches.default.put(
    new Request(CACHE_STORAGE_URL),
    new Response(JSON.stringify({ records }), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=31536000"
      }
    })
  );

  return { ok: true, configured: false, storage: "cache" };
}

async function listProperties(env) {
  const kv = getPropertiesKV(env);
  if (kv) {
    const records = await kv.get(CACHE_KEY, "json");
    return {
      ok: true,
      configured: true,
      storage: "kv",
      records: Array.isArray(records) ? records : []
    };
  }

  return {
    ok: true,
    configured: false,
    storage: "cache",
    warning: "PROPERTIES_KV가 없어 Cloudflare Cache에서 매물을 읽고 있습니다.",
    records: await readCacheRecords()
  };
}

async function saveProperties(env, records) {
  const kv = getPropertiesKV(env);
  if (kv) {
    await kv.put(CACHE_KEY, JSON.stringify(records));
    return { ok: true, configured: true, storage: "kv" };
  }

  return writeCacheRecords(records);
}

export async function onRequest({ request, env = {} }) {
  if (request.method === "GET") {
    return jsonResponse(await listProperties(env));
  }

  if (!["POST", "PUT"].includes(request.method)) {
    return jsonResponse({ ok: false, error: "GET, POST, PUT 요청만 사용할 수 있습니다." }, 405);
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

  const records = normalizeRecords(input);
  const storage = await saveProperties(env, records);
  if (!storage.ok) {
    return jsonResponse({ ok: false, stored: false, storage }, 503);
  }

  return jsonResponse({
    ok: true,
    stored: true,
    count: records.length,
    storage
  });
}
