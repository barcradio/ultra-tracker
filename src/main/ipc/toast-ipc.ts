import { Toast } from "$shared/types";
import { safeSend } from "../lib/webContents";

export const sendToastToRenderer = (toast: Toast) => {
  safeSend("create-toast", toast);
};
