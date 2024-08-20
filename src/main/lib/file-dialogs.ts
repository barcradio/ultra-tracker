const fs = require("fs");
const path = require("path");
const { app, dialog } = require("electron");

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
      { name: "Readable File Types", extensions: ["csv", "json", "txt"] },
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

export const loadRunnersFromCSV = async (): Promise<string[]> => {
  const dialogConfig = {
    title: "Select a runners file",
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
  const dialogConfig = {
    title: "Specify an export file",
    defaultPath: path.join(app.getPath("documents"), app.name, "Aid0XTimes"),
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
