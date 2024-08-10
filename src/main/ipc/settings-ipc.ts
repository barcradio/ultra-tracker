/* eslint-disable import/no-default-export */
import { ipcMain } from "electron";
import { Runner } from "../../shared/models";
import * as dbAPI from "../database/main-db";

export const init = () => {
  /**
   * IPC API
   * This is where we use native/server-side platform APIs (like NodeJS modules)
   */

  ipcMain.handle("runner-lookup", async (_, message) => {
    const bibNumber: number = randomIntFromInterval(1, 371);
    let result: string;
    let runner: Runner | undefined;

    console.log("ping-pong", message);

    try {
      runner = dbAPI.LookupAthletesRunnerByBib(bibNumber);
    } catch (e: unknown) {
      if (e instanceof Error) result = e.message;
    }

    if (runner == undefined) return `Bib #${bibNumber} not found!`;

    result = `Found #${runner.bib} ${runner.firstname} ${runner.lastname} ${runner.city}`;
    console.log(result);

    return result;
  });

  // ipcMain.handle("dialog:open", async (_, args) => {
  //   const result = await dialog.showOpenDialog({ properties: ["openFile"] });
  //   return result;
  // });
};

function randomIntFromInterval(min, max) {
  // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
}

export default {
  init
};
