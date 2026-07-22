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

// Two keyword variants targeting the same underlying listings.
const VARIANTS = [
  {
    id: "lawyer",
    citySlugPrefix: "personal-injury-lawyer",
    stateSlugPrefix: "personal-injury-lawyers",
    cityH1Word: "Personal Injury Lawyer",
    pluralWord: "Personal Injury Lawyers",
    siblingLabel: "personal injury attorney"
  },
  {
    id: "attorney",
    citySlugPrefix: "personal-injury-attorneys",
    stateSlugPrefix: "personal-injury-attorneys",
    cityH1Word: "Personal Injury Attorneys",
    pluralWord: "Personal Injury Attorneys",
    siblingLabel: "personal injury lawyer"
  }
];

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
      type: l.type, quote: l.quote
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
function renderPage({ title, description, url, breadcrumbHtml, breadcrumbItems, h1, listingsJson, contentHtml }) {
  const breadcrumbJsonLd = breadcrumbItems
    ? `\n  <script type="application/ld+json">\n  {\n    "@context": "https://schema.org",\n    "@type": "BreadcrumbList",\n    "itemListElement": [\n${breadcrumbItems.map((it, i) => `      { "@type": "ListItem", "position": ${i + 1}, "name": "${esc(it.name)}", "item": "${it.item}" }`).join(",\n")}\n    ]\n  }\n  </script>`
    : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${SITE}${url}">
  <link rel="stylesheet" href="/css/style.css">
  <link rel="stylesheet" href="/vendor/leaflet.css">
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9332749804326149" crossorigin="anonymous"></script>${breadcrumbJsonLd}
</head>
<body>
  <header class="site-header">
    <div class="container">
      <a class="brand" href="/">Personal Injury <span>Lawyer Hub</span></a>
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
</body>
</html>
`;
}

// ---------- Build all city pages (both variants) ----------
const findDir = join(ROOT, "find");
if (existsSync(findDir)) rmSync(findDir, { recursive: true, force: true });
mkdirSync(findDir, { recursive: true });

let cityPageCount = 0;
for (const g of cityGroups) {
  for (const variant of VARIANTS) {
    const slug = citySlugFor(variant, g);
    const sibling = VARIANTS.find((v) => v !== variant);
    const siblingSlug = citySlugFor(sibling, g);
    const stateSlug = stateSlugFor(variant, g);

    const title = `${variant.cityH1Word} in ${g.city}, ${g.stateName}`;
    const description = `There are ${g.count} Certified ${variant.pluralWord} in ${g.city}, ${g.stateName}. Search verified listings, ratings, and reviews on our interactive map.`;
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
      <p>Looking for a ${esc(sibling.siblingLabel)} instead? <a href="/find/${siblingSlug}/">View the same firms in ${esc(g.city)}, ${esc(g.stateName)}</a>. Or browse every listing in <a href="/find/${stateSlug}/">${esc(g.stateName)}</a>, or search a different area from our <a href="/">nationwide directory</a>.</p>`;

    mkdirSync(join(findDir, slug), { recursive: true });
    writeFileSync(
      join(findDir, slug, "index.html"),
      renderPage({
        title, description, url, breadcrumbHtml, breadcrumbItems,
        h1: `${variant.cityH1Word} in ${esc(g.city)}, ${esc(g.stateName)}`,
        listingsJson: listingsJsonFor(g.listings),
        contentHtml
      })
    );
    cityPageCount++;
  }
}
console.log(`Wrote ${cityPageCount} city searchmap pages to /find/ (${cityGroups.length} cities x ${VARIANTS.length} variants)`);

