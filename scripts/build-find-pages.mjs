// Generates programmatic SEO "searchmap" pages under /find/ for every
// city + state combination present in data/lawyers.json, and regenerates
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

// Group listings by city + state.
const groups = new Map();
for (const l of data.listings) {
  if (!l.city || !l.state) continue;
  const key = l.city.trim() + "|" + l.state;
  if (!groups.has(key)) {
    groups.set(key, { city: l.city.trim(), state: l.state, listings: [] });
  }
  groups.get(key).listings.push(l);
}

const pages = [...groups.values()]
  .map((g) => {
    const stateName = STATE_NAMES[g.state] || g.state;
    const citySlug = slugify(g.city);
    const stateSlug = g.state.toLowerCase();
    const slug = `personal-injury-lawyer-${citySlug}-${stateSlug}`;
    return { ...g, stateName, slug, count: g.listings.length };
  })
  .sort((a, b) => a.stateName.localeCompare(b.stateName) || a.city.localeCompare(b.city));

// ---------- Page template ----------
function pageHtml(g) {
  const title = `Personal Injury Lawyer in ${g.city}, ${g.stateName}`;
  const description = `There are ${g.count} Certified Personal Injury Lawyers in ${g.city}, ${g.stateName}. Search verified listings, ratings, and reviews on our interactive map.`;
  const url = `/find/${g.slug}/`;
  const listingsJson = JSON.stringify(
    g.listings.map((l) => ({
      name: l.name, address: l.address, city: l.city, state: l.state,
      lat: l.lat, lng: l.lng, rating: l.rating, reviews: l.reviews,
      type: l.type, quote: l.quote
    }))
  );

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
  <link rel="stylesheet" href="/vendor/MarkerCluster.css">
  <link rel="stylesheet" href="/vendor/MarkerCluster.Default.css">
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9332749804326149" crossorigin="anonymous"></script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "${SITE}/" },
      { "@type": "ListItem", "position": 2, "name": "Find", "item": "${SITE}/find.html" },
      { "@type": "ListItem", "position": 3, "name": "${esc(g.stateName)}", "item": "${SITE}/find.html#${g.state}" },
      { "@type": "ListItem", "position": 4, "name": "${esc(g.city)}", "item": "${SITE}${url}" }
    ]
  }
  </script>
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
      <p class="breadcrumb"><a href="/find.html">Find</a> &rsaquo; <a href="/find/personal-injury-lawyers-${g.state.toLowerCase()}/">${esc(g.stateName)}</a> &rsaquo; ${esc(g.city)}</p>
      <h1>Personal Injury Lawyer in ${esc(g.city)}, ${esc(g.stateName)}</h1>
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
      <h2>Personal Injury Lawyers Serving ${esc(g.city)}, ${esc(g.stateName)}</h2>
      <p>Comparing personal injury lawyers in ${esc(g.city)} starts with looking at overall rating, review volume, and what past clients say about their experience. Use the map above to see every listed firm's location, filter by business type or minimum rating, and sort by rating or number of reviews.</p>
      <p>Looking for more options nearby? Browse every listing in <a href="/find/personal-injury-lawyers-${g.state.toLowerCase()}/">${esc(g.stateName)}</a> or search a different area from our <a href="/">nationwide directory</a>.</p>
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
  <script src="/vendor/leaflet.markercluster.js"></script>
  <script src="/js/citymap.js"></script>
</body>
</html>
`;
}

// ---------- State-level groups (all listings in a state, one page each) ----------
const stateGroups = new Map();
for (const l of data.listings) {
  if (!l.state) continue;
  if (!stateGroups.has(l.state)) {
    stateGroups.set(l.state, { state: l.state, stateName: STATE_NAMES[l.state] || l.state, listings: [] });
  }
  stateGroups.get(l.state).listings.push(l);
}
const statePages = [...stateGroups.values()]
  .map((g) => ({ ...g, slug: `personal-injury-lawyers-${g.state.toLowerCase()}`, count: g.listings.length }))
  .sort((a, b) => a.stateName.localeCompare(b.stateName));

function statePageHtml(g) {
  const title = `Personal Injury Lawyer in ${g.stateName}`;
  const description = `There are ${g.count} Certified Personal Injury Lawyers in ${g.stateName}. Search verified listings, ratings, and reviews on our interactive map.`;
  const url = `/find/${g.slug}/`;
  const listingsJson = JSON.stringify(
    g.listings.map((l) => ({
      name: l.name, address: l.address, city: l.city, state: l.state,
      lat: l.lat, lng: l.lng, rating: l.rating, reviews: l.reviews,
      type: l.type, quote: l.quote
    }))
  );

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
  <link rel="stylesheet" href="/vendor/MarkerCluster.css">
  <link rel="stylesheet" href="/vendor/MarkerCluster.Default.css">
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9332749804326149" crossorigin="anonymous"></script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "${SITE}/" },
      { "@type": "ListItem", "position": 2, "name": "Find", "item": "${SITE}/find.html" },
      { "@type": "ListItem", "position": 3, "name": "${esc(g.stateName)}", "item": "${SITE}${url}" }
    ]
  }
  </script>
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
      <p class="breadcrumb"><a href="/find.html">Find</a> &rsaquo; ${esc(g.stateName)}</p>
      <h1>Personal Injury Lawyer in ${esc(g.stateName)}</h1>
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
      <h2>Personal Injury Lawyers Serving ${esc(g.stateName)}</h2>
      <p>Comparing personal injury lawyers in ${esc(g.stateName)} starts with looking at overall rating, review volume, and what past clients say about their experience. Use the map above to see every listed firm's location, filter by business type or minimum rating, and sort by rating or number of reviews.</p>
      <p>Looking for a specific city? Browse the city list on our <a href="/find.html#${g.state}">Find page</a> or search a different area from our <a href="/">nationwide directory</a>.</p>
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
  <script src="/vendor/leaflet.markercluster.js"></script>
  <script src="/js/citymap.js"></script>
</body>
</html>
`;
}

