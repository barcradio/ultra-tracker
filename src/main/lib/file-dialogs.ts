import fs from "fs";
import path from "path";
import { app, dialog } from "electron";
import appSettings from "electron-settings";

export const selectStationsFile = async (): Promise<string[]> => {
  const dialogConfig = {
    title: "Select a starting Stations file",
    defaultPath: AppPaths.eventConfig,
    filters: [
      { name: "Readable File Types", extensions: ["json"] },
      { name: "All Files", extensions: ["*"] }
    ],
    properties: ["openFile"]
  };

  const result = await openFileDialog("showOpenDialog", dialogConfig)
    .then((result) => {
      result.canceled ? console.log(result.canceled) : console.log(result.filePaths);
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
    defaultPath: AppPaths.eventConfig,
    filters: [
      { name: "Comma-Separated Values", extensions: ["csv"] },
      { name: "All Files", extensions: ["*"] }
    ],
    properties: ["openFile"]
  };
  const result = await openFileDialog("showOpenDialog", dialogConfig)
    .then((result) => {
      result.canceled ? console.log(result.canceled) : console.log(result.filePaths);
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
    defaultPath: AppPaths.userRoot,
    filters: [
      { name: "Comma-Separated Values", extensions: ["csv"] },
      { name: "All Files", extensions: ["*"] }
    ],
    properties: ["openFile"]
  };
  const result = await openFileDialog("showOpenDialog", dialogConfig)
    .then((result) => {
      result.canceled ? console.log(result.canceled) : console.log(result.filePaths);
      return result;
    })
    .catch((err) => {
      console.log(err);
    });
  return result.filePaths as string[];
};

export const saveRunnersToCSV = async (): Promise<string> => {
  const stationId = appSettings.getSync("station.id") as number;
  const formattedStationId = stationId.toLocaleString("en-US", {
    minimumIntegerDigits: 2,
    useGrouping: false
  });

  const dialogConfig = {
    title: "Specify an export file",
    defaultPath: path.join(AppPaths.userRoot, `Aid${formattedStationId}Times`),
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

export const saveDNSRunnersToCSV = async (): Promise<string> => {
  const stationId = appSettings.getSync("station.id") as number;
  const formattedStationId = stationId.toLocaleString("en-US", {
    minimumIntegerDigits: 2,
    useGrouping: false
  });

  const dialogConfig = {
    title: "Specify a DNS export file",
    defaultPath: path.join(AppPaths.userRoot, `Aid${formattedStationId}-dns`),
    filters: [
      { name: "Comma-Separated Values", extensions: ["csv"] },
      { name: "All Files", extensions: ["*"] }
    ]
  };

  const result = await openFileDialog("showSaveDialog", dialogConfig)
    .then((result) => {
      result.canceled ? console.log(result.canceled) : console.log(result.filePaths);
      return result;
    })
    .catch((err) => {
      console.log(err);
    });

  return result.filePath as string;
};

export const saveDNFRunnersToCSV = async (): Promise<string> => {
  const stationId = appSettings.getSync("station.id") as number;
  const formattedStationId = stationId.toLocaleString("en-US", {
    minimumIntegerDigits: 2,
    useGrouping: false
  });

  const dialogConfig = {
    title: "Specify a DNF export file",
    defaultPath: path.join(AppPaths.userRoot, `Aid${formattedStationId}-dnf`),
    filters: [
      { name: "Comma-Separated Values", extensions: ["csv"] },
      { name: "All Files", extensions: ["*"] }
    ]
  };

  const result = await openFileDialog("showSaveDialog", dialogConfig)
    .then((result) => {
      result.canceled ? console.log(result.canceled) : console.log(result.filePaths);
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
  for (const key in AppPaths) {
    if (!fs.existsSync(AppPaths[key])) fs.mkdirSync(AppPaths[key], { recursive: true });
  }
}

export const AppPaths = {
  userRoot: path.join(app.getPath("documents"), app.name),
  eventConfig: path.join(app.getPath("documents"), app.name, ".event-config"),
  appSettings: path.join(app.getPath("appData"), app.name)
};
