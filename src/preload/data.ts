import fs from "fs";
import path from "path";
import { app } from "electron";
import appSettings from "electron-settings";
import { EntryMode } from "../shared/enums";

export const data = {
  targetLanguage: "eng"
};

export const initializeDefaultAppSettings = () => {
  appSettings.set({
    targetLanguage: "eng",
    event: {
      name: "ultra-marathon-2024",
      startline: "0-start-line",
      starttime: "00:00:00 Jan 01 2024",
      finishline: "99-finish-line",
      endtime: "00:00:00 Jan 01 2024"
    },
    station: {
      id: 1,
      identifier: "1-default-station",
      name: "Default Station",
      entryMode: EntryMode.Normal,
      shiftBegin: "00:00:00 Jan 01 2024",
      shiftEnd: "00:00:00 Jan 01 2024",
      entrymode: 0,
      operators: {
        primary: {
          name: "Percy L. Spencer",
          callsign: "W1GBE-SK",
          phone: ""
        },
        secondary: {
          name: "Nolan Bushnell",
          callsign: "W7DUK-SK",
          phone: ""
        }
      }
    },
    incrementalFileIndex: 1
  });
};

export const configureAppSettings = () => {
  appSettings.configure({
    atomicSave: true,
    fileName: "settings.json",
    numSpaces: 2,
    prettify: true
  });
};

export const resetAppSettings = () => {
  appSettings.reset();
  initializeDefaultAppSettings();
};

export const getAppSettings = () => {
  appSettings.reset();
  configureAppSettings();
  initializeDefaultAppSettings();
};

export const firstRun = () => {
  let isFirstTime;
  const settingsPath = path.resolve(path.join(app.getPath("appData"), app.name), "settings.json");

  try {
    configureAppSettings();

    if (!fs.existsSync(settingsPath)) {
      initializeDefaultAppSettings();
      isFirstTime = true;
    } else {
      isFirstTime = false;
    }
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
    }
  }

  return isFirstTime;
};
