# Working rules

- This is a live business website. Read PROJECT_STATUS.md before continuing.
- Check Git status and preserve existing user changes before editing.
- Do not delete project files or data, use git reset/clean/checkout, or forcibly
  overwrite existing work.
- Do not deploy, run DB migrations, change environment variables, DNS, domains,
  deployment settings or Cloudflare bindings without explicit user approval.
- Do not clear browser storage: it may contain the only copy of existing listings.
- Public read-only GET /api/properties is suitable for diagnosis. Avoid diagnostic
  SMS/Telegram endpoints: even GET requests may send messages.
- Never put secrets or customer data into logs, tests or documentation.
- Test property persistence with tests/property-sync.mjs and syntax checks; report
  local validation separately from actual production/browser verification.
- Update PROJECT_STATUS.md with changes, validation and remaining release steps.
