---
applyTo: "src/main/**, src/preload/**"
---

# Main Process & Database Guidelines

- Keep privileged work in `src/main/` and keep renderer code out of Node/Electron access.
- Validate and normalize IPC arguments before writes or filesystem operations.
- Use explicit transactions for atomic `better-sqlite3` work and keep migrations compatible with existing data.
- Keep hardware integrations in the main process and contain failures with timeouts and cleanup.
- Use typed `ipcMain.handle` / `ipcRenderer.invoke` pairs and keep the preload bridge as the boundary.