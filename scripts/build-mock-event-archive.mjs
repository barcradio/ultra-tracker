// Generates randomized event station JSON files and importable ZIP archives from
// the real-event examples in resources/config/mock-data.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import AdmZip from "adm-zip";

const __dirname = dirname(fileURLToPath(import.meta.url));
const configDir = join(__dirname, "..", "resources", "config");
const mockDataDir = join(configDir, "mock-data");

const events = [
  { source: "badwater-135.json", output: "mock-event-badwater-135", athleteCount: 120, dropCount: 8 },
  { source: "hardrock-100.json", output: "mock-event-hardrock-100", athleteCount: 275, dropCount: 17 },
  { source: "utmb-mont-blanc.json", output: "mock-event-utmb-mont-blanc", athleteCount: 420, dropCount: 29 },
  { source: "western-states-100.json", output: "mock-event-western-states-100", athleteCount: 190, dropCount: 12 }
];

const nameFirstParts = ["Juniper", "Granite", "Cedar", "Silver", "Aspen", "Summit", "Raven", "Canyon", "Pine", "Copper", "Meadow", "Timber"];
const nameSecondParts = ["Gate", "Pass", "Creek", "Ridge", "Basin", "Vista", "Gulch", "Point", "Crossing", "Camp", "Shelter", "Fork"];

function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function hashText(value) {
  return [...value].reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0, 2166136261);
}

