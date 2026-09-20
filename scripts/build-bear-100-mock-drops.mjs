import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mockDataDirectory = path.join(root, "resources", "config", "mock-data");
const stationConfig = JSON.parse(
  fs.readFileSync(path.join(mockDataDirectory, "Bear100_2026_stations_v1_mock.json"), "utf8")
);

const dropsByStation = {
  "0-start-line": [
    [17, "did-not-start", "05:08:00 25 Sep 2026"],
    [42, "did-not-start", "05:13:00 25 Sep 2026"],
    [76, "did-not-start", "05:19:00 25 Sep 2026"],
    [103, "did-not-start", "05:24:00 25 Sep 2026"],
    [128, "did-not-start", "05:31:00 25 Sep 2026"],
    [151, "did-not-start", "05:37:00 25 Sep 2026"],
    [179, "did-not-start", "05:43:00 25 Sep 2026"],
    [204, "did-not-start", "05:48:00 25 Sep 2026"],
    [226, "did-not-start", "05:52:00 25 Sep 2026"],
    [247, "did-not-start", "05:55:00 25 Sep 2026"],
    [286, "did-not-start", "05:57:00 25 Sep 2026"],
    [319, "did-not-start", "05:59:00 25 Sep 2026"]
  ],
  "1-logan-peak": [
    [14, "withdrew", "07:12:00 25 Sep 2026"],
    [198, "medical", "07:46:00 25 Sep 2026"],
    [308, "timeout", "08:21:00 25 Sep 2026"]
  ],
  "2-leatham-hollow": [
    [61, "withdrew", "08:58:00 25 Sep 2026"],
    [143, "medical", "09:36:00 25 Sep 2026"],
    [271, "timeout", "10:14:00 25 Sep 2026"]
  ],
  "3-richards-hollow": [
    [35, "withdrew", "10:51:00 25 Sep 2026"],
    [112, "medical", "11:27:00 25 Sep 2026"],
    [295, "timeout", "12:04:00 25 Sep 2026"]
  ],
  "4-righthand-fork": [
    [83, "withdrew", "12:38:00 25 Sep 2026"],
    [167, "medical", "13:12:00 25 Sep 2026"],
    [325, "timeout", "13:49:00 25 Sep 2026"]
  ],
  "5-temple-fork": [
    [29, "withdrew", "14:17:00 25 Sep 2026"],
    [218, "medical", "14:43:00 25 Sep 2026"],
    [302, "timeout", "15:06:00 25 Sep 2026"]
  ],
  "6-tony-grove": [
    [94, "withdrew", "15:24:00 25 Sep 2026"],
    [156, "medical", "15:36:00 25 Sep 2026"],
    [264, "timeout", "15:43:00 25 Sep 2026"]
  ],
  "7-franklin-trailhead": [
    [48, "withdrew", "17:08:00 25 Sep 2026"],
    [137, "medical", "17:42:00 25 Sep 2026"],
    [233, "timeout", "18:19:00 25 Sep 2026"],
    [312, "unknown", "18:47:00 25 Sep 2026"]
  ],
  "8-logan-river": [
    [9, "medical", "19:14:00 25 Sep 2026"],
    [118, "withdrew", "19:58:00 25 Sep 2026"],
    [253, "timeout", "20:31:00 25 Sep 2026"]
  ],
  "9-beaver-mtn": [
    [57, "withdrew", "20:46:00 25 Sep 2026"],
    [174, "medical", "21:23:00 25 Sep 2026"],
    [289, "timeout", "22:02:00 25 Sep 2026"]
  ],
  "10-peter-sinks": [
    [25, "unknown", "22:18:00 25 Sep 2026"],
    [145, "medical", "22:51:00 25 Sep 2026"],
    [221, "withdrew", "23:34:00 25 Sep 2026"],
    [333, "timeout", "00:17:00 26 Sep 2026"]
  ],
  "11-burnt-fork": [
    [70, "medical", "00:42:00 26 Sep 2026"],
    [190, "withdrew", "01:26:00 26 Sep 2026"],
    [278, "timeout", "02:11:00 26 Sep 2026"]
  ]
};

const exportStations = stationConfig.stations
  .map(({ identifier }) => identifier)
  .filter((identifier) => identifier !== "12-finish-line");
const bibIds = new Set();
const cumulativeRows = [];

for (const [stationIndex, stationId] of exportStations.entries()) {
  const stationDrops = dropsByStation[stationId];
  if (!stationDrops) throw new Error(`Missing mock drops for ${stationId}`);

  for (const [bibId, dropReason, dropDateTime] of stationDrops) {
    if (bibIds.has(bibId)) throw new Error(`Bib ${bibId} is dropped more than once`);
    if (stationIndex === 0 && dropReason !== "did-not-start") {
      throw new Error(`Start-line bib ${bibId} must be did-not-start`);
    }
    if (stationIndex > 0 && dropReason === "did-not-start") {
      throw new Error(`Aid-station bib ${bibId} cannot be did-not-start`);
    }

    bibIds.add(bibId);
    cumulativeRows.push(`${stationId},${bibId},${dropReason},${dropDateTime},`);
  }

  const csv = [
    `${stationConfig.event.name},${stationId},drops-export`,
    "stationId,bibId,dropReason,dropDateTime,note",
    ...cumulativeRows,
    ""
  ].join("\n");
  const fileName = `bear100-2026-station-${stationIndex}-mock-drops.csv`;
  fs.writeFileSync(path.join(mockDataDirectory, fileName), csv);
}

console.log(`Wrote ${exportStations.length} progressive drop exports with ${bibIds.size} drops.`);
