import { ReactNode, useState } from "react";
import { compareAsc } from "date-fns";
import { createPortal } from "react-dom";
import { v4 as uuid } from "uuid";
import { ToastComponent } from "./ToastComponent";
import { ToastsContext, Toast, InternalToast } from "./ToastsContext";

const DEFAULT_TIMEOUT = 5000;

export function ToastProvider(props: { children: ReactNode }) {
  const portalRoot = document.getElementById("portal-root") as HTMLElement;

  const [toasts, setToasts] = useState<InternalToast[]>([]);

  const createToast = (toast: Toast) => {
    setToasts([
      ...toasts,
      {
        ...toast,
        id: uuid(),
        epoch: new Date(),
        timeoutMs: toast.timeoutMs ?? DEFAULT_TIMEOUT
      }
    ]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastsContext.Provider value={{ createToast }}>
      {props.children}
      {toasts.length > 0 &&
        createPortal(
          <div className="fixed right-0 bottom-0">
            {toasts
              .sort((a, b) => compareAsc(a.epoch, b.epoch))
              .map((toast) => (
                <ToastComponent key={toast.id} toast={toast} removeToast={removeToast} />
              ))}
          </div>,
          portalRoot
        )}
    </ToastsContext.Provider>
  );
}
