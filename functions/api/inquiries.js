import { buildTelegramMessage, sendTelegramMessage } from "./telegram.js";

const KV_BINDING_NAMES = ["INQUIRIES_KV", "INQUIRY_KV", "CONTACTS_KV"];
const CACHE_STORAGE_URL = "https://sangkwon.local/admin-inquiries-cache";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function getInquiryKV(env = {}) {
  for (const name of KV_BINDING_NAMES) {
    if (env[name]) return env[name];
  }
  return null;
}

function getAdminPassword(env = {}) {
  return String(env.ADMIN_PASSWORD || "jungang2026").trim();
}

function normalizeRecord(input = {}) {
  const data = input.data && typeof input.data === "object" ? input.data : {};
  const table = String(input.table || data.table || "general_inquiries").trim();
  const submittedAt = data.submitted_at || new Date().toISOString();
  return {
    ...data,
    table,
    id: data.id || Date.now(),
    status: data.status || "new",
    submitted_at: submittedAt
  };
}

async function storeInquiry(env, record) {
  const kv = getInquiryKV(env);
  if (!kv) {
    return storeInquiryInCache(record);
  }

  const key = `inquiry:${record.submitted_at}:${record.id}`;
  await kv.put(key, JSON.stringify(record));
  return { ok: true, configured: true, key };
}

async function listInquiries(env) {
  const kv = getInquiryKV(env);
  if (!kv) {
    return listInquiriesFromCache();
  }

  const listed = await kv.list({ prefix: "inquiry:", limit: 500 });
  const records = await Promise.all(
    listed.keys.map(async ({ name }) => {
      const value = await kv.get(name, "json");
      return value ? { ...value, _key: name } : null;
    })
  );

  return {
    ok: true,
    configured: true,
    records: records
      .filter(Boolean)
      .sort((a, b) => String(b.submitted_at).localeCompare(String(a.submitted_at)))
  };
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
  return { ok: true, configured: true, storage: "cache" };
}

async function storeInquiryInCache(record) {
  const records = await readCacheRecords();
  records.unshift(record);
  const limitedRecords = records.slice(0, 500);
  const result = await writeCacheRecords(limitedRecords);
  return {
    ...result,
    key: `cache:${record.submitted_at}:${record.id}`,
    warning: "INQUIRIES_KV가 없어 Cloudflare Cache에 임시 저장했습니다. 영구 저장은 KV 바인딩을 권장합니다."
  };
}

async function listInquiriesFromCache() {
  const records = await readCacheRecords();
  return {
    ok: true,
    configured: false,
    storage: "cache",
    warning: "INQUIRIES_KV가 없어 Cloudflare Cache에서 문의를 읽고 있습니다.",
    records: records.sort((a, b) => String(b.submitted_at).localeCompare(String(a.submitted_at)))
  };
}

export async function onRequest({ request, env = {} }) {
  if (request.method === "GET") {
    const password = request.headers.get("x-admin-password") || "";
    if (password !== getAdminPassword(env)) {
      return jsonResponse({ ok: false, error: "관리자 인증이 필요합니다." }, 401);
    }
    return jsonResponse(await listInquiries(env));
  }

  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "GET 또는 POST 요청만 사용할 수 있습니다." }, 405);
  }

  let input = {};
  try {
    input = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "잘못된 요청 형식입니다." }, 400);
  }

  const record = normalizeRecord(input);
  const storage = await storeInquiry(env, record);
  if (!storage.ok) {
    return jsonResponse({
      ok: false,
      stored: false,
      storage,
      telegram: null
    }, 503);
  }

  const telegram = await sendTelegramMessage({
    env,
    text: input.message || buildTelegramMessage({
      table: record.table,
      formType: input.formType || "",
      data: record,
      timestamp: record.submitted_at
    })
  });

  return jsonResponse({
    ok: storage.ok && telegram.ok,
    stored: true,
    storage,
    telegram
  }, telegram.status || (telegram.ok ? 200 : 502));
}
