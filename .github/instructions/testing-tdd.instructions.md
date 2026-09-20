---
applyTo: "src/**"
---

# Test-Driven Development

## Principle
- TDD is for real behavior, not speculative features.
- Write a failing test only after the need is justified and the smallest correct solution is clear.

## Workflow
- Add or extend a failing Vitest test for the behavior under change.
- For bug fixes, reproduce the bug in a regression test before the fix.
- Prefer an existing test file next to the module under test.
- Implement the minimal fix to make the test pass.
- Keep the suite green; do not leave it red between edits.

## Scope
- Apply TDD to logic with meaningful branches or invariants: validation, IPC handlers, database operations, formatters, and bug fixes.
- Skip trivial passthrough code, generated files, and markup without logic.
- Do not write tests for speculative abstractions or config-only changes that have no real behavior behind them.

## Running Tests
- Run the narrowest relevant test file(s) while iterating.
- Run the standard project validation before declaring the change complete.
- Do not treat mutation testing as a routine completion gate.