// ---------- Write /find/{slug}/index.html for every city and every state ----------
const findDir = join(ROOT, "find");
if (existsSync(findDir)) rmSync(findDir, { recursive: true, force: true });
mkdirSync(findDir, { recursive: true });

for (const g of pages) {
  const dir = join(findDir, g.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), pageHtml(g));
}
console.log(`Wrote ${pages.length} city searchmap pages to /find/`);

for (const g of statePages) {
  const dir = join(findDir, g.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), statePageHtml(g));
}
console.log(`Wrote ${statePages.length} state searchmap pages to /find/`);

// ---------- Regenerate find.html (state -> city index) ----------
const byState = new Map();
for (const g of pages) {
  if (!byState.has(g.state)) byState.set(g.state, { state: g.state, stateName: g.stateName, cities: [], count: 0 });
  const entry = byState.get(g.state);
  entry.cities.push(g);
  entry.count += g.count;
}
const states = [...byState.values()].sort((a, b) => a.stateName.localeCompare(b.stateName));

const stateSections = states.map((s) => {
  const cityLinks = s.cities
    .sort((a, b) => a.city.localeCompare(b.city))
    .map((g) => `        <li><a href="/find/${g.slug}/">${esc(g.city)}, ${esc(s.state)}</a> <span class="count">(${g.count})</span></li>`)
    .join("\n");
  return `      <div class="state-block" id="${s.state}">
        <h3><a href="/find/personal-injury-lawyers-${s.state.toLowerCase()}/">${esc(s.stateName)}</a> <span class="count">(${s.count} listings)</span></h3>
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
      <p>Our directory includes ${data.count} personal injury law firm listings across all 50 states and the District of Columbia. Choose a state below, then a city, to open a dedicated map and listing page for that area. Or use the zip code search on the <a href="/#directory">homepage directory</a> for results closest to you.</p>

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

const cityUrls = pages.map((g) => ({ loc: `/find/${g.slug}/`, freq: "monthly", pri: "0.6" }));
const stateUrls = statePages.map((g) => ({ loc: `/find/${g.slug}/`, freq: "monthly", pri: "0.7" }));

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

// ---------- Redirect old ?state=XX homepage links to the new state pages ----------
// Old links like /?state=FL#directory pointed at the homepage filtered by
// state. Those state searchmap pages now live at /find/personal-injury-lawyers-{state}/.
// We generate config for the two most common static hosts (Netlify, Vercel)
// plus a JS fallback in index.html for any other host.
const netlifyRules = statePages.flatMap((g) => ([
  `[[redirects]]\n  from = "/"\n  to = "/find/${g.slug}/"\n  status = 301\n  force = true\n  query = {state = "${g.state}"}\n`,
  `[[redirects]]\n  from = "/"\n  to = "/find/${g.slug}/"\n  status = 301\n  force = true\n  query = {state = "${g.state.toLowerCase()}"}\n`
])).join("\n");
writeFileSync(
  join(ROOT, "netlify.toml"),
  `# Auto-generated by scripts/build-find-pages.mjs. Do not edit by hand.\n# Redirects old /?state=XX homepage links to the dedicated state searchmap pages.\n\n${netlifyRules}`
);
console.log("Wrote netlify.toml redirects");

const vercelRedirects = statePages.flatMap((g) => ([
  { source: "/", has: [{ type: "query", key: "state", value: g.state }], destination: `/find/${g.slug}/`, permanent: true },
  { source: "/", has: [{ type: "query", key: "state", value: g.state.toLowerCase() }], destination: `/find/${g.slug}/`, permanent: true }
]));
writeFileSync(join(ROOT, "vercel.json"), JSON.stringify({ redirects: vercelRedirects }, null, 2) + "\n");
console.log("Wrote vercel.json redirects");

// Map of state code -> destination path, for the client-side redirect
// fallback in index.html. Loaded as a small synchronous <script> (not
// fetched) so the redirect can fire before the page renders.
const stateRedirectMap = {};
statePages.forEach((g) => { stateRedirectMap[g.state] = `/find/${g.slug}/`; });
writeFileSync(
  join(ROOT, "js", "state-redirects.js"),
  `// Auto-generated by scripts/build-find-pages.mjs. Do not edit by hand.\nwindow.STATE_REDIRECTS = ${JSON.stringify(stateRedirectMap)};\n`
);
console.log("Wrote js/state-redirects.js for client-side redirect fallback");
