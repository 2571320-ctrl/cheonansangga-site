import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = readFileSync(new URL('../functions/api/properties.js', import.meta.url), 'utf8');
const { onRequest } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const rows = [{ id: 'existing', title: 'Existing property', verified_date: '2026-10-28' }];
let saved;
const env = { ADMIN_PASSWORD: 'test-password', PROPERTIES_KV: {
  get: async () => saved ?? rows,
  put: async (key, value) => { assert.equal(key, 'properties'); saved = JSON.parse(value); }
} };
const request = (method, data, password = 'test-password') => new Request('https://example.test/api/properties', {
  method, headers: { 'x-admin-password': password, 'Content-Type': 'application/json' },
  ...(data ? { body: JSON.stringify(data) } : {})
});
assert.equal((await onRequest({ request: request('POST', { records: rows }, 'wrong'), env })).status, 401);
assert.equal((await onRequest({ request: request('POST', { records: rows }), env: { ADMIN_PASSWORD: 'test-password' } })).status, 503);
assert.equal((await onRequest({ request: request('POST', { records: rows }), env })).status, 200);
assert.equal((await (await onRequest({ request: request('GET'), env })).json()).records[0].id, 'existing');

const adminSource = readFileSync(new URL('../js/admin.js', import.meta.url), 'utf8');
function admin(body, ok = true) {
  const values = new Map([['properties', JSON.stringify([{ id: 'edge-only' }])]]);
  const context = vm.createContext({ console: { warn() {} }, localStorage: {
    getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value)
  }, document: { addEventListener() {} }, fetch: async () => ({ ok, status: ok ? 200 : 503, json: async () => body }) });
  vm.runInContext(adminSource, context);
  return { context, values };
}
let state = admin({ ok: true, storage: { storage: 'cache' } });
await assert.rejects(vm.runInContext('saveServerProperties([])', state.context));
state = admin({ ok: true, storage: { storage: 'kv' } });
assert.equal(await vm.runInContext('saveServerProperties([])', state.context), true);
state = admin({ ok: true, storage: 'kv', records: [] });
await vm.runInContext('loadServerProperties()', state.context);
assert.equal(JSON.parse(state.values.get('properties')).length, 0);
assert.equal(JSON.parse(state.values.get('properties_recovery_backup'))[0].id, 'edge-only');

const publicSource = readFileSync(new URL('../js/property-service.js', import.meta.url), 'utf8');
async function browser(local) {
  const context = vm.createContext({ window: {}, localStorage: { getItem: () => JSON.stringify(local) },
    fetch: async () => ({ ok: true, json: async () => ({ ok: true, records: rows }) }) });
  vm.runInContext(publicSource, context);
  return JSON.parse(JSON.stringify(await context.window.PropertyService.fetchProperties()));
}
assert.deepEqual(await browser([{ id: 'edge-only' }]), await browser([]));
console.log('PASS: authentication, missing KV, durable save/read, cache rejection, local backup, Edge/Chrome isolation');
