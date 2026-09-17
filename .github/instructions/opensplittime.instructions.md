---
description: "Use when working on OpenSplitTime (OST) integration: authentication, event group lookups, raw time submission, or the environment selector."
applyTo: "src/main/services/opensplittime.ts, src/main/ipc/opensplittime-ipc.ts, src/renderer/src/features/SettingsPage/OpenSplitTimeLogin.tsx"
---

# OpenSplitTime (OST) Integration

- Treat `staging` and `production` as separate live environments; staging is the default only when a staging event group is configured.
- Switches require explicit operator confirmation and reset the active token.
- Never assume a token is valid without both `apiToken` and `tokenExpiration`.
- Keep event metadata accurate: `name` must match OpenSplitTime exactly; `id` is validated and corrected on successful login.
- All authenticated requests use bearer auth and `submitRawTimes()` sends `source` and `split_name` without a `unique_key` field.