import { Toast } from "$shared/types";
import { GetWebContents } from "../lib/webContents";

export const sendToastToRenderer = (toast: Toast) => {
  const webContents = GetWebContents();
  webContents?.send("create-toast", toast);
};
