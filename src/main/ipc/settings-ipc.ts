/* eslint-disable import/no-default-export */
import { ipcMain } from "electron";
import * as dbAPI from "../database/main-db";
import { Handler } from "../types";

const runnerLookup: Handler = () => {
  const randomBib = randomIntFromInterval(1, 371);

  let message: string = "";

  try {
    const runner = dbAPI.LookupAthleteByBib(randomBib);
    if (!runner) {
      message = `Bib #${randomBib} not found!`;
    } else {
      message = `Found #${runner.bib} ${runner.firstname} ${runner.lastname} ${runner.city}`;
    }
  } catch (e) {
    if (e instanceof Error) message = e.message;
  }

  console.log(message);
  return message;
};

export const initSettingsHandlers = () => {
  ipcMain.handle("runner-lookup", runnerLookup);
};

// ipcMain.handle("dialog:open", async (_, args) => {
//   const result = await dialog.showOpenDialog({ properties: ["openFile"] });
//   return result;
// });

function randomIntFromInterval(min: number, max: number) {
  // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
}
