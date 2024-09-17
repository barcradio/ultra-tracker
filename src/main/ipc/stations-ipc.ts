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

const getStationOperators: Handler<string, DatabaseResponse<Station["operators"]>> = (
  _,
  identifier
) => {
  const response = dbStations.GetStationByIdentifier(identifier);

  if (response[0] !== null) {
    return [response[0].operators, response[1], response[2]];
  } else {
    return [null, response[1], response[2]];
  }
};

export const initStationHandlers = () => {
  ipcMain.handle("get-stations-list", getStations);
  ipcMain.handle("set-station-identity", setStationIdentity);
  ipcMain.handle("get-station-operators", getStationOperators);
};
