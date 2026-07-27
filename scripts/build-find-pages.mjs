// Generates programmatic SEO "searchmap" pages under /find/ for every
// city + state combination present in data/lawyers.json, in two keyword
// variants (Personal Injury Lawyer / Personal Injury Attorneys — same
// underlying businesses, different target keyword), and regenerates
// find.html (the state/city index) and sitemap.xml to include them.
//
// Static output only — no server, no build step at request time. Re-run
// this script after refreshing data/lawyers.json (scripts/fetch-places.mjs).
//
// Usage: node scripts/build-find-pages.mjs

import { writeFileSync, mkdirSync, readFileSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://personalinjurylawyerhub.com";
const TODAY = new Date().toISOString().slice(0, 10);

const STATE_NAMES = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan",
  MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana",
  NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota",
  OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
  RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
  TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia",
  WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming"
};

// Keyword variants targeting the same underlying listings. `selfLabel` is
// this variant's own descriptive noun phrase, used by OTHER variants' pages
// when linking to it (e.g. "Looking for a [selfLabel] instead?").
const VARIANTS = [
  {
    id: "lawyer",
    citySlugPrefix: "personal-injury-lawyer",
    stateSlugPrefix: "personal-injury-lawyers",
    cityH1Word: "Personal Injury Lawyer",
    pluralWord: "Personal Injury Lawyers",
    selfLabel: "personal injury lawyer",
    shortLabel: "Lawyer"
  },
  {
    id: "attorney",
    citySlugPrefix: "personal-injury-attorneys",
    stateSlugPrefix: "personal-injury-attorneys",
    cityH1Word: "Personal Injury Attorneys",
    pluralWord: "Personal Injury Attorneys",
    selfLabel: "personal injury attorney",
    shortLabel: "Attorney"
  },
  {
    id: "slip-fall",
    citySlugPrefix: "slip-fall-lawyer",
    stateSlugPrefix: "slip-fall-lawyers",
    cityH1Word: "Slip and Fall Lawyers",
    pluralWord: "Slip and Fall Lawyers",
    selfLabel: "slip and fall lawyer",
    shortLabel: "Slip & Fall"
  },
  {
    id: "car-injury",
    citySlugPrefix: "car-injury-lawyer",
    stateSlugPrefix: "car-injury-lawyers",
    cityH1Word: "Car Injury Lawyers",
    pluralWord: "Car Injury Lawyers",
    selfLabel: "car injury lawyer",
    shortLabel: "Car Injury",
    certified: false // per spec: "There are [x] Car Injury Lawyers in..." (no "Certified")
  },
  {
    id: "truck-accident",
    citySlugPrefix: "truck-accident-lawyer",
    stateSlugPrefix: "truck-accident-lawyers",
    cityH1Word: "Truck Accident Lawyers",
    pluralWord: "Truck Accident Lawyers",
    selfLabel: "truck accident lawyer",
    shortLabel: "Truck Accident",
    certified: false // per spec: "There are [x] Truck Accident Lawyers in..." (no "Certified")
  },
  {
    id: "wrongful-death",
    citySlugPrefix: "wrongful-death-lawyer",
    stateSlugPrefix: "wrongful-death-lawyers",
    cityH1Word: "Wrongful Death Lawyers",
    pluralWord: "Wrongful Death Lawyers",
    selfLabel: "wrongful death lawyer",
    shortLabel: "Wrongful Death",
    certified: false // per spec: "There are [x] Wrongful Death Lawyers in..." (no "Certified")
  }
];

const lawyerVariant = VARIANTS.find((v) => v.id === "lawyer");

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const data = JSON.parse(readFileSync(join(ROOT, "data", "lawyers.json"), "utf8"));

// ---------- Assign a stable, unique slug to every listing (for /partners/) ----------
// Base slug is the business name; when two+ listings share a name (chains,
// franchises), disambiguate with city-state, then an incrementing suffix.
{
  const byBaseSlug = new Map();
  for (const l of data.listings) {
    const base = slugify(l.name);
    if (!byBaseSlug.has(base)) byBaseSlug.set(base, []);
    byBaseSlug.get(base).push(l);
  }
  const usedSlugs = new Set();
  for (const [base, group] of byBaseSlug) {
    if (group.length === 1) {
      const l = group[0];
      let slug = base;
      if (usedSlugs.has(slug)) slug = `${base}-${slugify(l.city || "")}-${(l.state || "").toLowerCase()}`;
      while (usedSlugs.has(slug)) slug = `${slug}-2`;
      usedSlugs.add(slug);
      l.slug = slug;
    } else {
      for (const l of group) {
        let slug = `${base}-${slugify(l.city || "")}-${(l.state || "").toLowerCase()}`;
        let n = 2;
        while (usedSlugs.has(slug)) slug = `${base}-${slugify(l.city || "")}-${(l.state || "").toLowerCase()}-${n++}`;
        usedSlugs.add(slug);
        l.slug = slug;
      }
    }
  }
  writeFileSync(join(ROOT, "data", "lawyers.json"), JSON.stringify(data));
}

