# Project status — 2026-10-28

## Current work: cross-browser property synchronization

- Baseline commit: 7e6c26b on main. Changes below are local and not deployed.
- Public production GET /api/properties returned HTTP 200, configured=false,
  storage=cache and zero records. No production writes were performed.
- Root issue: missing durable KV binding, browser-local fallback, and ignored
  server-save failures. Edge's localStorage cannot be read from Chrome.
- Local fix: require KV for successful writes; check response body and storage;
  preserve local entries on save failure; remove automatic uploads on admin load;
  back up local records before replacing them with a server snapshot; provide an
  explicit recovery sync button that merges IDs, preferring server records on conflicts.
- Successful public reads use the server snapshot even when empty, avoiding stale
  local entries. Existing sample listings remain unchanged.
- Existing full-list save API still has a concurrent-edit risk. Avoid simultaneous
  admin edits until a versioned/per-record persistence design is implemented.

## Release prerequisites (require user authorization)

1. Preserve/export Edge's existing properties localStorage and any existing remote
   records before making operational changes. Do not clear browser data.
2. In the existing Cloudflare Pages project, inspect bindings first. Connect an
   approved durable namespace as PROPERTIES_KV without replacing existing bindings.
   Verify production ADMIN_PASSWORD is configured; do not record secret values here.
3. Deploy this reviewed change only after explicit approval. KV connection is also
   an operational configuration change requiring approval.
4. In Edge on the same canonical production origin, use the explicit existing-property
   sync button. It preserves remote records and prefers the remote version of an
   existing ID. Recovery backup remains in properties_recovery_backup.
5. Verify public API reports storage=kv and expected records, then compare Edge and
   Chrome, including reloads and an independent session. Do not create dummy live
   listings or send notifications without authorization.

## Validation

Run from the parent workspace:
`./node-v22.14.0-win-x64/node.exe cheonansangga-site/tests/property-sync.mjs`

Tests use isolated in-memory storage and mocked browser contexts; they do not
validate actual Edge/Chrome sessions or deployed Cloudflare bindings.

## Other known follow-up work

General inquiry submission can display success after server failure. Reports authored
in admin are browser-local. Admin HTML output/authentication need security review.
These concerns are outside this property-sync change.
