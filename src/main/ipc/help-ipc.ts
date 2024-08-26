import fs from "fs";
import { ipcMain } from "electron";

async function readHelpFile() {
  const helpPath = "./resources/get-started.md";
  try {
    const fileContent = fs.readFileSync(helpPath, { encoding: "utf-8" });
    return fileContent;
  } catch (e) {
    if (e instanceof Error) console.error(e.message);
    return null;
  }
}

export const initHelpHandlers = () => {
  ipcMain.handle("get-help-document", readHelpFile);
};
