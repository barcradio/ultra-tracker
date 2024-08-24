import { clearStationsTable, getDatabaseConnection } from "./connect-db";
import { DatabaseStatus, EntryMode, Operator, Station, StationDB } from "../../shared/models";
import { selectStationsFile } from "../lib/file-dialogs";
import { data } from "../../preload/data";

//TODO: we will need to set myStation, ought to create a settings table instaed of these hard-coded values
//import { data } from "../../preload/data";

export async function LoadStations() {
  //const devStationData = require("$resources/config/stations.json");
  const stationFilePath = await selectStationsFile();
  const stationData = require(stationFilePath[0]); // natively imports JSON data to object

  if (!stationData) return "Invalid JSON file.";

  for (const index in stationData) {
    if (GetStations().length > 0) {
      clearStationsTable();
    }
    if (index == "event") data.event.name = stationData.event[0];

    if (index == "stations") {
      for (const key in stationData.stations) {
        insertStation(stationData[index][key]);
      }
    }
  }

  return `${stationFilePath}\r\n${stationData.stations.length} stations imported`;
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

export function GetStationByIdentifier(
  identifier: string
): [Station | null, DatabaseStatus, string] {
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

  message = `stations:Found station with identifier: ${station.name}`;
  console.log(message);
  return [station, DatabaseStatus.Success, message];
}

export function insertStation(station: Station): [DatabaseStatus, string] {
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
