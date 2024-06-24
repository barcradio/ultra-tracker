import { ReactNode, useState } from "react";
import { createPortal } from "react-dom";
import { ToastComponent } from "./ToastComponent";
import { ToastsContext, Toast, InternalToast } from "./ToastsContext";

export function ToastProvider(props: { children: ReactNode }) {
  const portalRoot = document.getElementById("portal-root") as HTMLElement;

  const [toasts, setToasts] = useState<InternalToast[]>([]);
  const [timeouts, setTimeouts] = useState<NodeJS.Timeout[]>([]);

  const createToast = (toast: Toast) => {
    const id = Date.now();
    setToasts([...toasts, { ...toast, id }]);

    const timeout = setTimeout(() => {
      removeToast(id);
    }, 5000);

    setTimeouts([...timeouts, timeout]);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastsContext.Provider value={{ createToast, removeToast }}>
      {props.children}
      {createPortal(
        <div className="fixed right-0 bottom-0">
          {toasts
            .sort((a, b) => (a.id < b.id ? -1 : 1))
            .map((toast) => {
              return <ToastComponent key={toast.id} toast={toast} />;
            })}
        </div>,
        portalRoot
      )}
    </ToastsContext.Provider>
  );
}
