import fs from "fs";
import path from "path";
import { app, dialog } from "electron";
import settings from "electron-settings";

export const selectStationsFile = async (): Promise<string[]> => {
  const dialogConfig = {
    title: "Select a starting Stations file",
    defaultPath: path.join(app.getPath("documents"), app.name),
    filters: [
      { name: "Readable File Types", extensions: ["json"] },
      { name: "All Files", extensions: ["*"] }
    ],
    properties: ["openFile"]
  };

  const result = await openFileDialog("showOpenDialog", dialogConfig)
    .then((result) => {
      console.log(result.canceled);
      console.log(result.filePaths);
      return result;
    })
    .catch((err) => {
      console.log(err);
    });

  return result.filePaths as string[];
};

export const loadAthleteFile = async (): Promise<string[]> => {
  const dialogConfig = {
    title: "Select a starting athletes file",
    defaultPath: path.join(app.getPath("documents"), app.name),
    filters: [
      { name: "Comma-Separated Values", extensions: ["csv"] },
      { name: "All Files", extensions: ["*"] }
    ],
    properties: ["openFile"]
  };
  const result = await openFileDialog("showOpenDialog", dialogConfig)
    .then((result) => {
      console.log(result.canceled);
      console.log(result.filePaths);
      return result;
    })
    .catch((err) => {
      console.log(err);
    });
  return result.filePaths as string[];
};

export const loadRunnersFromCSV = (): Promise<string[]> => {
  return loadFromCSV("Select a runners file");
};

export const loadDNSFromCSV = (): Promise<string[]> => {
  return loadFromCSV("Select a DNS file");
};

export const loadDNFFromCSV = (): Promise<string[]> => {
  return loadFromCSV("Select a DNF file");
};

export const loadFromCSV = async (title: string): Promise<string[]> => {
  const dialogConfig = {
    title: title,
    defaultPath: path.join(app.getPath("documents"), app.name),
    filters: [
      { name: "Comma-Separated Values", extensions: ["csv"] },
      { name: "All Files", extensions: ["*"] }
    ],
    properties: ["openFile"]
  };
  const result = await openFileDialog("showOpenDialog", dialogConfig)
    .then((result) => {
      console.log(result.canceled);
      console.log(result.filePaths);
      return result;
    })
    .catch((err) => {
      console.log(err);
    });
  return result.filePaths as string[];
};

export const saveRunnersToCSV = async (): Promise<string> => {
  const stationId = settings.getSync("station.id") as number;
  const formattedStationId = stationId.toLocaleString("en-US", {
    minimumIntegerDigits: 2,
    useGrouping: false
  });

  const dialogConfig = {
    title: "Specify an export file",
    defaultPath: path.join(app.getPath("documents"), app.name, `Aid${formattedStationId}Times`),
    filters: [
      { name: "Comma-Separated Values", extensions: ["csv"] },
      { name: "All Files", extensions: ["*"] }
    ]
  };

  const result = await openFileDialog("showSaveDialog", dialogConfig)
    .then((result) => {
      console.log(result.canceled);
      console.log(result.filePath);
      return result;
    })
    .catch((err) => {
      console.log(err);
    });

  return result.filePath as string;
};

const openFileDialog = (method, params) => {
  return dialog[method](params);
};

export function initUserDirectories() {
  const userDocs = path.join(app.getPath("documents"), app.name);

  //if (!fs.existsSync(app.getPath("documents"))) return;

  if (!fs.existsSync(userDocs)) {
    fs.mkdirSync(userDocs);
  }
}
