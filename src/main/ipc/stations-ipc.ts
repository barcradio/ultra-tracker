import { ipcMain } from "electron";
import { StationDB, StationIdentity } from "$shared/models";
import { DatabaseResponse } from "$shared/types";
import * as dbStations from "../database/stations-db";
import { Handler } from "../types";

const getStations: Handler<DatabaseResponse<StationDB>> = () => {
  return dbStations.GetStations();
};

const getStationIdentity: Handler<StationIdentity> = () => {
  return dbStations.GetStationIdentity();
};

const setStationIdentity: Handler<StationIdentity, void> = (_, identity) => {
  dbStations.SetStationIdentity(identity);
  return true;
};

export const initStationHandlers = () => {
  ipcMain.handle("get-stations-list", getStations);
  ipcMain.handle("get-station-identity", getStationIdentity);
  ipcMain.handle("set-station-identity", setStationIdentity);
};
