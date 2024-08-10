export type Handler<P = unknown, R = unknown> =
  | ((event: Electron.IpcMainInvokeEvent, param: P) => R)
  | ((event: Electron.IpcMainInvokeEvent) => R);