function choose(random, values) {
  return values[Math.floor(random() * values.length)];
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function formatDate(date) {
  const month = date.toLocaleString("en-US", { month: "short" });
  const pad = (value) => String(value).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())} ${pad(date.getDate())} ${month} ${date.getFullYear()}`;
}

function createStationDistances(totalDistance, stationCount, random) {
  const segmentCount = stationCount - 1;
  let remainingTenths = Math.round(totalDistance * 10);
  const distances = [0];

  for (let segment = 0; segment < segmentCount; segment += 1) {
    const segmentsLeft = segmentCount - segment - 1;
    const minimum = Math.max(30, remainingTenths - segmentsLeft * 100);
    const maximum = Math.min(100, remainingTenths - segmentsLeft * 30);
    const gap = segment === segmentCount - 1
      ? remainingTenths
      : minimum + Math.floor(random() * (maximum - minimum + 1));
    remainingTenths -= gap;
    distances.push(Number((distances.at(-1) + gap / 10).toFixed(1)));
  }

  return distances;
}

function createOperator(random, operatorProfiles, usedCallsigns) {
  const availableProfiles = operatorProfiles.filter((profile) => !usedCallsigns.has(profile.callsign));
  const profile = choose(random, availableProfiles.length > 0 ? availableProfiles : operatorProfiles);
  usedCallsigns.add(profile.callsign);
  return { ...profile };
}

function alphaCode(value) {
  let result = "";
  let remaining = value;
  for (let position = 0; position < 3; position += 1) {
    result = String.fromCharCode("A".charCodeAt(0) + (remaining % 26)) + result;
    remaining = Math.floor(remaining / 26);
  }
  return result;
}

function expandOperatorProfiles(sourceOperators, count) {
  const profiles = sourceOperators.filter((operator) => operator.fullname && operator.callsign);
  const expanded = [];

  for (let index = 0; index < count; index += 1) {
    const source = profiles[index % profiles.length];
    const prefix = source.callsign.slice(0, -3);
    expanded.push({
      fullname: source.fullname,
      callsign: `${prefix}${alphaCode(index)}`,
      phone: source.phone
    });
  }

  return expanded;
}

function createStations(source, random) {
  const totalDistance = Number(source.stations.at(-1).distance);
  const minimumSegments = Math.ceil(totalDistance / 10);
  const maximumStations = Math.floor(totalDistance / 5);
  const maximumSegments = Math.min(Math.floor(totalDistance / 3), maximumStations - 1);
  const segmentCount = minimumSegments + Math.floor(random() * (maximumSegments - minimumSegments + 1));
  const stationCount = segmentCount + 1;
  const distances = createStationDistances(totalDistance, stationCount, random);
  const startDate = new Date(source.event.starttime);
  const endDate = new Date(source.event.endtime);
  const duration = endDate.getTime() - startDate.getTime();
  const startLocation = source.stations[0].location;
  const finishLocation = source.stations.at(-1).location;
  const operatorProfiles = expandOperatorProfiles(Object.values(source.stations[0].operators), stationCount * 3);
  const assignedCallsigns = new Set();
  const usedNames = new Set();

  return distances.map((distance, index) => {
    const progress = index / (stationCount - 1);
    const openTime = new Date(startDate.getTime() + progress * Math.max(0, duration - 60 * 60 * 1000));
    const closeTime = new Date(startDate.getTime() + progress * duration + 60 * 60 * 1000);
    const name = index === 0
      ? "Start Line"
      : index === stationCount - 1
        ? "Finish Line"
        : (() => {
            let candidate = `${choose(random, nameFirstParts)} ${choose(random, nameSecondParts)}`;
            while (usedNames.has(candidate)) candidate = `${choose(random, nameFirstParts)} ${choose(random, nameSecondParts)}`;
            return candidate;
          })();
    usedNames.add(name);
    const identifier = `${String(index).padStart(2, "0")}-${slugify(name)}-${String(Math.floor(random() * 10000)).padStart(4, "0")}`;
    const latitude = startLocation.latitude + (finishLocation.latitude - startLocation.latitude) * progress + (random() - 0.5) * 0.08;
    const longitude = startLocation.longitude + (finishLocation.longitude - startLocation.longitude) * progress + (random() - 0.5) * 0.08;
    return {
      name,
      identifier,
      description: index === 0 ? "Randomized event start line" : index === stationCount - 1 ? "Randomized event finish line" : "Randomized aid station",
      location: {
        latitude: Number(latitude.toFixed(4)),
        longitude: Number(longitude.toFixed(4)),
        elevation: Math.round(startLocation.elevation + (finishLocation.elevation - startLocation.elevation) * progress + (random() - 0.5) * 1200)
      },
      distance,
      dropbags: index > 0 && index < stationCount - 1 && random() > 0.55,
      crewaccess: index === 0 || index === stationCount - 1 || random() > 0.45,
      paceraccess: index > 0 && index < stationCount - 1 && random() > 0.65,
      shiftBegin: formatDate(new Date(openTime.getTime() - 60 * 60 * 1000)),
      cutofftime: formatDate(new Date(closeTime.getTime() - 30 * 60 * 1000)),
      shiftEnd: formatDate(closeTime),
      entrymode: Math.floor(random() * 2),
      operators: {
        primary: createOperator(random, operatorProfiles, assignedCallsigns),
        secondary: createOperator(random, operatorProfiles, assignedCallsigns),
        tertiary: createOperator(random, operatorProfiles, assignedCallsigns)
      }
    };
  });
}

function readCsvLines(fileName) {
  const filePath = join(mockDataDir, fileName);
  if (!existsSync(filePath)) throw new Error(`Missing mock source file: ${filePath}`);
  return readFileSync(filePath, "utf8").trimEnd().split(/\r?\n/);
}

const athletes = readCsvLines("mock-athletes.csv");
const drops = readFileSync(join(configDir, "bear100-2026-station-6-mock-drops.csv"), "utf8").trimEnd().split(/\r?\n/);
mkdirSync(mockDataDir, { recursive: true });

for (const event of events) {
  const sourcePath = join(mockDataDir, event.source);
  if (!existsSync(sourcePath)) throw new Error(`Missing event source file: ${sourcePath}`);
  const source = JSON.parse(readFileSync(sourcePath, "utf8"));
  const random = createRandom(hashText(event.source));
  const stations = createStations(source, random);
  const generated = {
    event: {
      name: source.event.name,
      starttime: source.event.starttime,
      endtime: source.event.endtime,
      startline: "Start Line",
      finishline: "Finish Line"
    },
    stations
  };
  const stationsJson = JSON.stringify(generated, null, 2);
  const jsonPath = join(mockDataDir, `${event.output}.json`);
  const zipPath = join(configDir, `${event.output}.zip`);
  const zip = new AdmZip();
  const eventDrops = drops.slice(0, Math.min(drops.length, event.dropCount + 2));
  eventDrops[0] = `${source.event.name},${stations[Math.min(1, stations.length - 1)].identifier},drops-export`;
  zip.addFile("stations.json", Buffer.from(stationsJson));
  zip.addFile("athletes.csv", Buffer.from(`${athletes.slice(0, event.athleteCount + 1).join("\n")}\n`));
  zip.addFile("drops.csv", Buffer.from(`${eventDrops.join("\n")}\n`));
  writeFileSync(jsonPath, `${stationsJson}\n`);
  zip.writeZip(zipPath);
  console.log(`Wrote ${jsonPath} and ${zipPath} (${stations.length} stations, ${event.athleteCount} athletes)`);
}

const bearArchive = new AdmZip();
const bearEntries = [
  { path: join(configDir, "Bear100_2026_stations_v1_mock.json"), name: "stations.json" },
  { path: join(mockDataDir, "mock-athletes.csv"), name: "athletes.csv" },
  { path: join(configDir, "bear100-2026-station-6-mock-drops.csv"), name: "drops.csv" }
];

for (const entry of bearEntries) {
  if (!existsSync(entry.path)) throw new Error(`Missing Bear 100 source file: ${entry.path}`);
  bearArchive.addLocalFile(entry.path, "", entry.name);
}

const bearArchivePath = join(configDir, "mock-event-bear-100-2026.zip");
bearArchive.writeZip(bearArchivePath);
console.log(`Wrote ${bearArchivePath} using the supplied Bear 100 mock files`);