// ---------- Group listings by city + state, and by state alone ----------
const cityGroupsBase = new Map();
for (const l of data.listings) {
  if (!l.city || !l.state) continue;
  const key = l.city.trim() + "|" + l.state;
  if (!cityGroupsBase.has(key)) {
    cityGroupsBase.set(key, { city: l.city.trim(), state: l.state, listings: [] });
  }
  cityGroupsBase.get(key).listings.push(l);
}
const cityGroups = [...cityGroupsBase.values()]
  .map((g) => ({ ...g, stateName: STATE_NAMES[g.state] || g.state, citySlug: slugify(g.city), count: g.listings.length }))
  .sort((a, b) => a.stateName.localeCompare(b.stateName) || a.city.localeCompare(b.city));

const stateGroupsBase = new Map();
for (const l of data.listings) {
  if (!l.state) continue;
  if (!stateGroupsBase.has(l.state)) {
    stateGroupsBase.set(l.state, { state: l.state, stateName: STATE_NAMES[l.state] || l.state, listings: [] });
  }
  stateGroupsBase.get(l.state).listings.push(l);
}
const stateGroups = [...stateGroupsBase.values()]
  .map((g) => ({ ...g, count: g.listings.length }))
  .sort((a, b) => a.stateName.localeCompare(b.stateName));

function listingsJsonFor(listings) {
  return JSON.stringify(
    listings.map((l) => ({
      name: l.name, address: l.address, city: l.city, state: l.state,
      lat: l.lat, lng: l.lng, rating: l.rating, reviews: l.reviews,
      type: l.type, quote: l.quote, slug: l.slug, website: l.website, hours: l.hours
    }))
  );
}

function citySlugFor(variant, g) {
  return `${variant.citySlugPrefix}-${g.citySlug}-${g.state.toLowerCase()}`;
}
function stateSlugFor(variant, g) {
  return `${variant.stateSlugPrefix}-${g.state.toLowerCase()}`;
}

