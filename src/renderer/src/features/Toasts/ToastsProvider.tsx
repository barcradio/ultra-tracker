import { ReactNode, useEffect, useState } from "react";
import { compareAsc } from "date-fns";
import { createPortal } from "react-dom";
import { v4 as uuid } from "uuid";
import { usePortalRoot } from "~/hooks/dom/usePortalRoot";
import { useIpcRenderer } from "~/hooks/useIpcRenderer";
import { Toast } from "$shared/types";
import { ToastComponent } from "./ToastComponent";
import { InternalToast, ToastsContext } from "./ToastsContext";

const DEFAULT_TIMEOUT = 5000;

function useMainToastListener(createToast: (toast: Toast) => void) {
  const ipcRenderer = useIpcRenderer();

  useEffect(() => {
    ipcRenderer.on("create-toast", (_event, toast: Toast) => {
      createToast(toast);
    });
  }, [createToast, ipcRenderer]);
}

export function ToastProvider(props: { children: ReactNode }) {
  const rootRef = usePortalRoot();

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

  useMainToastListener(createToast);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastsContext.Provider value={{ createToast }}>
      {props.children}
      {toasts.length > 0 &&
        createPortal(
          <div className="fixed right-0 bottom-0 z-50 pointer-events-none">
            {toasts
              .sort((a, b) => compareAsc(a.epoch, b.epoch))
              .map((toast) => (
                <ToastComponent key={toast.id} toast={toast} removeToast={removeToast} />
              ))}
          </div>,
          rootRef.current
        )}
    </ToastsContext.Provider>
  );
}
