---
applyTo: "src/main/**, src/preload/**"
---

# Main Process & Database Guidelines

## Database Operations (`better-sqlite3`)
- Execute local SQLite queries synchronously in the Main process, as required by `better-sqlite3`.
- Wrap multi-statement or logically atomic operations in explicit transactions (`db.transaction(...)`) to preserve data integrity during sudden shutdowns.
- Keep schema migrations isolated, version-controlled, and compatible with existing databases.

## IPC Handlers
- Use strongly typed `ipcMain.handle` patterns paired with matching `ipcRenderer.invoke` declarations in preload scripts.
- Validate and normalize all incoming arguments inside IPC handlers before executing database writes or filesystem operations.

## Hardware Integrations
- Keep hardware reader services, such as Zebra FXR90 RFID support, in the Main process or an explicitly designed worker/service boundary.
- Contain hardware errors with timeouts, cleanup, and error handling so a reader failure does not terminate the application or corrupt database work. Do not introduce a new worker/service architecture unless the change requires it.