import stationData from "$resources/config/stations.json";
import { getDatabaseConnection } from "./connect";
import { DatabaseStatus, Operator, Station, StationDB } from "../../shared/models";

//TODO: we will need to set myStation, ought to create a settings table instaed of these hard-coded values
//import { data } from "../../preload/data";

export function LoadStations() {
  for (const index in stationData) {
    if (GetStations().length == stationData.stations.length) return;

    for (const key in stationData[index]) {
      insertStation(stationData[index][key]);
    }
  }
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
  let queryResult: StationDB | null = null;
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

  const loc = JSON.parse(queryResult.location);
  const ops = JSON.parse(queryResult.operators);

  // map result to station object
  const station: Station = {
    name: queryResult.name,
    identifier: queryResult.identifier,
    description: queryResult.description,
    location: { latitude: loc.latitude, longitude: loc.latitude },
    distance: queryResult.distance,
    split: Boolean(queryResult.split),
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
  const split: number = Number(station.split);
  const operators: string = JSON.stringify(station.operators);

  try {
    const query = db.prepare(
      `INSERT INTO Stations (name, identifier, description, location, distance, split, operators) VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    query.run(name, identifier, description, location, distance, split, operators);
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
      return [DatabaseStatus.Error, e.message];
    }
  }

  const message = `station:add ${identifier}, ${location}, ${distance}`;
  return [DatabaseStatus.Created, message];
}
