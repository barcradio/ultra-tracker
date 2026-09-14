# Ultra-Tracker

Claude follows the same house rules as Copilot. The canonical instructions live in
`.github/`; this file imports them so there is one source of truth, not two that drift.

@.github/copilot-instructions.md
@.github/instructions/testing-tdd.instructions.md
@.github/instructions/electron-main.instructions.md
@.github/instructions/renderer-ui.instructions.md
@.github/instructions/opensplittime.instructions.md
@.github/instructions/data-export.instructions.md

## Claude-specific notes

- The tool names under "Token And Context Optimization" (`grep_search`, `file_search`)
  are Copilot's. Use Grep and Glob instead; the intent — search narrowly, read only
  what the change needs — still applies.
- The `applyTo:` frontmatter in `.github/instructions/*.md` is Copilot's path-scoping
  feature. Imports here load unconditionally, so apply each file to the paths its own
  frontmatter names.
