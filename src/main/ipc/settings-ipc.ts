/* eslint-disable import/no-default-export */
import { ipcMain } from "electron";
import * as dbAthlete from "../database/athlete-db";
import { Handler } from "../types";

const runnerLookup: Handler = () => {
  const randomBib = randomIntFromInterval(1, 371);

  let message: string = "";

  try {
    const result = dbAthlete.GetAthleteByBib(randomBib);
    const runner = result[0];

    if (!runner) {
      message = `Bib #${randomBib} not found!`;
    } else {
      message = `Found #${runner.bibId} ${runner.firstName} ${runner.lastName} ${runner.city}`;
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

function randomIntFromInterval(min: number, max: number) {
  // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
}
