/* eslint-disable import/no-default-export */
import { ipcMain } from "electron";
import { TimingRecord } from "../../shared/models";
import * as dbAPI from "../database/main-db";

export const init = () => {
  ipcMain.handle("add-timing-record", async (_, record: TimingRecord) => {
    dbAPI.InsertOrUpdateTimingRecord(record);

    const message: string = `timing-record:add ${record.bib}, ${record.datetime}, ${record.type.toString()} ${record.note}`;
    console.log(message);
    return message;
  });
};

export default {
  init
};
