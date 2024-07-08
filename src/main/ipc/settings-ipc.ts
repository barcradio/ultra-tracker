import { ipcMain, dialog } from "electron";
import { Runner } from "../../shared/models";
import * as dbAPI from '../database/main-db'


const init = () => {
    /**
     * IPC API
     * This is where we use native/server-side platform APIs (like NodeJS modules)
     */

    ipcMain.handle("ping-pong", async (_, message) => {
        let mybib: number = randomIntFromInterval(1, 371);
        let result: string;
        let runner: Runner | undefined;

        console.log("ping-pong", message);

        [runner, result] = dbAPI.LookupStartListRunnerByBib(mybib);

        console.log (result);
        return `pong: ${result}`;
    });


    ipcMain.handle("dialog:open", async (_, args) => {
        const result = await dialog.showOpenDialog({ properties: ["openFile"] });
        return result;
    });

};

function randomIntFromInterval(min, max) { // min and max included 
    return Math.floor(Math.random() * (max - min + 1) + min);
}

export default {
    init,
};