// ---------- Shared page shell ----------
function renderPage({ title, description, url, breadcrumbHtml, breadcrumbItems, h1, listingsJson, contentHtml, featuredAlt }) {
  const breadcrumbJsonLd = breadcrumbItems
    ? `\n  <script type="application/ld+json">\n  {\n    "@context": "https://schema.org",\n    "@type": "BreadcrumbList",\n    "itemListElement": [\n${breadcrumbItems.map((it, i) => `      { "@type": "ListItem", "position": ${i + 1}, "name": "${esc(it.name)}", "item": "${it.item}" }`).join(",\n")}\n    ]\n  }\n  </script>`
    : "";
  const featuredImageUrl = `${SITE}/assets/featured/search-map.svg`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" type="image/svg+xml" href="/assets/logo/logo.svg">
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/logo/favicon-32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/assets/logo/favicon-16.png">
  <link rel="apple-touch-icon" href="/assets/logo/apple-touch-icon.png">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${SITE}${url}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:image" content="${featuredImageUrl}">
  <meta property="og:type" content="website">
  <link rel="stylesheet" href="/css/style.css">
  <link rel="stylesheet" href="/vendor/leaflet.css">
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9332749804326149" crossorigin="anonymous"></script>${breadcrumbJsonLd}
</head>
<body>
  <header class="site-header">
    <div class="container">
      <a class="brand" href="/"><img src="/assets/logo/logo.svg" alt="Personal Injury Lawyer Hub" class="brand-logo">Personal Injury <span>Lawyer Hub</span></a>
      <nav class="site-nav">
        <a href="/">Home</a>
        <a href="/blog/">Blog</a>
        <a href="/about.html">About</a>
        <a href="/find.html" class="active">Find</a>
        <a href="/partners.html">Partners</a>
      </nav>
    </div>
  </header>

  <section class="page-title">
    <div class="container">
      <p class="breadcrumb">${breadcrumbHtml}</p>
      <img class="featured-image" src="/assets/featured/search-map.svg" width="800" height="300" alt="${esc(featuredAlt)}" loading="lazy">
      <h1>${h1}</h1>
      <p>${esc(description)}</p>
    </div>
  </section>

  <section class="map-shell map-shell-mini" id="directory">
    <aside class="listings-panel">
      <div class="controls">
        <select id="type-filter" aria-label="Filter by business type">
          <option value="">All Types</option>
        </select>
        <select id="rating-filter" aria-label="Filter by minimum rating">
          <option value="">Any Rating</option>
          <option value="4.5">4.5 stars and up</option>
          <option value="4">4 stars and up</option>
          <option value="3">3 stars and up</option>
        </select>
        <select id="sort-select" aria-label="Sort listings">
          <option value="rating">Sort: Highest Rated</option>
          <option value="reviews">Sort: Most Reviews</option>
          <option value="name">Sort: Name A-Z</option>
        </select>
        <button class="toggle-btn" id="satellite-toggle" type="button">Satellite View</button>
      </div>
      <div class="results-meta" id="results-meta">Loading listings...</div>
      <div class="cards" id="cards"></div>
    </aside>
    <div class="map-panel">
      <div id="map"></div>
    </div>
  </section>

  <script type="application/json" id="listings-data">${listingsJson}</script>

  <section class="content">
    <div class="container">
${contentHtml}
    </div>
  </section>

  <footer class="site-footer">
    <div class="container">
      <ul class="footer-links">
        <li><a href="/">Home</a></li>
        <li><a href="/about.html">About</a></li>
        <li><a href="/contact.html">Contact</a></li>
        <li><a href="/disclaimer.html">Disclaimer</a></li>
        <li><a href="/privacy.html">Privacy</a></li>
        <li><a href="/terms.html">Terms</a></li>
        <li><a href="/sitemap.html">Sitemap</a></li>
      </ul>
      <p class="footer-legal">Personal Injury Lawyer Hub is a directory service only. We are not a law firm and do not provide legal advice. Listing information is compiled from publicly available sources and does not constitute an endorsement or attorney referral. Copyright 2026 PersonalInjuryLawyerHub.com. All rights reserved.</p>
    </div>
  </footer>

  <script src="/vendor/leaflet.js"></script>
  <script src="/js/citymap.js"></script>
  <script src="/js/inquire.js"></script>
</body>
</html>
`;
}

function descriptionFor(variant, count, place) {
  const word = variant.certified === false ? variant.pluralWord : `Certified ${variant.pluralWord}`;
  return `There are ${count} ${word} in ${place}. Search verified listings, ratings, and reviews on our interactive map.`;
}

// Cross-links to every other variant's page for the same city/state, so no
// variant's pages are orphaned for crawlers.
function relatedSearchesHtml(variant, g, slugForFn) {
  const others = VARIANTS.filter((v) => v !== variant);
  const items = others
    .map((v) => `<a href="/find/${slugForFn(v, g)}/">${esc(v.selfLabel)}</a>`)
    .join(", ");
  return `<p>Also searching for a different type of case? See the same firms listed as a ${items}.</p>`;
}

// Real, data-derived facts about this group of listings (not boilerplate) —
// gives every city/state page unique, substantive content beyond a find/
// replace of the place name, which matters at this page count for indexing.
function statsHtml(g, place) {
  const rated = g.listings.filter((l) => l.rating != null);
  if (!rated.length) return "";
  const avg = rated.reduce((s, l) => s + l.rating, 0) / rated.length;
  const totalReviews = rated.reduce((s, l) => s + (l.reviews || 0), 0);
  const top = rated.slice().sort((a, b) => (b.rating - a.rating) || ((b.reviews || 0) - (a.reviews || 0)))[0];
  const fiveStarCount = rated.filter((l) => l.rating >= 4.8).length;
  return `<p>Across ${rated.length} rated firms in ${esc(place)}, the average rating is ${avg.toFixed(1)} stars from a combined ${totalReviews.toLocaleString()} client reviews` +
    (fiveStarCount ? `, and ${fiveStarCount} firm${fiveStarCount === 1 ? "" : "s"} hold${fiveStarCount === 1 ? "s" : ""} a 4.8-star rating or higher` : "") +
    `. The top-rated listing is <strong>${esc(top.name)}</strong> at ${top.rating.toFixed(1)} stars` +
    (top.reviews ? ` (${top.reviews.toLocaleString()} reviews)` : "") + ".</p>";
}

// ---------- Build all city pages (every variant) ----------
const findDir = join(ROOT, "find");
if (existsSync(findDir)) rmSync(findDir, { recursive: true, force: true });
mkdirSync(findDir, { recursive: true });

let cityPageCount = 0;
for (const g of cityGroups) {
  for (const variant of VARIANTS) {
    const slug = citySlugFor(variant, g);
    const stateSlug = stateSlugFor(variant, g);

    const title = `${variant.cityH1Word} in ${g.city}, ${g.stateName}`;
    const description = descriptionFor(variant, g.count, `${g.city}, ${g.stateName}`);
    const url = `/find/${slug}/`;
    const breadcrumbHtml = `<a href="/find.html">Find</a> &rsaquo; <a href="/find/${stateSlug}/">${esc(g.stateName)}</a> &rsaquo; ${esc(g.city)}`;
    const breadcrumbItems = [
      { name: "Home", item: `${SITE}/` },
      { name: "Find", item: `${SITE}/find.html` },
      { name: g.stateName, item: `${SITE}/find/${stateSlug}/` },
      { name: g.city, item: `${SITE}${url}` }
    ];
    const contentHtml = `      <h2>${esc(variant.pluralWord)} Serving ${esc(g.city)}, ${esc(g.stateName)}</h2>
      <p>Comparing ${esc(variant.pluralWord.toLowerCase())} in ${esc(g.city)} starts with looking at overall rating, review volume, and what past clients say about their experience. Use the map above to see every listed firm's location, filter by business type or minimum rating, and sort by rating or number of reviews.</p>
      ${statsHtml(g, `${g.city}, ${g.stateName}`)}
      ${relatedSearchesHtml(variant, g, citySlugFor)}
      <p>Browse every listing in <a href="/find/${stateSlug}/">${esc(g.stateName)}</a>, or search a different area from our <a href="/">nationwide directory</a>.</p>`;

    mkdirSync(join(findDir, slug), { recursive: true });
    writeFileSync(
      join(findDir, slug, "index.html"),
      renderPage({
        title, description, url, breadcrumbHtml, breadcrumbItems,
        h1: `${variant.cityH1Word} in ${esc(g.city)}, ${esc(g.stateName)}`,
        listingsJson: listingsJsonFor(g.listings),
        contentHtml,
        featuredAlt: `${variant.pluralWord} search map for ${g.city}, ${g.stateName}`
      })
    );
    cityPageCount++;
  }
}
console.log(`Wrote ${cityPageCount} city searchmap pages to /find/ (${cityGroups.length} cities x ${VARIANTS.length} variants)`);

// ---------- Build all state pages (every variant) ----------
let statePageCount = 0;
for (const g of stateGroups) {
  for (const variant of VARIANTS) {
    const slug = stateSlugFor(variant, g);

    const title = `${variant.cityH1Word} in ${g.stateName}`;
    const description = descriptionFor(variant, g.count, g.stateName);
    const url = `/find/${slug}/`;
    const breadcrumbHtml = `<a href="/find.html">Find</a> &rsaquo; ${esc(g.stateName)}`;
    const breadcrumbItems = [
      { name: "Home", item: `${SITE}/` },
      { name: "Find", item: `${SITE}/find.html` },
      { name: g.stateName, item: `${SITE}${url}` }
    ];
    const contentHtml = `      <h2>${esc(variant.pluralWord)} Serving ${esc(g.stateName)}</h2>
      <p>Comparing ${esc(variant.pluralWord.toLowerCase())} in ${esc(g.stateName)} starts with looking at overall rating, review volume, and what past clients say about their experience. Use the map above to see every listed firm's location, filter by business type or minimum rating, and sort by rating or number of reviews.</p>
      ${statsHtml(g, g.stateName)}
      ${relatedSearchesHtml(variant, g, stateSlugFor)}
      <p>Browse cities on our <a href="/find.html#${g.state}">Find page</a>, or search a different area from our <a href="/">nationwide directory</a>.</p>`;

    mkdirSync(join(findDir, slug), { recursive: true });
    writeFileSync(
      join(findDir, slug, "index.html"),
      renderPage({
        title, description, url, breadcrumbHtml, breadcrumbItems,
        h1: `${variant.cityH1Word} in ${esc(g.stateName)}`,
        listingsJson: listingsJsonFor(g.listings),
        contentHtml,
        featuredAlt: `${variant.pluralWord} search map for ${g.stateName}`
      })
    );
    statePageCount++;
  }
}
console.log(`Wrote ${statePageCount} state searchmap pages to /find/ (${stateGroups.length} states x ${VARIANTS.length} variants)`);

// ---------- Build /partners/{slug}/ profile page for every listing ----------
const CLAIM_URL = "https://buy.stripe.com/28E4gAfuG58I9UG9pIfrW04";

function stars(rating) {
  if (!rating) return "";
  var full = Math.round(rating);
  var out = "";
  for (var i = 0; i < 5; i++) out += i < full ? "&#9733;" : "&#9734;";
  return out;
}

function partnerPageHtml(l) {
  const stateName = STATE_NAMES[l.state] || l.state;
  const title = `${l.name} - ${l.city}, ${stateName}`;
  const ratingSentence = l.rating
    ? ` Rated ${l.rating.toFixed(1)} stars from ${l.reviews} client reviews.`
    : "";
  const description = `${l.name} is a personal injury law firm in ${l.city}, ${stateName}.${ratingSentence} View address, rating, and client reviews.`;
  const url = `/partners/${l.slug}/`;
  // Omitting "origin" makes Google Maps default to the visitor's current location.
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(l.address || `${l.name} ${l.city} ${stateName}`)}`;
  const citySlug = slugify(l.city || "");
  const stateSlugLower = (l.state || "").toLowerCase();

  const exploreLinks = VARIANTS.map((v) =>
    `<li><a href="/find/${v.citySlugPrefix}-${citySlug}-${stateSlugLower}/">${esc(v.pluralWord)} in ${esc(l.city)}, ${esc(stateName)}</a></li>`
  ).join("\n        ");
  const stateLink = `<li><a href="/find/${lawyerVariant.stateSlugPrefix}-${stateSlugLower}/">${esc(lawyerVariant.pluralWord)} in ${esc(stateName)}</a></li>`;

  const breadcrumbHtml = `<a href="/find.html">Find</a> &rsaquo; <a href="/partners.html">Partners</a> &rsaquo; ${esc(l.name)}`;
  const breadcrumbItems = [
    { name: "Home", item: `${SITE}/` },
    { name: "Partners", item: `${SITE}/partners.html` },
    { name: l.name, item: `${SITE}${url}` }
  ];

  const localBusinessJsonLd = `\n  <script type="application/ld+json">\n  {\n    "@context": "https://schema.org",\n    "@type": "Attorney",\n    "name": "${esc(l.name)}",\n    "address": "${esc(l.address)}"${l.rating ? `,\n    "aggregateRating": { "@type": "AggregateRating", "ratingValue": "${l.rating}", "reviewCount": "${l.reviews}" }` : ""}\n  }\n  </script>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" type="image/svg+xml" href="/assets/logo/logo.svg">
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/logo/favicon-32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/assets/logo/favicon-16.png">
  <link rel="apple-touch-icon" href="/assets/logo/apple-touch-icon.png">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${SITE}${url}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:type" content="website">
  <link rel="stylesheet" href="/css/style.css">
  <link rel="stylesheet" href="/vendor/leaflet.css">
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9332749804326149" crossorigin="anonymous"></script>${localBusinessJsonLd}
</head>
<body>
  <header class="site-header">
    <div class="container">
      <a class="brand" href="/"><img src="/assets/logo/logo.svg" alt="Personal Injury Lawyer Hub" class="brand-logo">Personal Injury <span>Lawyer Hub</span></a>
      <nav class="site-nav">
        <a href="/">Home</a>
        <a href="/blog/">Blog</a>
        <a href="/about.html">About</a>
        <a href="/find.html">Find</a>
        <a href="/partners.html" class="active">Partners</a>
      </nav>
    </div>
  </header>

  <section class="page-title">
    <div class="container">
      <p class="breadcrumb">${breadcrumbHtml}</p>
      <h1>${esc(title)}</h1>
      <p>${esc(l.type)} in ${esc(l.city)}, ${esc(stateName)}</p>
    </div>
  </section>

  <section class="content">
    <div class="container">
      <div class="profile-layout">
        <div class="profile-card card">
          <h2>${esc(l.name)}</h2>
          <div class="type">${esc(l.type)}</div>
          ${l.rating
            ? `<div class="rating"><span class="stars">${stars(l.rating)}</span> ${l.rating.toFixed(1)} (${l.reviews} reviews)</div>`
            : `<div class="rating">No rating yet</div>`}
          <div class="addr">${esc(l.address)}</div>
          ${l.website ? `<div class="website"><a href="${esc(l.website)}" target="_blank" rel="noopener nofollow">Visit Website</a></div>` : ""}
          ${l.quote ? `<blockquote>&ldquo;${esc(l.quote)}&rdquo;</blockquote>` : ""}
          ${l.hours && l.hours.length ? `<div class="hours"><h3>Business Hours</h3><ul>${l.hours.map((h) => `<li>${esc(h)}</li>`).join("")}</ul></div>` : ""}
          <p class="profile-actions">
            <a class="btn btn-outline" href="${directionsUrl}" target="_blank" rel="noopener">Get Directions</a>
            <button class="btn inquire-btn" type="button" data-name="${esc(l.name)}" data-slug="${esc(l.slug || "")}" data-city="${esc(l.city || "")}" data-state="${esc(stateName)}">Inquire</button>
          </p>
          <div class="claim-box">
            <p>Are you the owner of ${esc(l.name)}?</p>
            <a class="btn claim-btn" href="${CLAIM_URL}" target="_blank" rel="noopener">Claim This Business</a>
          </div>
        </div>
        <div class="map-panel profile-map">
          <div id="map" data-lat="${l.lat ?? ""}" data-lng="${l.lng ?? ""}" data-name="${esc(l.name)}"></div>
        </div>
      </div>

      <h2>Explore Personal Injury Lawyers Near ${esc(l.city)}, ${esc(stateName)}</h2>
      <ul>
        ${exploreLinks}
        ${stateLink}
      </ul>
      <p>Browse the full <a href="/partners.html">directory listing table</a> or return to the <a href="/">nationwide search map</a>.</p>
    </div>
  </section>

  <footer class="site-footer">
    <div class="container">
      <ul class="footer-links">
        <li><a href="/">Home</a></li>
        <li><a href="/about.html">About</a></li>
        <li><a href="/contact.html">Contact</a></li>
        <li><a href="/disclaimer.html">Disclaimer</a></li>
        <li><a href="/privacy.html">Privacy</a></li>
        <li><a href="/terms.html">Terms</a></li>
        <li><a href="/sitemap.html">Sitemap</a></li>
      </ul>
      <p class="footer-legal">Personal Injury Lawyer Hub is a directory service only. We are not a law firm and do not provide legal advice. Listing information is compiled from publicly available sources and does not constitute an endorsement or attorney referral. Copyright 2026 PersonalInjuryLawyerHub.com. All rights reserved.</p>
    </div>
  </footer>

  <script src="/vendor/leaflet.js"></script>
  <script src="/js/partnermap.js"></script>
  <script src="/js/inquire.js"></script>
</body>
</html>
`;
}

