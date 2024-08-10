import { ipcMain } from "electron";
import * as dbAPI from "../database/main-db";

// import { TimingRecord } from "../../shared/models";

export const init = () => {
  ipcMain.handle("StartListload", async () => {
    dbAPI.StartListLoadTable();
    // .StartListLoad(record);

    // const message: string = `timing-record:add ${record.bib}, ${record.datetime}, ${record.type.toString()} ${record.note}`;
    console.log("Startlistloadtable");
    // return message;
  });
};

export default {
  init
};