// ---------- Build all state pages (both variants) ----------
let statePageCount = 0;
for (const g of stateGroups) {
  for (const variant of VARIANTS) {
    const slug = stateSlugFor(variant, g);
    const sibling = VARIANTS.find((v) => v !== variant);
    const siblingSlug = stateSlugFor(sibling, g);

    const title = `${variant.cityH1Word} in ${g.stateName}`;
    const description = `There are ${g.count} Certified ${variant.pluralWord} in ${g.stateName}. Search verified listings, ratings, and reviews on our interactive map.`;
    const url = `/find/${slug}/`;
    const breadcrumbHtml = `<a href="/find.html">Find</a> &rsaquo; ${esc(g.stateName)}`;
    const breadcrumbItems = [
      { name: "Home", item: `${SITE}/` },
      { name: "Find", item: `${SITE}/find.html` },
      { name: g.stateName, item: `${SITE}${url}` }
    ];
    const contentHtml = `      <h2>${esc(variant.pluralWord)} Serving ${esc(g.stateName)}</h2>
      <p>Comparing ${esc(variant.pluralWord.toLowerCase())} in ${esc(g.stateName)} starts with looking at overall rating, review volume, and what past clients say about their experience. Use the map above to see every listed firm's location, filter by business type or minimum rating, and sort by rating or number of reviews.</p>
      <p>Looking for a ${esc(sibling.siblingLabel)} instead? <a href="/find/${siblingSlug}/">View the same firms in ${esc(g.stateName)}</a>. Or browse cities on our <a href="/find.html#${g.state}">Find page</a>, or search a different area from our <a href="/">nationwide directory</a>.</p>`;

    mkdirSync(join(findDir, slug), { recursive: true });
    writeFileSync(
      join(findDir, slug, "index.html"),
      renderPage({
        title, description, url, breadcrumbHtml, breadcrumbItems,
        h1: `${variant.cityH1Word} in ${esc(g.stateName)}`,
        listingsJson: listingsJsonFor(g.listings),
        contentHtml
      })
    );
    statePageCount++;
  }
}
console.log(`Wrote ${statePageCount} state searchmap pages to /find/ (${stateGroups.length} states x ${VARIANTS.length} variants)`);

// ---------- Regenerate find.html (state -> city index, "lawyer" variant) ----------
const lawyerVariant = VARIANTS.find((v) => v.id === "lawyer");
const byState = new Map();
for (const g of cityGroups) {
  if (!byState.has(g.state)) byState.set(g.state, { state: g.state, stateName: g.stateName, cities: [], count: 0 });
  const entry = byState.get(g.state);
  entry.cities.push(g);
  entry.count += g.count;
}
const statesForIndex = [...byState.values()].sort((a, b) => a.stateName.localeCompare(b.stateName));

const stateSections = statesForIndex.map((s) => {
  const cityLinks = s.cities
    .sort((a, b) => a.city.localeCompare(b.city))
    .map((g) => `        <li><a href="/find/${citySlugFor(lawyerVariant, g)}/">${esc(g.city)}, ${esc(s.state)}</a> <span class="count">(${g.count})</span></li>`)
    .join("\n");
  return `      <div class="state-block" id="${s.state}">
        <h3><a href="/find/${lawyerVariant.stateSlugPrefix}-${s.state.toLowerCase()}/">${esc(s.stateName)}</a> <span class="count">(${s.count} listings)</span></h3>
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
  <title>Find a Personal Injury Lawyer by State | Personal Injury Lawyer Hub</title>
  <meta name="description" content="Browse personal injury lawyers and attorneys by state and city. Our directory covers all 50 states with ratings, reviews, and locations on an interactive map.">
  <link rel="canonical" href="${SITE}/find.html">
  <link rel="stylesheet" href="/css/style.css">
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9332749804326149" crossorigin="anonymous"></script>
</head>
<body>
  <header class="site-header">
    <div class="container">
      <a class="brand" href="/">Personal Injury <span>Lawyer Hub</span></a>
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
${stateSections}
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

const urlXml = [...staticUrls, ...stateUrls, ...cityUrls]
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
console.log(`Regenerated sitemap.xml with ${staticUrls.length + stateUrls.length + cityUrls.length} URLs`);

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
