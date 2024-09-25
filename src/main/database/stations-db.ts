import fs from "fs";
import { format } from "date-fns";
import { DatabaseStatus } from "$shared/enums";
import { DatabaseResponse, SetStationIdentityParams } from "$shared/types";
import { getDatabaseConnection } from "./connect-db";
import { clearStationsTable, createStationsTable } from "./tables-db";
import { Station, StationDB } from "../../shared/models";
import * as dialogs from "../lib/file-dialogs";
import { appStore } from "../lib/store";

export function formatDate(date: Date | null): string {
  if (date == null) return "";

  return format(date, "HH:mm:ss dd LLL yyyy");
}

interface stationsJSON {
  event: EventJSON;
  stations: Array<Station>;
}

interface EventJSON {
  name: string;
  starttime: Date;
  endtime: Date;
}

function importJsonFile(filePath: string): stationsJSON {
  const fileContent = fs.readFileSync(filePath, "utf-8");
  let jsonData;
  try {
    jsonData = JSON.parse(fileContent);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error parsing JSON file: ${error.message}`);
    }
  }
  return jsonData;
}

export async function LoadStations() {
  //const devStationData = require("$resources/config/stations.json");
  const stationFilePath = await dialogs.selectStationsFile();
  const stationData = importJsonFile(stationFilePath[0]);

  if (!stationData) return "Invalid JSON file.";

  for (const index in stationData) {
    if (index == "event") {
      appStore.set("event.name", stationData.event.name);
      appStore.set("event.starttime", formatDate(stationData.event.starttime));
      appStore.set("event.endtime", formatDate(stationData.event.endtime));
    }

    if (index == "stations") {
      const [stations] = GetStations();
      if (stations == null) createStationsTable();

      if (GetStations().length > 0) {
        clearStationsTable();
        createStationsTable();
      }

      for (const key in stationData.stations) {
        if (key == "0") appStore.set("event.startline", stationData[index][key].identifier);
        if (key == (stationData.stations.length - 1).toString())
          appStore.set("event.finishline", stationData[index][key].identifier);

        insertStation(stationData[index][key]);
      }
    }
  }
  const stationIdentifier = appStore.get("station.identifier") as string;
  setStation(stationIdentifier);

  return `${stationFilePath}\r\n${stationData.stations.length} stations imported`;
}

export async function setStation(stationIdentifier: string) {
  const selectedStation: Station | null = GetStationByIdentifier(stationIdentifier)?.[0];
  if (!selectedStation) return;

  appStore.set("station.name", selectedStation.name);
  appStore.set("station.id", Number(selectedStation.identifier.split("-", 1)[0]));
  appStore.set("station.identifier", selectedStation.identifier);
  appStore.set("station.entrymode", selectedStation.entrymode);
  appStore.set(`station.shiftBegin`, formatDate(selectedStation.shiftBegin));
  appStore.set(`station.cutofftime`, formatDate(selectedStation.cutofftime));
  appStore.set(`station.shiftEnd`, formatDate(selectedStation.shiftEnd));

  for (const key in selectedStation.operators) {
    appStore.set(`station.operators.${key}.fullname`, selectedStation.operators[key].fullname);
    appStore.set(`station.operators.${key}.callsign`, selectedStation.operators[key].callsign);
    appStore.set(`station.operators.${key}.phone`, selectedStation.operators[key].phone);
    appStore.set(`station.operators.${key}.active`, false);
  }

  appStore.set("station.operators.primary.active", true);
}

export async function SetStationIdentity(params: SetStationIdentityParams) {
  await setStation(params.identifier);
  const settings = appStore.get("station") as unknown as Station;

  const key = Object.keys(settings.operators).find(
    (operator) => settings.operators[operator].callsign == params.callsign
  );

  for (const operator in settings.operators) {
    appStore.set(`station.operators.${operator}.active`, false);
  }

  appStore.set(`station.operators.${key}.active`, true);

  return settings;
}

export function GetStations(): DatabaseResponse<StationDB[]> {
  const db = getDatabaseConnection();
  let message: string = "";
  let queryResult: StationDB[] | null = null;

  try {
    const query = db.prepare(`SELECT * FROM Stations`);
    queryResult = query.all() as StationDB[] | null;
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [null, DatabaseStatus.Error, e.message];
    }
  }

  if (queryResult == null) return [null, DatabaseStatus.NotFound, message];

  message = `table Read Stations - records:${queryResult?.length}`;

  console.log(message);
  return [queryResult, DatabaseStatus.Success, message];
}

export function GetStationByIdentifier(identifier: string): DatabaseResponse<Station> {
  const db = getDatabaseConnection();
  let queryResult;
  let message: string = "";

  try {
    queryResult = db.prepare(`SELECT * FROM Stations WHERE identifier = ?`).get(identifier);
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [null, DatabaseStatus.Error, e.message];
    }
  }

  if (queryResult == null) return [null, DatabaseStatus.NotFound, message];

  queryResult = queryResult as StationDB;

  const loc = JSON.parse(queryResult.location);
  const ops = JSON.parse(queryResult.operators);

  // map result to station object
  const station: Station = {
    name: queryResult.name,
    identifier: queryResult.identifier,
    description: queryResult.description,
    location: { latitude: loc.latitude, longitude: loc.latitude, elevation: loc.elevation },
    distance: queryResult.distance,
    dropbags: queryResult.dropbags,
    crewaccess: queryResult.crewaccess,
    paceraccess: queryResult.paceraccess,
    shiftBegin: new Date(queryResult.shiftBegin),
    cutofftime: new Date(queryResult.cutofftime),
    shiftEnd: new Date(queryResult.shiftEnd),
    entrymode: queryResult.entrymode,
    operators: ops
  };

  message = `stations:Found station with identifier: ${station.identifier}`;
  console.log(message);
  return [station, DatabaseStatus.Success, message];
}

export function insertStation(station: Station): DatabaseResponse {
  const db = getDatabaseConnection();

  const name: string = station.name;
  const identifier: string = station.identifier;
  const description: string = station.description;
  const location: string = JSON.stringify(station.location);
  const distance: number = station.distance;
  const dropbags: number = Number(station.dropbags);
  const crewaccess: number = Number(station.crewaccess);
  const paceraccess: number = Number(station.paceraccess);
  const shiftBegin: string = new Date(station.shiftBegin).toISOString();
  const cutofftime: string = new Date(station.cutofftime).toISOString();
  const shiftEnd: string = new Date(station.shiftEnd).toISOString();
  const entrymode: number = Number(station.entrymode);
  const operators: string = JSON.stringify(station.operators);

  try {
    const query = db.prepare(
      `INSERT INTO Stations (name, identifier, description, location, dropbags, crewaccess, paceraccess, distance, shiftBegin, cutofftime, shiftEnd, entrymode, operators) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    query.run(
      name,
      identifier,
      description,
      location,
      dropbags,
      crewaccess,
      paceraccess,
      distance,
      shiftBegin,
      cutofftime,
      shiftEnd,
      entrymode,
      operators
    );
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [DatabaseStatus.Error, e.message];
    }
  }

  const message = `station:add ${identifier}, ${location}, ${distance}`;
  return [DatabaseStatus.Created, message];
}
