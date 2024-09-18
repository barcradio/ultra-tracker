const Store = require("electron-store");

const schema = {
  initialized: { type: "boolean", default: false },
  targetLanguage: { type: "string", default: "eng" },
  incrementalFileIndex: { type: "number", default: 1 },
  event: {
    type: "object",
    properties: {
      name: { type: "string", default: "" },
      startline: { type: "string", default: "" },
      starttime: { type: "string", default: "" },
      finishline: { type: "string", default: "" },
      endtime: { type: "string", default: "" }
    }
    //required: ["name", "startline", "finishline"]
  },
  station: {
    type: "object",
    properties: {
      id: { type: "number", default: 0 },
      identifier: { type: "string", default: "" },
      name: { type: "string", default: "" },
      entryMode: { enum: ["Normal", "Fast", "InOnly", "OutOnly"], default: "Normal" },
      shiftBegin: { type: "string", default: "00:00:00 Jan 01 2024" },
      shiftEnd: { type: "string", default: "00:00:00 Jan 01 2024" },
      entrymode: { type: "number", default: 0 },
      operators: {
        type: "object",
        properties: {
          primary: {
            type: "object",
            properties: {
              fullname: { type: "string", default: "" },
              callsign: { type: "string", default: "" },
              phone: { type: "string", default: "" }
            }
          }
          //required: ["fullname, callsign"]
        }
      }
    }
    //required: ["primary"]
  }
  //required: ["id", "identifier", "name", "entryMode", "operators"]
};

const defaults = {
  initialized: false,
  targetLanguage: "eng",
  incrementalFileIndex: 1,
  event: {
    name: "ultra-marathon-2024",
    startline: "0-start-line",
    starttime: "00:00:00 Jan 01 2024",
    finishline: "99-finish-line",
    endtime: "00:00:00 Jan 01 2024"
  },
  station: {
    id: 1,
    identifier: "1-default-station",
    name: "Default Station",
    entryMode: "Normal",
    shiftBegin: "00:00:00 Jan 01 2024",
    shiftEnd: "00:00:00 Jan 01 2024",
    entrymode: 0,
    operators: {
      primary: {
        fullname: "Percy L. Spencer",
        callsign: "W1GBE-SK",
        phone: "999-999-9999"
      },
      secondary: {
        fullname: "Nolan Bushnell",
        callsign: "W7DUK-SK",
        phone: "999-999-9999"
      }
    }
  }
};

export const appStore = new Store({
  schema: schema,
  defaults: defaults,
  migrations: {},
  clearInvalidConfig: true
});

export const clearAppStore = () => {
  // const keys = ["targetLanguage", "incrementalFileIndex", "event", "station"];
  // appStore.reset(...keys);
  appStore.clear();
};
