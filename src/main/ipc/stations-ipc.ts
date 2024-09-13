import { ipcMain } from "electron";
import { StationDB, StationIdentity } from "$shared/models";
import * as dbStations from "../database/stations-db";
import { Handler } from "../types";

const getStationIdentity: Handler<StationIdentity> = () => {
  return dbStations.GetStationIdentity();
};
export const initStationHandlers = () => {
  ipcMain.handle("get-station-identity", getStationIdentity);
};
