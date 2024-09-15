import { ipcMain } from "electron";
import { Station, StationDB } from "$shared/models";
import { DatabaseResponse, SetStationIdentityParams } from "$shared/types";
import * as dbStations from "../database/stations-db";
import { Handler } from "../types";

const getStations: Handler<DatabaseResponse<StationDB>> = () => {
  return dbStations.GetStations();
};

const setStationIdentity: Handler<SetStationIdentityParams, Promise<Station>> = (_, identity) => {
  return dbStations.SetStationIdentity(identity);
};

export const initStationHandlers = () => {
  ipcMain.handle("get-stations-list", getStations);
  ipcMain.handle("set-station-identity", setStationIdentity);
};
