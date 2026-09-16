# Ultra-Tracker

Claude follows the same house rules as Copilot. The canonical instructions live in
`.github/`; keep this file limited to Claude-specific notes so the same instruction
set is not imported twice into agent sessions.

## Claude-specific notes

- The tool names under "Token And Context Optimization" (`grep_search`, `file_search`)
  are Copilot's. Use Grep and Glob instead; the intent — search narrowly, read only
  what the change needs — still applies.
- The `applyTo:` frontmatter in `.github/instructions/*.md` is Copilot's path-scoping
  feature. Imports here load unconditionally, so apply each file to the paths its own
  frontmatter names.
