---
applyTo: "src/shared/**, src/main/ipc/export*, src/main/services/export*"
---

# Data Export & File Handling Guidelines

- Normalize free-text fields before CSV output and preserve the established export naming and timestamp formats.
- Clean and normalize incoming CSV/JSON strings without silently dropping valid rows.
- Log malformed rows and surface warnings but keep backward compatibility for existing import/export formats.