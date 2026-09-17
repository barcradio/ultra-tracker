# Ultra-Tracker Copilot Instructions

## Project Context

- Ultra-Tracker is an open-source Electron desktop application for recording athlete timing data during ultra marathons.
- The stack is TypeScript, React 19, Electron, Vite, TanStack Router/React Query, Tailwind CSS, PrimeReact, TypeORM, and better-sqlite3.
- Support Windows, Linux, and macOS. Preserve keyboard-driven station workflows and operator usability at practical race stations.
- The project is MIT-licensed and maintained by the Bridgerland Amateur Radio Club. Keep the existing attribution and license terms intact.

# Ultra-Tracker Copilot Instructions

## Decision Order For Any Change

Before writing code, stop at the first rung that holds:

1. Does this need to exist at all? If the requirement is speculative or not yet justified, skip it and say so.
2. Is it already in this codebase? Reuse it.
3. Does the standard library or platform already do it? Use that.
4. Can it be one line? One line.
5. Only then: the minimum code that works.

Additional rules:

- No abstraction with one caller.
- No config for a value that never changes.
- Shortest working diff wins.
- Do not add structure for future hypothetical requirements.

## Repository Conventions

- Use `pnpm` and keep `pnpm-lock.yaml` consistent when dependencies change.
- Follow the existing Prettier, ESLint, TypeScript, and commitlint rules.
- Keep changes focused; do not reformat unrelated code or edit generated output in `dist/` or `out/`.
- Treat generated files as generated; fix their source instead of hand-editing them.
- Keep privileged work in `src/main/`, UI in `src/renderer/src/`, and typed bridge logic in `src/preload/`.
- Keep the app secure: no unnecessary Node integration, no context-isolation weakening, no bypass of external-navigation protections.

## Documentation And Comments

- Unit tests and the commit history are the primary documentation of design and requirements.
- Write code comments only when they preserve a highly important concept, effect, or decision that would otherwise be easy to lose.
- Keep comments brief, local, and specific; do not add narrative comments or repetition.

## Data Integrity And Safety

- Prefer additive, reversible changes and preserve audit history.
- Validate and normalize IPC inputs at the main-process boundary.
- Respect existing timing rules and preserve backward compatibility for imported/exported data formats.
- Use transactions for atomic `better-sqlite3` work and avoid destructive database operations without a fail-safe path.

## Validation

- Test-first is not waste when it locks down a real requirement, but it is not a substitute for deciding whether the feature should exist or whether the minimal fix already exists.
- Run the narrowest relevant check first, then expand only as needed.
- Do not claim validation you did not run.

## Token And Context Optimization

- Start from the named file, symbol, error, test, or command; avoid broad repo reads.
- Do one targeted search and the minimum surrounding reads needed to confirm the root cause.
- Patch the smallest coherent slice; do not re-read unchanged files or broaden scope without evidence.
- Validate in the smallest relevant check first; stop once the fix is proven and avoid extra exploration.
- Keep progress and final summaries short: changed files, behavior, validation, and remaining risk only.

## Scope

- Keep instructions narrow to the layer they govern; use the specialized instruction files for domain-specific rules when needed.
- Prefer the small, explicit rule over broad policy repetition.
