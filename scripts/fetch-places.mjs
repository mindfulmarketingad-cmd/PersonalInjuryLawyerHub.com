// One-time data pull for PersonalInjuryLawyerHub.com
//
// Fetches "Personal Injury Lawyer" and "Personal Injury Attorney" listings
// for all 50 US states from the Google Places API (Text Search) and writes
// the results to data/lawyers.json. The site serves that static JSON file,
// so the API is never called by visitors.
//
// Cost control:
//   - Run manually, once (or only when you want to refresh the data).
//   - 2 queries x 50 states = 100 requests total.
//   - Field mask requests only the fields the site needs. NO PHOTOS.
//
// Usage:
//   GOOGLE_PLACES_API_KEY=your-key node scripts/fetch-places.mjs

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!API_KEY) {
  console.error("Set GOOGLE_PLACES_API_KEY before running.");
  process.exit(1);
}

const STATES = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

const QUERIES = ["Personal Injury Lawyer", "Personal Injury Attorney"];

// Only the fields the directory needs. Photos are deliberately excluded.
const FIELD_MASK = [
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.primaryTypeDisplayName",
  "places.reviews",
].join(",");

async function searchText(textQuery) {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": API_KEY,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({ textQuery, pageSize: 20 }),
  });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}: ${await res.text()}`);
  }
  const json = await res.json();
  return json.places ?? [];
}

// Parse "..., City, ST 12345, USA" into { city, state }
function parseAddress(formattedAddress, fallbackState) {
  const parts = (formattedAddress || "").split(",").map((p) => p.trim());
  let city = "";
  let state = fallbackState;
  if (parts.length >= 3) {
    const stateZip = parts[parts.length - 2];
    const m = stateZip.match(/^([A-Z]{2})\b/);
    if (m) state = m[1];
    city = parts[parts.length - 3];
  }
  return { city, state };
}

function pickReview(reviews) {
  if (!Array.isArray(reviews)) return "";
  // Prefer the highest-rated review that has usable text.
  const withText = reviews
    .filter((r) => r.text?.text && r.text.text.trim().length > 40)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  const best = withText[0];
  if (!best) return "";
  let text = best.text.text.trim().replace(/\s+/g, " ");
  if (text.length > 220) text = text.slice(0, 217).trimEnd() + "...";
  return text;
}

const seen = new Set();
const listings = [];

for (const [abbr, stateName] of Object.entries(STATES)) {
  for (const query of QUERIES) {
    const textQuery = `${query} in ${stateName}`;
    try {
      const places = await searchText(textQuery);
      for (const p of places) {
        const key = `${p.displayName?.text}|${p.formattedAddress}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const { city, state } = parseAddress(p.formattedAddress, abbr);
        listings.push({
          name: p.displayName?.text ?? "",
          address: p.formattedAddress ?? "",
          city,
          state,
          lat: p.location?.latitude ?? null,
          lng: p.location?.longitude ?? null,
          rating: p.rating ?? null,
          reviews: p.userRatingCount ?? 0,
          type: p.primaryTypeDisplayName?.text ?? "Personal Injury Attorney",
          quote: pickReview(p.reviews),
        });
      }
      console.log(`${textQuery}: ${places.length} results (${listings.length} total)`);
    } catch (err) {
      console.error(`FAILED ${textQuery}: ${err.message}`);
    }
    // Gentle pacing to stay well under QPS limits.
    await new Promise((r) => setTimeout(r, 250));
  }
}

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "data");
mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, "lawyers.json");
writeFileSync(
  outFile,
  JSON.stringify({ generated: new Date().toISOString(), count: listings.length, listings })
);
console.log(`Wrote ${listings.length} listings to ${outFile}`);
