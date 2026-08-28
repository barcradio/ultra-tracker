---
applyTo: "src/renderer/**"
---

# UI & Frontend Guidelines

## UI & Styling
- Prefer Tailwind CSS utility classes and existing shared components over new custom CSS or inline styles.
- Ensure visual components work in both global Daylight and Nighttime themes, including readable status, warning, and error states.

## Race Logging & Keybindings
- Keep the `BIB#` entry box focused and optimized for rapid keying.
- Preserve top-row and 10-key Numpad bindings for station logging: `Equal`, `Enter`, `Numpad-Add` for In; `Minus`, `Numpad-Subtract` for Out; and `Slash`, `Backslash`, `Numpad-Divide` for In/Out. Preserve `Numpad-Enter` where it is supported as an In action.

## Component Patterns
- Use the existing DataGrid components and their supported sorting, filtering, and virtualization options. Keep real-time updates responsive and avoid adding work to every rendered cell without measuring the need.
- Modal interactions, such as the Edit Pane or Roster Search, must not suspend subscriptions, discard incoming time logs, or leave stale state. Coordinate background updates with the modal state and refresh the affected view when it closes.