const partnersDir = join(ROOT, "partners");
if (existsSync(partnersDir)) rmSync(partnersDir, { recursive: true, force: true });
mkdirSync(partnersDir, { recursive: true });
for (const l of data.listings) {
  if (!l.slug) continue;
  const dir = join(partnersDir, l.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), partnerPageHtml(l));
}
console.log(`Wrote ${data.listings.length} partner profile pages to /partners/`);

// ---------- Regenerate find.html (state -> city index, "lawyer" variant) ----------
const byState = new Map();
for (const g of cityGroups) {
  if (!byState.has(g.state)) byState.set(g.state, { state: g.state, stateName: g.stateName, cities: [], count: 0 });
  const entry = byState.get(g.state);
  entry.cities.push(g);
  entry.count += g.count;
}
const statesForIndex = [...byState.values()].sort((a, b) => a.stateName.localeCompare(b.stateName));

function variantLinksHtml(slugForFn, g) {
  return VARIANTS.map((v) => `<a href="/find/${slugForFn(v, g)}/">${esc(v.shortLabel)}</a>`).join(" &middot; ");
}

const stateSections = statesForIndex.map((s) => {
  const cityLinks = s.cities
    .sort((a, b) => a.city.localeCompare(b.city))
    .map((g) => `        <li data-city="${esc(g.city + ", " + s.state)}">
          <span class="city-name">${esc(g.city)}, ${esc(s.state)} <span class="count">(${g.count})</span></span>
          <span class="variant-links">${variantLinksHtml(citySlugFor, g)}</span>
        </li>`)
    .join("\n");
  return `      <div class="state-block" id="${s.state}" data-state-name="${esc(s.stateName)}" data-count="${s.count}">
        <h3>${esc(s.stateName)} <span class="count">(${s.count} listings)</span></h3>
        <p class="variant-links state-variant-links">${variantLinksHtml(stateSlugFor, s)}</p>
        <ul class="city-list">
${cityLinks}
        </ul>
      </div>`;
}).join("\n");

const findHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" type="image/svg+xml" href="/assets/logo/logo.svg">
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/logo/favicon-32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/assets/logo/favicon-16.png">
  <link rel="apple-touch-icon" href="/assets/logo/apple-touch-icon.png">
  <title>Find a Personal Injury Lawyer by State | Personal Injury Lawyer Hub</title>
  <meta name="description" content="Browse personal injury lawyers and attorneys by state and city. Our directory covers all 50 states with ratings, reviews, and locations on an interactive map.">
  <link rel="canonical" href="${SITE}/find.html">
  <link rel="stylesheet" href="/css/style.css">
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9332749804326149" crossorigin="anonymous"></script>
</head>
<body>
  <header class="site-header">
    <div class="container">
      <a class="brand" href="/"><img src="/assets/logo/logo.svg" alt="Personal Injury Lawyer Hub" class="brand-logo">Personal Injury <span>Lawyer Hub</span></a>
      <nav class="site-nav">
        <a href="/">Home</a>
        <a href="/blog/">Blog</a>
        <a href="/about.html">About</a>
        <a href="/find.html" class="active">Find</a>
        <a href="/partners.html">Partners</a>
      </nav>
    </div>
  </header>

  <section class="page-title">
    <div class="container">
      <h1>Find a Personal Injury Lawyer by State</h1>
      <p>Select your state and city to view personal injury lawyers and attorneys on the interactive map.</p>
    </div>
  </section>

  <main class="content">
    <div class="container">
      <p>Our directory includes ${data.count} personal injury law firm listings across all 50 states and the District of Columbia. Choose a state below, then a city, to open a dedicated map and listing page for that area. Prefer to search by "attorney" instead of "lawyer"? Every city and state page links to its attorney-focused equivalent. Or use the zip code search on the <a href="/#directory">homepage directory</a> for results closest to you.</p>

      <h2>Browse by State and City</h2>
      <div class="controls find-controls">
        <div class="zip-row">
          <input type="text" id="find-search" placeholder="Search by city or state" aria-label="Search by city or state">
        </div>
        <select id="find-sort" aria-label="Sort states">
          <option value="name">Sort: State A-Z</option>
          <option value="count">Sort: Most Listings</option>
        </select>
        <select id="find-filter" aria-label="Filter by state size">
          <option value="0">All States</option>
          <option value="20">20+ Listings</option>
          <option value="25">25+ Listings</option>
          <option value="30">30+ Listings</option>
        </select>
      </div>
      <p class="results-meta" id="find-meta"></p>
      <div id="state-list">
