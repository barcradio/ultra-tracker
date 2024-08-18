const fs = require("fs");
const path = require("path");
const { app, dialog } = require("electron");

export const selectStationsFile = async (): Promise<string[]> => {
  const dialogConfig = {
    title: "Select a starting Stations file",
    buttonLabel: "Select",
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

export const loadAthleteFile = () => {
  const dialogConfig = {
    title: "Select a starting athletes file",
    buttonLabel: "Select",
    defaultPath: app.getPath("documents"),
    filters: [
      { name: "Readable File Types", extensions: ["csv", "json", "txt"] },
      { name: "All Files", extensions: ["*"] }
    ],
    properties: ["openFile"]
  };
  openFileDialog("showOpenDialog", dialogConfig)
    .then((result) => {
      console.log(result.canceled);
      console.log(result.filePaths);
      return result;
    })
    .catch((err) => {
      console.log(err);
    });
};

const openFileDialog = (method, params) => {
  return dialog[method](params);
};

export function initUserDirectories() {
  const userDocs = path.join(app.getPath("documents"), app.name);
  if (!fs.existsSync(userDocs)) fs.mkdir(userDocs);
}
