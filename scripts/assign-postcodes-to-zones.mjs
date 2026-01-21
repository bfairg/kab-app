import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import proj4 from "proj4";
import * as turf from "@turf/turf";

// EPSG:27700 (OSGB36 / British National Grid) to EPSG:4326 (WGS84)
proj4.defs(
  "EPSG:27700",
  "+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.06,0.15,0.247,0.842,-20.489 +units=m +no_defs"
);
proj4.defs("EPSG:4326", "+proj=longlat +datum=WGS84 +no_defs");

function normalisePostcodeNoSpace(pc) {
  return pc.replace(/\s+/g, "").toUpperCase();
}

function formatUkPostcode(pcNoSpace) {
  const pc = normalisePostcodeNoSpace(pcNoSpace);
  if (pc.length <= 3) return pc;
  return `${pc.slice(0, pc.length - 3)} ${pc.slice(pc.length - 3)}`;
}

function loadZones(zonesPath) {
  const raw = fs.readFileSync(zonesPath, "utf8");
  const geojson = JSON.parse(raw);

  const fc = geojson.type === "FeatureCollection"
    ? geojson
    : { type: "FeatureCollection", features: [geojson] };

  const zones = fc.features
    .filter((f) => f && f.geometry && f.geometry.type && f.properties)
    .map((f, idx) => {
      const zoneKey = f.properties.zone_key || f.properties.zoneKey || f.properties.name || `zone_${idx + 1}`;
      return { zoneKey, feature: f };
    });

  if (!zones.length) {
    throw new Error("No polygon features found in zones GeoJSON.");
  }

  const missing = zones.filter((z) => !z.zoneKey);
  if (missing.length) {
    throw new Error("One or more zones are missing a zone_key property.");
  }

  return zones;
}

function parseCodePointOpenCsv(csvText) {
  // Code-Point Open CSVs typically have no header.
  // Common columns (index):
  // 0 postcode, 1 pqI, 2 easting, 3 northing, others we ignore.
  const records = parse(csvText, {
    relax_quotes: true,
    relax_column_count: true,
    skip_empty_lines: true,
    trim: true,
  });

  return records.map((row) => {
    const postcode = row[0];
    const easting = Number(row[2]);
    const northing = Number(row[3]);

    return { postcode, easting, northing };
  }).filter((r) => r.postcode && Number.isFinite(r.easting) && Number.isFinite(r.northing));
}

function eastingNorthingToLonLat(easting, northing) {
  const [lon, lat] = proj4("EPSG:27700", "EPSG:4326", [easting, northing]);
  return { lon, lat };
}

function findZoneForPoint(zones, lon, lat) {
  const pt = turf.point([lon, lat]);

  for (const z of zones) {
    // Works for Polygon and MultiPolygon
    if (turf.booleanPointInPolygon(pt, z.feature)) {
      return z.zoneKey;
    }
  }
  return null;
}

function getArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  return process.argv[idx + 1] || null;
}

const zonesPath = getArg("--zones") || "data/mossgate-zones.geojson";
const codepointPath = getArg("--codepoint") || "data/LA.csv";
const prefix = (getArg("--prefix") || "LA32").toUpperCase(); // LA3 2 without space
const outPath = getArg("--out") || "data/la3-2-zone-map.csv";

const zones = loadZones(zonesPath);

const csvText = fs.readFileSync(codepointPath, "utf8");
const rows = parseCodePointOpenCsv(csvText);

// Filter to LA3 2 by matching no-space prefix LA32
const target = rows.filter((r) => normalisePostcodeNoSpace(r.postcode).startsWith(prefix));

const results = [];
let unmatched = 0;

for (const r of target) {
  const { lon, lat } = eastingNorthingToLonLat(r.easting, r.northing);
  const zoneKey = findZoneForPoint(zones, lon, lat);

  if (!zoneKey) unmatched++;

  results.push({
    postcode: formatUkPostcode(r.postcode),
    zone_key: zoneKey || "",
    lat: lat.toFixed(6),
    lng: lon.toFixed(6),
  });
}

// Write CSV
const header = "postcode,zone_key,lat,lng\n";
const lines = results.map((x) => `${x.postcode},${x.zone_key},${x.lat},${x.lng}`).join("\n");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, header + lines + "\n", "utf8");

console.log(`Rows processed: ${results.length}`);
console.log(`Unmatched (outside all polygons): ${unmatched}`);
console.log(`Output written to: ${outPath}`);
