import appSettings from "electron-settings";
import { EntryMode } from "../shared/enums";

export const data = {
  targetLanguage: "eng"
};

export const initializeDefaultAppSettings = () => {
  appSettings.set({
    targetLanguage: "eng",
    event: {
      name: "ultra-marathon-2024"
    },
    station: {
      id: 5,
      identifier: "5-temple-fork",
      name: "Temple Fork",
      entryMode: EntryMode.Normal,
      shiftBegin: "00:00:00 Jan 01 2024",
      shiftEnd: "00:00:00 Jan 01 2024",
      entrymode: 0,
      operators: {
        primary: {
          name: "Francesco Cossiga",
          callsign: "I0FCG",
          phone: ""
        },
        secondary: {
          name: "Carlos Saul Menem",
          callsign: "LU1SM",
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