${stateSections}
      </div>
    </div>
  </main>

  <footer class="site-footer">
    <div class="container">
      <ul class="footer-links">
        <li><a href="/">Home</a></li>
        <li><a href="/about.html">About</a></li>
        <li><a href="/contact.html">Contact</a></li>
        <li><a href="/disclaimer.html">Disclaimer</a></li>
        <li><a href="/privacy.html">Privacy</a></li>
        <li><a href="/terms.html">Terms</a></li>
        <li><a href="/sitemap.html">Sitemap</a></li>
      </ul>
      <p class="footer-legal">Personal Injury Lawyer Hub is a directory service only. We are not a law firm and do not provide legal advice. Listing information is compiled from publicly available sources and does not constitute an endorsement or attorney referral. Copyright 2026 PersonalInjuryLawyerHub.com. All rights reserved.</p>
    </div>
  </footer>
  <script src="/js/findindex.js"></script>
</body>
</html>
`;
writeFileSync(join(ROOT, "find.html"), findHtml);
console.log("Regenerated find.html");

// ---------- Regenerate sitemap.xml ----------
const staticUrls = [
  { loc: "/", freq: "weekly", pri: "1.0" },
  { loc: "/find.html", freq: "weekly", pri: "0.9" },
  { loc: "/blog/", freq: "weekly", pri: "0.8" },
  { loc: "/about.html", freq: "monthly", pri: "0.6" },
  { loc: "/partners.html", freq: "monthly", pri: "0.5" },
  { loc: "/contact.html", freq: "monthly", pri: "0.5" },
  { loc: "/disclaimer.html", freq: "yearly", pri: "0.3" },
  { loc: "/privacy.html", freq: "yearly", pri: "0.3" },
  { loc: "/terms.html", freq: "yearly", pri: "0.3" },
  { loc: "/sitemap.html", freq: "monthly", pri: "0.3" }
];

const cityUrls = [];
const stateUrls = [];
for (const g of cityGroups) {
  for (const variant of VARIANTS) {
    cityUrls.push({ loc: `/find/${citySlugFor(variant, g)}/`, freq: "monthly", pri: "0.6" });
  }
}
for (const g of stateGroups) {
  for (const variant of VARIANTS) {
    stateUrls.push({ loc: `/find/${stateSlugFor(variant, g)}/`, freq: "monthly", pri: "0.7" });
  }
}

const partnerUrls = data.listings
  .filter((l) => l.slug)
  .map((l) => ({ loc: `/partners/${l.slug}/`, freq: "monthly", pri: "0.5" }));

const urlXml = [...staticUrls, ...stateUrls, ...cityUrls, ...partnerUrls]
  .map((u) => `  <url>
    <loc>${SITE}${u.loc}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>${u.freq}</changefreq>
    <priority>${u.pri}</priority>
  </url>`)
  .join("\n");

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlXml}
</urlset>
`;
writeFileSync(join(ROOT, "sitemap.xml"), sitemapXml);
console.log(`Regenerated sitemap.xml with ${staticUrls.length + stateUrls.length + cityUrls.length + partnerUrls.length} URLs`);

