---
applyTo: "src/**"
---

# Test-Driven Development

## Workflow
- When implementing a new function, bug fix, or behavior change in `src/main/`, `src/preload/`, or `src/shared/`, write or update a failing Vitest test first, confirm it fails for the expected reason, then write the minimal implementation to make it pass.
- For bug fixes, write a regression test that reproduces the bug before changing the fix code.
- Prefer extending an existing `*.test.ts` file next to the module under test (see `src/main/database/tests/`) over creating a new test layout.
- After the test passes, refactor if needed while keeping the suite green; do not leave the suite red between edits.

## Scope And Exceptions
- Apply TDD to logic with meaningful branches or invariants (validation, IPC handlers, database operations, formatters). Skip it for trivial passthrough code, generated files, and pure UI markup with no logic, but still add a test if the change introduces a bug fix or a testable rule.
- Renderer component behavior (hooks, utilities, non-trivial conditional rendering) should also get tests when a harness exists for it; don't block on adding a new harness if one doesn't exist for the renderer.

## Running Tests
- Run the narrowest test file(s) related to the change via the `runTests` tool (or `pnpm test -- <path>`), not the full suite, while iterating.
- Run `pnpm test` once before declaring the change complete.
- Do not run `pnpm test:mutation` (Stryker) as part of routine implementation; it is on-demand only and known to have unreliable results (see repo mutation-testing notes) — don't use mutation scores as a completion gate.
