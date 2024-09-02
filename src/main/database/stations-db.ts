import appSettings from "electron-settings";
import { DatabaseStatus, EntryMode } from "$shared/enums";
import { DatabaseResponse } from "$shared/types";
import { getDatabaseConnection } from "./connect-db";
import { clearStationsTable, createStationsTable } from "./tables-db";
import { Operator, Station, StationDB, StationIdentity } from "../../shared/models";
import { selectStationsFile } from "../lib/file-dialogs";

export async function LoadStations() {
  //const devStationData = require("$resources/config/stations.json");
  const stationFilePath = await selectStationsFile();
  const stationData = require(stationFilePath[0]); // natively imports JSON data to object

  if (!stationData) return "Invalid JSON file.";

  for (const index in stationData) {
    if (GetStations().length > 0) {
      clearStationsTable();
      createStationsTable();
    }
    if (index == "event") {
      await appSettings.set("event.name", stationData.event.name);
      await appSettings.set("event.starttime", stationData.event.starttime);
      await appSettings.set("event.endtime", stationData.event.endtime);
    }

    if (index == "stations") {
      const stations: Station[] = GetStations();
      if (stations == null) createStationsTable();

      if (GetStations().length > 0) {
        clearStationsTable();
        createStationsTable();
      }

      for (const key in stationData.stations) {
        insertStation(stationData[index][key]);
      }
    }
  }
  const stationIdentifier = appSettings.getSync("station.identifier") as string;
  setStation(stationIdentifier);

  return `${stationFilePath}\r\n${stationData.stations.length} stations imported`;
}

export async function setStation(stationIdentifier: string) {
  const selectedStation: Station | null = GetStationByIdentifier(stationIdentifier)?.[0];
  if (!selectedStation) return;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const rankWords = [
    "primary",
    "secondary",
    "tertiary",
    "quaternary",
    "quinary",
    "senary",
    "septenary",
    "octonary",
    "nonary",
    "denary"
  ];

  await appSettings.set("station.name", selectedStation.name);
  await appSettings.set("station.identifier", selectedStation.identifier);
  await appSettings.set("station.entrymode", selectedStation.entrymode);

  for (const key in selectedStation.operators as Operator[]) {
    await appSettings.set(`station.operators.${key}.name`, selectedStation.operators[key].fullname);
    await appSettings.set(
      `station.operators.${key}.callsign`,
      selectedStation.operators[key].callsign
    );
    await appSettings.set(`station.operators.${key}.phone`, selectedStation.operators[key].phone);
    await appSettings.set(
      `station.operators.${key}.shiftBegin`,
      selectedStation.operators[key].shiftBegin as unknown as string
    );
    await appSettings.set(
      `station.operators.${key}.shiftEnd`,
      selectedStation.operators[key].shiftEnd as unknown as string
    );
  }
}

export function GetStationIdentity(): StationIdentity {
  const stationName = appSettings.getSync("station.name") as string;
  const stationIdentifier = appSettings.getSync("station.identifier") as string;
  const stationCallsign = appSettings.getSync("station.operators.primary.callsign") as string;

  return {
    aidStation: `${stationIdentifier.split("-", 1)} ${stationName}`,
    callsign: stationCallsign
  };
}

export function GetStations(): Station[] {
  const db = getDatabaseConnection();

  try {
    const query = db.prepare(`SELECT * FROM Stations`);
    const dataset = query.all();
    console.log(`table Read Stations - records:${dataset.length}`);
    return dataset as Station[];
  } catch (e) {
    if (e instanceof Error) console.error(e.message);
    return [];
  }
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
    cutofftime: new Date(queryResult.cutofftime),
    entrymode: queryResult.entrymode as EntryMode,
    operators: ops as Operator[]
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
  const cutofftime: string = new Date(station.cutofftime).toISOString();
  const entrymode: number = Number(station.entrymode);
  const operators: string = JSON.stringify(station.operators);

  try {
    const query = db.prepare(
      `INSERT INTO Stations (name, identifier, description, location, dropbags, crewaccess, paceraccess, distance, cutofftime, entrymode, operators) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
      cutofftime,
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
