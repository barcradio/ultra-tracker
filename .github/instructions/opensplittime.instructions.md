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

- `.env`-style API keys (`OPENSPLITTIME_API_KEY`, `OPENSPLITTIME_STAGING_API_KEY`) live in the git-ignored `opensplittime.env` file at the repo root, loaded via `dotenv`. These are dev/test shortcut tokens, not the operator's personal login.
- Real steward logins go through `/auth` (`authenticate()`), optionally saving encrypted credentials via `safeStorage` (`openSplitTime.email` / `openSplitTime.encryptedPassword` in `appStore`). Never store plaintext passwords.

## Event Group Metadata

- Stations JSON (`resources/config/*-stations.json`) carries `event.openSplitTime.production` / `.staging`, each with `name` (event group slug, must exactly match OpenSplitTime) and `id` (numeric event group id, best-effort).
- `syncEventGroupId()` validates and auto-corrects the stored `id` against the live OpenSplitTime event group on every successful login — don't hand-maintain `id` precision, but `name` must be accurate since it drives API lookups.
- See the wiki page "Stations File Setup" for the full schema and production/staging authoring guidance.

## API Conventions

- All authenticated requests go through `request()` with `Authorization: Bearer <token>`; `requireToken()` throws `OpenSplitTimeApiError` (401) if not authenticated.
- Raw time submissions use `source` = station identifier, `split_name` = station name, and the `rawTimeUniqueKey` (`source`, `split_name`, `sub_split_kind`, `bib_number`) for idempotent upserts via `submitRawTimes()`.
