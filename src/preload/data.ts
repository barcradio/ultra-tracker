import settings from "electron-settings";
import { EntryMode } from "../shared/enums";

export const data = {
  targetLanguage: "eng",
};

export const initializeDefaultAppSettings = () => {
  settings.configure({
    atomicSave: true,
    fileName: "settings.json",
    numSpaces: 2,
    prettify: true
  });

  const firstRun = require("electron-first-run");
  if (!firstRun()) return;

  settings.set({
    targetLanguage: "eng",
    event: {
      name: "ultra-marathon-2024"
    },
    station: {
      name: "5-temple-fork",
      id: 5,
      entryMode: EntryMode.Normal
    },
    incrementalFileIndex: 1
  });
};
