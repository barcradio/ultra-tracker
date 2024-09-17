import fs from "fs";
import { ipcMain } from "electron";
import { Handler } from "../types";

const readResource: Handler<string, string | null> = (_, resourcePath) => {
  const fullPath = `./resources/${resourcePath}`;
  try {
    const fileContent = fs.readFileSync(fullPath, { encoding: "utf-8" });
    return fileContent;
  } catch (e) {
    if (e instanceof Error) console.error(e.message);
    return null;
  }
};

export const initResourceHandlers = () => {
  ipcMain.handle("get-resource", readResource);
};
