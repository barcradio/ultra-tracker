import { ipcMain, dialog } from "electron";
import { Database } from 'better-sqlite3';


const init = () => {
    /**
     * IPC API
     * This is where we use native/server-side platform APIs (like NodeJS modules)
     */

    let db: Database = global.shared.dbConnection;

    // IPC test
    ipcMain.handle("ping-pong", async (_, message) => {
        let mybib: number = 56;
        console.log("ping-pong", message);
        const myRunner = db.prepare(`SELECT * FROM StartList WHERE Bib = ?`).get(mybib);
        console.log ("Runner Found: "+ myRunner.FirstName, myRunner.LastName, myRunner.City);
        return "pong: Message from main process";
    });

    ipcMain.handle("dialog:open", async (_, args) => {
        const result = await dialog.showOpenDialog({ properties: ["openFile"] });
        return result;
    });

};

export default {
    init,
};