// ---------- Redirect old ?state=XX homepage links to the "lawyer" state pages ----------
// Old links like /?state=FL#directory pointed at the homepage filtered by
// state. Those state searchmap pages now live at /find/personal-injury-lawyers-{state}/.
// We generate config for the two most common static hosts (Netlify, Vercel)
// plus a JS fallback in index.html for any other host.
const netlifyRules = stateGroups.flatMap((g) => {
  const dest = `/find/${stateSlugFor(lawyerVariant, g)}/`;
  return [
    `[[redirects]]\n  from = "/"\n  to = "${dest}"\n  status = 301\n  force = true\n  query = {state = "${g.state}"}\n`,
    `[[redirects]]\n  from = "/"\n  to = "${dest}"\n  status = 301\n  force = true\n  query = {state = "${g.state.toLowerCase()}"}\n`
  ];
}).join("\n");
writeFileSync(
  join(ROOT, "netlify.toml"),
  `# Auto-generated by scripts/build-find-pages.mjs. Do not edit by hand.\n# Redirects old /?state=XX homepage links to the dedicated state searchmap pages.\n\n${netlifyRules}`
);
console.log("Wrote netlify.toml redirects");

const vercelRedirects = stateGroups.flatMap((g) => {
  const dest = `/find/${stateSlugFor(lawyerVariant, g)}/`;
  return [
    { source: "/", has: [{ type: "query", key: "state", value: g.state }], destination: dest, permanent: true },
    { source: "/", has: [{ type: "query", key: "state", value: g.state.toLowerCase() }], destination: dest, permanent: true }
  ];
});
writeFileSync(join(ROOT, "vercel.json"), JSON.stringify({ redirects: vercelRedirects }, null, 2) + "\n");
console.log("Wrote vercel.json redirects");

// Map of state code -> destination path, for the client-side redirect
// fallback in index.html. Loaded as a small synchronous <script> (not
// fetched) so the redirect can fire before the page renders.
const stateRedirectMap = {};
stateGroups.forEach((g) => { stateRedirectMap[g.state] = `/find/${stateSlugFor(lawyerVariant, g)}/`; });
writeFileSync(
  join(ROOT, "js", "state-redirects.js"),
  `// Auto-generated by scripts/build-find-pages.mjs. Do not edit by hand.\nwindow.STATE_REDIRECTS = ${JSON.stringify(stateRedirectMap)};\n`
);
console.log("Wrote js/state-redirects.js for client-side redirect fallback");
