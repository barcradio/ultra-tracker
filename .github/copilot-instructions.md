# Ultra-Tracker Copilot Instructions

## Project Context

- Ultra-Tracker is an open-source Electron desktop application for recording athlete timing data during ultra marathons.
- The stack is TypeScript, React 19, Electron, Vite, TanStack Router/React Query, Tailwind CSS, PrimeReact, TypeORM, and better-sqlite3.
- Support Windows, Linux, and macOS. Preserve keyboard-driven station workflows and operator usability at practical race stations.
- The project is MIT-licensed and maintained by the Bridgerland Amateur Radio Club. Keep the existing attribution and license terms intact.

## Repository Conventions

- Use `pnpm` for dependency and script execution, and keep `pnpm-lock.yaml` consistent when dependencies change.
- Commit messages must pass `commitlint` (`@commitlint/config-conventional`) on the first attempt: use the Conventional Commits format `type(scope): subject`, where `type` is one of `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, `test`; `scope` is optional and lowercase; `subject` is lowercase, uses the imperative mood, has no trailing period, and the full header stays under 100 characters. Add a body/footer only when more explanation is needed, separated from the header by a blank line.
- Use the existing Prettier, ESLint, and TypeScript configuration. Prefer the repository's aliases and established component patterns.
- Keep changes focused. Do not reformat unrelated code, rename public APIs without a migration, or edit generated/build output in `dist/` or `out/`.
- Treat `src/renderer/src/routeTree.gen.ts` and other generated files as generated; change their source/configuration instead of hand-editing them when possible.
- Preserve ASCII in new files unless non-ASCII text is required by an existing user-facing convention.
- Do not add license headers or copied third-party code. For new dependencies, check compatibility with the MIT project and record required attribution or license notices.
- Use functional React components with strict TypeScript types.
- Prefer Tailwind CSS utility classes over custom CSS or inline styles, while reusing existing shared styles and components.
- Follow the repository's ESLint, Prettier, and Commitlint standards.

## Electron Architecture

- Keep privileged work in `src/main/`, including filesystem access, database access, RFID hardware, logging, and OS integration.
- Expose renderer capabilities through the existing typed preload bridge in `src/preload/`; do not give renderer code direct Node.js or Electron access.
- Keep UI and presentation logic in `src/renderer/src/`. Use IPC handlers for main-process operations and follow existing IPC naming and error-handling patterns.
- Validate and normalize all IPC input at the main-process boundary. Never trust renderer-provided paths, identifiers, file contents, or status values.
- Preserve secure BrowserWindow behavior: do not enable unnecessary Node integration, weaken context isolation, or bypass external-navigation protections.
- Keep REST API clients and other network or privileged integrations out of renderer components; expose them through the same typed preload and IPC boundary.

## Data Integrity And Domain Rules

- Timing records are operational data. Prefer additive, reversible changes and preserve existing records and audit logs.
- Never silently discard imported or recorded data. Surface validation and import errors clearly to operators and log actionable details.
- Respect existing timing rules: an In time is required, In must precede Out, and commas in notes must be normalized consistently with current behavior.
- Database schema changes require a migration and compatibility review. Do not modify local database files with ad hoc scripts or destructive shortcuts.
- Treat destructive settings and recovery operations as high risk. Require the existing confirmation flow and update user-facing documentation when behavior changes.
- Keep CSV, JSON, station, athlete, DNS, DNF, export, and recovery formats backward-compatible unless a deliberate format change is requested.
- Use prepared statements and transactions for `better-sqlite3` operations.
- Make persistence robust against unexpected local power loss and retain the automatic backup and CSV recovery paths.
- Do not add destructive database operations without a fail-safe fallback.

## UI And Accessibility

- Reuse existing shared components, design tokens, and PrimeReact/Tailwind patterns before adding new abstractions.
- Keep layouts usable at the supported desktop resolutions and with display scaling. Do not make keyboard shortcuts, focus management, or readable status/warning states regress.
- Use semantic controls, labels, accessible names, and keyboard support. Preserve focus behavior in modals, drawers, forms, and data grids.
- Keep operator-facing text concise and consistent with the terminology in the README and existing UI.
- Preserve the 10-key and keyboard shortcuts used for high-speed race logging, including `Equal`, `Minus`, `Slash`, and `Numpad-Add`.

## Validation

- After a code change, run the narrowest relevant check first, then broaden only when needed:
  - `pnpm exec eslint <changed-files>`
  - `pnpm run typecheck:node` for main/preload changes
  - `pnpm run typecheck:web` for renderer changes
  - `pnpm run build` for cross-boundary or packaging-sensitive changes
- Add or update focused tests when a test harness exists for the touched behavior. If no tests exist, validate with the relevant typecheck/lint/build command and state any remaining risk.
- Do not claim validation you did not run. Report unrelated pre-existing failures separately.
- Treat ESLint and Prettier compliance as part of the initial implementation: follow nearby formatting conventions, run the scoped ESLint check after edits, and correct formatting or lint errors before declaring work complete.

## Token And Context Optimization

- Start from the named file, symbol, error, test, or command. Search narrowly and read only the surrounding code needed to identify the owner of the behavior.
- Form one concrete hypothesis and one cheap falsifying check before editing. Stop exploring once the controlling path is known.
- Prefer symbol/reference search and targeted snippets over reading whole directories or large generated files. Do not reload unchanged files or repeat repository explanations.
- Make the smallest coherent patch. Avoid speculative refactors, duplicate helpers, verbose comments, and broad documentation changes.
- Run one focused validation immediately after the first substantive edit. Fix failures in the same slice before expanding scope.
- Keep progress updates and final summaries concise: mention changed files, behavior, validation commands, and unresolved risk only.
- Reuse existing abstractions and names; do not invent parallel patterns just to avoid inspecting a nearby implementation.
- When requirements are ambiguous, ask one focused question only after local evidence cannot resolve the ambiguity. Otherwise choose the least surprising behavior and document the assumption briefly.
