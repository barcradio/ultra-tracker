---
applyTo: "src/renderer/**"
---

# UI & Frontend Guidelines

- Prefer Tailwind and existing shared components over custom CSS or new abstraction layers.
- Keep the UI readable in both themes and preserve focus and keyboard behavior for race-entry workflows.
- Preserve the station logging hotkeys and keep the `BIB#` box optimized for rapid keying.
- Use existing DataGrid patterns and avoid adding work to every rendered cell without a measured need.
- Keep modal interactions from discarding live updates or leaving stale state.