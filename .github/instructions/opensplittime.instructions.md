---
description: "Use when working on OpenSplitTime (OST) integration: authentication, event group lookups, raw time submission, or the environment (staging/production) selector."
applyTo: "src/main/services/opensplittime.ts, src/main/ipc/opensplittime-ipc.ts, src/renderer/src/features/SettingsPage/OpenSplitTimeLogin.tsx"
---

# OpenSplitTime (OST) Integration

## Environments

- Two independent environments: `staging` (`staging.opensplittime.org`) and `production` (`www.opensplittime.org`). Staging is for rehearsals/dry runs; production posts to the real, public event and must be treated as live.
- The active environment is runtime-selectable (not fixed at process start). `getOpenSplitTimeEnvironment()` / `setOpenSplitTimeEnvironment()` in `opensplittime.ts` hold the current selection; switching resets the active API token.
- Default selection prefers `staging` whenever a staging event group is configured (`computeDefaultEnvironment()`), so accidental pushes to a live event require an explicit operator action.
- The Settings UI (`OpenSplitTimeLogin.tsx`) shows a dropdown of configured environments as `"<event name> - <production/staging>"` and requires an explicit confirmation modal when switching from staging to production.

## Credentials & Tokens

- No dev/test API key shortcut exists anymore; `apiToken` only ever gets set by a real steward sign-in.
- Steward logins go through `/auth` (`authenticate()`), optionally saving encrypted credentials via `safeStorage` (`openSplitTime.email` / `openSplitTime.encryptedPassword` in `appStore`). Never store plaintext passwords.
- `getAuthStatus()` reports `authenticated: true` only once both `apiToken` and `tokenExpiration` are set, i.e. after a successful `/auth` response — never assume a token is valid without one.

## Event Group Metadata

- Stations JSON (`resources/config/*-stations.json`) carries `event.openSplitTime.production` / `.staging`, each with `name` (event group slug, must exactly match OpenSplitTime) and `id` (numeric event group id, best-effort).
- `syncEventGroupId()` validates and auto-corrects the stored `id` against the live OpenSplitTime event group on every successful login — don't hand-maintain `id` precision, but `name` must be accurate since it drives API lookups.
- See the wiki page "Stations File Setup" for the full schema and production/staging authoring guidance.

## API Conventions

- All authenticated requests go through `request()` with `Authorization: Bearer <token>`; `requireToken()` throws `OpenSplitTimeApiError` (401) if not authenticated.
- Raw time submissions use `source` = station identifier, `split_name` = station name, via `submitRawTimes()`. Do not send a `unique_key` field — OpenSplitTime's import endpoint returns a 500 internal server error when it's present (confirmed via Postman testing).
