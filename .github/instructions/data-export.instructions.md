---
applyTo: "src/shared/**, src/main/ipc/export*, src/main/services/export*"
---

# Data Export & File Handling Guidelines

## CSV Validation Rules
- Automatically replace inline commas with semicolons (`;`) in all free-text notes fields before generating CSV payloads.
- Support the established auto-increment naming pattern for incremental exports, such as `Aid05Times_01i.csv` and `Aid05Times_02i.csv`.
- Preserve the established timestamp format for each export type. Use ISO 8601 only for a deliberately introduced format, with corresponding import and compatibility updates.

## Import Cleanup Procedures
- Clean and normalize raw incoming strings when parsing imported CSV or JSON files, including athlete roster, DNS, and DNF files.
- Never leave parsing errors unhandled. Log malformed rows with enough context to diagnose them and surface a safe warning without discarding valid rows.