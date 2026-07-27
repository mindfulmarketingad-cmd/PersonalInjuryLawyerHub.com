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
import { VARIANT_CONTENT } from "./variant-content.mjs";

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
  },
  {
    id: "motorcycle-accident",
    citySlugPrefix: "motorcycle-accident-attorney",
    stateSlugPrefix: "motorcycle-accident-attorneys",
    cityH1Word: "Motorcycle Accident Attorney",
    pluralWord: "Motorcycle Accident Attorneys",
    selfLabel: "motorcycle accident attorney",
    shortLabel: "Motorcycle",
    certified: false
  },
  {
    id: "crime-victim",
    citySlugPrefix: "crime-victim-attorney",
    stateSlugPrefix: "crime-victim-attorneys",
    cityH1Word: "Crime Victim Attorney",
    pluralWord: "Crime Victim Attorneys",
    selfLabel: "crime victim attorney",
    shortLabel: "Crime Victim",
    titleSuffix: true, // "[City], [State] Crime Victim Attorney"
    certified: false
  },
  {
    id: "uber-accident",
    citySlugPrefix: "uber-accident-attorney",
    stateSlugPrefix: "uber-accident-attorneys",
    cityH1Word: "Uber Accident Attorney",
    pluralWord: "Uber Accident Attorneys",
    selfLabel: "Uber accident attorney",
    shortLabel: "Uber",
    certified: false
  },
  {
    id: "drunk-driving",
    citySlugPrefix: "drunk-driving-accident-attorney",
    stateSlugPrefix: "drunk-driving-accident-attorneys",
    cityH1Word: "Drunk Driving Accident Attorney",
    pluralWord: "Drunk Driving Accident Attorneys",
    selfLabel: "drunk driving accident attorney",
    shortLabel: "Drunk Driving",
    titleSuffix: true, // "[City], [State] Drunk Driving Accident Attorney"
    certified: false
  },
  {
    id: "premises-liability",
    citySlugPrefix: "premises-liability-attorney",
    stateSlugPrefix: "premises-liability-attorneys",
    cityH1Word: "Premises Liability Attorney",
    pluralWord: "Premises Liability Attorneys",
    selfLabel: "premises liability attorney",
    shortLabel: "Premises Liability",
    certified: false
  },
  {
    id: "medical-malpractice",
    citySlugPrefix: "medical-malpractice-attorney",
    stateSlugPrefix: "medical-malpractice-attorneys",
    cityH1Word: "Medical Malpractice Attorney",
    pluralWord: "Medical Malpractice Attorneys",
    selfLabel: "medical malpractice attorney",
    shortLabel: "Med Mal",
    certified: false
  },
  {
    id: "property-owner-negligence",
    citySlugPrefix: "property-owner-negligence-attorney",
    stateSlugPrefix: "property-owner-negligence-attorneys",
    cityH1Word: "Property Owner Negligence Attorney",
    pluralWord: "Property Owner Negligence Attorneys",
    selfLabel: "property owner negligence attorney",
    shortLabel: "Property Owner",
    certified: false
  },
  {
    id: "daycare-negligence",
    citySlugPrefix: "daycare-negligence-attorney",
    stateSlugPrefix: "daycare-negligence-attorneys",
    cityH1Word: "Daycare Negligence Attorney",
    pluralWord: "Daycare Negligence Attorneys",
    selfLabel: "daycare negligence attorney",
    shortLabel: "Daycare",
    titleSuffix: true, // "[City], [State] Daycare Negligence Attorney"
    certified: false
  }
];

// Official state resources, shown only on the variant + state they actually
// govern. Keyed by variant id, then state code.
const STATE_RESOURCES = {
  "daycare-negligence": {
    GA: [
      {
        label: "Georgia DECAL Child Care Licensing Rules and Regulations (PDF)",
        url: "https://www.decal.ga.gov/documents/attachments/CCLCRulesandRegulations.pdf",
        note: "Published by Bright from the Start: Georgia Department of Early Care and Learning. These rules set the licensing standards Georgia child care programs must meet, including supervision ratios, staff qualifications, and health and safety requirements."
      }
    ]
  }
};

function resourcesHtml(variant, stateCode) {
  const list = (STATE_RESOURCES[variant.id] || {})[stateCode];
  if (!list || !list.length) return "";
  return `      <h2>Official State Resources</h2>
      <ul>
${list.map((r) => `        <li><a href="${r.url}" target="_blank" rel="noopener">${esc(r.label)}</a> &mdash; ${esc(r.note)}</li>`).join("\n")}
      </ul>`;
}


// ---------- Long-form, per-case-type editorial sections ----------
// Gives each variant genuinely different copy rather than a swapped keyword.
function editorialHtml(variant, place) {
  const c = VARIANT_CONTENT[variant.id];
  if (!c) return "";
  return `      <h2>What a ${esc(variant.selfLabel)} handles</h2>
      <p>${esc(c.handles)}</p>

      <h2>Common ${esc(variant.selfLabel)} cases in ${esc(place)}</h2>
      <ul>
${c.scenarios.map((x) => `        <li>${esc(x)}</li>`).join("\n")}
      </ul>

      <h2>How these claims are proven</h2>
      <p>${esc(c.proving)}</p>

      <h2>Compensation in ${esc(variant.selfLabel)} claims</h2>
      <p>${esc(c.damages)}</p>

      <h2>Deadlines that apply</h2>
      <p>Every state sets a statute of limitations for injury lawsuits, and claims involving a government entity often carry far shorter notice deadlines measured in months. Because those periods differ by state and by claim type, confirm the deadline that applies to your situation with a lawyer licensed in ${esc(place.split(", ").pop())} rather than relying on a general figure. Our guide to <a href="/blog/personal-injury-statute-of-limitations/">personal injury statutes of limitations</a> explains how the clock works and what can pause it.</p>`;
}

// Real, per-location firm links so each page carries unique internal links.
function topFirmsHtml(g, place) {
  const top = g.listings
    .filter((l) => l.rating != null && l.slug)
    .sort((a, b) => (b.rating - a.rating) || ((b.reviews || 0) - (a.reviews || 0)))
    .slice(0, 8);
  if (!top.length) return "";
  return `      <h2>Highest-rated listings in ${esc(place)}</h2>
      <p>These are the highest-rated firms currently listed in ${esc(place)}, based on public review data. Ratings are a starting point for comparison, not an endorsement or a measure of legal skill.</p>
      <ul>
${top
    .map(
      (l) =>
        `        <li><a href="/partners/${l.slug}/">${esc(l.name)}</a> &mdash; ${l.rating.toFixed(1)} stars${l.reviews ? ` from ${l.reviews.toLocaleString()} reviews` : ""}${l.city ? `, ${esc(l.city)}` : ""}</li>`
    )
    .join("\n")}
      </ul>`;
}

const BLOG_LINKS = [
  ["/blog/how-to-choose-a-personal-injury-lawyer/", "How to choose a personal injury lawyer: 10 questions to ask"],
  ["/blog/personal-injury-lawyer-cost-contingency-fees/", "What a personal injury lawyer costs: contingency fees explained"],
  ["/blog/first-72-hours-after-a-car-accident/", "What to do in the first 72 hours after a car accident"],
  ["/blog/personal-injury-statute-of-limitations/", "Personal injury statute of limitations: what you need to know"]
];

function blogLinksHtml() {
  return `      <h2>Related reading</h2>
      <ul>
${BLOG_LINKS.map(([href, label]) => `        <li><a href="${href}">${esc(label)}</a></li>`).join("\n")}
      </ul>`;
}

function localFaqs(variant, place, count) {
  return [
    {
      q: `How many ${variant.pluralWord.toLowerCase()} are listed in ${place}?`,
      a: `Our directory currently lists ${count} ${count === 1 ? "firm" : "firms"} serving ${place}. You can compare them on the map above by rating, review volume, and business type.`
    },
    {
      q: `How much does it cost to hire a ${variant.selfLabel} in ${place}?`,
      a: `Most personal injury firms work on contingency, meaning you pay attorney fees only if they recover money for you, and initial consultations are typically free. Percentages and the treatment of case costs vary between firms, so ask for the fee agreement in writing before signing.`
    },
    {
      q: `Do I need a lawyer for a ${variant.selfLabel.replace(/ (lawyer|attorney)s?$/, "")} claim?`,
      a: `Not every claim requires representation. Minor incidents with no lasting injury and undisputed fault can often be handled directly with the insurer. Representation tends to add the most value when injuries are significant, fault is disputed, multiple parties are involved, or an insurer has denied the claim or made a low offer.`
    }
  ];
}

function faqBlockHtml(faqs) {
  return `      <h2>Frequently asked questions</h2>
${faqs.map((f) => `      <h3>${esc(f.q)}</h3>\n      <p>${esc(f.a)}</p>`).join("\n")}`;
}

function faqJsonLdFor(faqs) {
  return `\n  <script type="application/ld+json">\n  {\n    "@context": "https://schema.org",\n    "@type": "FAQPage",\n    "mainEntity": [\n${faqs
    .map(
      (f) =>
        `      {\n        "@type": "Question",\n        "name": ${JSON.stringify(f.q)},\n        "acceptedAnswer": { "@type": "Answer", "text": ${JSON.stringify(f.a)} }\n      }`
    )
    .join(",\n")}\n    ]\n  }\n  </script>`;
}


// Other cities in the same state for this variant. Useful for small towns
// with few local listings, and gives each page a unique internal link set.
function nearbyCitiesHtml(variant, g, allCityGroups) {
  const siblings = allCityGroups
    .filter((c) => c.state === g.state && c.citySlug !== g.citySlug)
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
  if (!siblings.length) return "";
  return `      <h2>Other cities in ${esc(g.stateName)}</h2>
      <p>If you are willing to work with a firm outside ${esc(g.city)}, these nearby ${esc(g.stateName)} cities have additional ${esc(variant.pluralWord.toLowerCase())} listed. Many firms handle cases throughout the state, so it is worth widening your search when local options are limited.</p>
      <ul>
${siblings
    .map(
      (c) =>
        `        <li><a href="/find/${citySlugFor(variant, c)}/">${esc(variant.pluralWord)} in ${esc(c.city)}, ${esc(c.state)}</a> (${c.count} listed)</li>`
    )
    .join("\n")}
      </ul>`;
}

// What working with a firm actually looks like — same across variants but
// substantive, and it answers a question most visitors have.
function processHtml(variant) {
  return `      <h2>What to expect when you contact a firm</h2>
      <p>Most ${esc(variant.pluralWord.toLowerCase())} offer a free initial consultation, and the great majority work on a contingency fee, meaning you owe no attorney fee unless they recover money for you. That first conversation is usually a screening call: they will ask what happened, when it happened, whether you have received medical treatment, and whether you have spoken with any insurer.</p>
      <p>If the firm takes the case, the early work typically involves sending a letter of representation so adjusters contact them instead of you, gathering the police or incident report, collecting your medical records and bills, and identifying every insurance policy that might apply. They will generally wait to value the claim until your treatment stabilizes, because settling before then means settling without knowing what your future care will cost.</p>
      <p>Before signing anything, ask who will handle your file day to day, what the fee percentage is and when it increases, whether case costs are deducted before or after the fee is calculated, and what happens to those costs if the case is unsuccessful. Get the fee agreement in writing and read it away from the office.</p>`;
}

// Some variants are specified as "[City], [State] X" rather than "X in [City], [State]".
function headingFor(variant, place) {
  return variant.titleSuffix
    ? `${place} ${variant.cityH1Word}`
    : `${variant.cityH1Word} in ${place}`;
}

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
function renderPage({ title, description, url, breadcrumbHtml, breadcrumbItems, h1, listingsJson, contentHtml, featuredAlt, faqs }) {
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
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9332749804326149" crossorigin="anonymous"></script>${breadcrumbJsonLd}${faqs && faqs.length ? faqJsonLdFor(faqs) : ""}
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

    const title = headingFor(variant, `${g.city}, ${g.stateName}`);
    const description = descriptionFor(variant, g.count, `${g.city}, ${g.stateName}`);
    const url = `/find/${slug}/`;
    const breadcrumbHtml = `<a href="/find.html">Find</a> &rsaquo; <a href="/find/${stateSlug}/">${esc(g.stateName)}</a> &rsaquo; ${esc(g.city)}`;
    const breadcrumbItems = [
      { name: "Home", item: `${SITE}/` },
      { name: "Find", item: `${SITE}/find.html` },
      { name: g.stateName, item: `${SITE}/find/${stateSlug}/` },
      { name: g.city, item: `${SITE}${url}` }
    ];
    const cityFaqs = localFaqs(variant, `${g.city}, ${g.stateName}`, g.count);
    const contentHtml = `      <h2>${esc(variant.pluralWord)} Serving ${esc(g.city)}, ${esc(g.stateName)}</h2>
      <p>Comparing ${esc(variant.pluralWord.toLowerCase())} in ${esc(g.city)} starts with looking at overall rating, review volume, and what past clients say about their experience. Use the map above to see every listed firm's location, filter by business type or minimum rating, and sort by rating or number of reviews.</p>
      ${statsHtml(g, `${g.city}, ${g.stateName}`)}
${editorialHtml(variant, `${g.city}, ${g.stateName}`)}
${topFirmsHtml(g, `${g.city}, ${g.stateName}`)}
${resourcesHtml(variant, g.state)}
${processHtml(variant)}
${nearbyCitiesHtml(variant, g, cityGroups)}
${faqBlockHtml(cityFaqs)}
${blogLinksHtml()}
      ${relatedSearchesHtml(variant, g, citySlugFor)}
      <p>Browse every listing in <a href="/find/${stateSlug}/">${esc(g.stateName)}</a>, or search a different area from our <a href="/">nationwide directory</a>.</p>`;

    mkdirSync(join(findDir, slug), { recursive: true });
    writeFileSync(
      join(findDir, slug, "index.html"),
      renderPage({
        title, description, url, breadcrumbHtml, breadcrumbItems,
        h1: esc(headingFor(variant, `${g.city}, ${g.stateName}`)),
        listingsJson: listingsJsonFor(g.listings),
        contentHtml,
        featuredAlt: `${variant.pluralWord} search map for ${g.city}, ${g.stateName}`,
        faqs: cityFaqs
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

    const title = headingFor(variant, g.stateName);
    const description = descriptionFor(variant, g.count, g.stateName);
    const url = `/find/${slug}/`;
    const breadcrumbHtml = `<a href="/find.html">Find</a> &rsaquo; ${esc(g.stateName)}`;
    const breadcrumbItems = [
      { name: "Home", item: `${SITE}/` },
      { name: "Find", item: `${SITE}/find.html` },
      { name: g.stateName, item: `${SITE}${url}` }
    ];
    const stateFaqs = localFaqs(variant, g.stateName, g.count);
    const contentHtml = `      <h2>${esc(variant.pluralWord)} Serving ${esc(g.stateName)}</h2>
      <p>Comparing ${esc(variant.pluralWord.toLowerCase())} in ${esc(g.stateName)} starts with looking at overall rating, review volume, and what past clients say about their experience. Use the map above to see every listed firm's location, filter by business type or minimum rating, and sort by rating or number of reviews.</p>
      ${statsHtml(g, g.stateName)}
${editorialHtml(variant, g.stateName)}
${topFirmsHtml(g, g.stateName)}
${resourcesHtml(variant, g.state)}
${processHtml(variant)}
${faqBlockHtml(stateFaqs)}
${blogLinksHtml()}
      ${relatedSearchesHtml(variant, g, stateSlugFor)}
      <p>Browse cities on our <a href="/find.html#${g.state}">Find page</a>, or search a different area from our <a href="/">nationwide directory</a>.</p>`;

    mkdirSync(join(findDir, slug), { recursive: true });
    writeFileSync(
      join(findDir, slug, "index.html"),
      renderPage({
        title, description, url, breadcrumbHtml, breadcrumbItems,
        h1: esc(headingFor(variant, g.stateName)),
        listingsJson: listingsJsonFor(g.listings),
        contentHtml,
        featuredAlt: `${variant.pluralWord} search map for ${g.stateName}`,
        faqs: stateFaqs
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


// ---------- Per-listing derived facts (real data only) ----------
// Everything here is computed from the listing set we actually have. We do
// not assert practice areas, years in business, credentials, or outcomes for
// a named real business, because we have no source for those.
function listingContext(l) {
  const cityPeers = data.listings.filter((x) => x.city === l.city && x.state === l.state);
  const statePeers = data.listings.filter((x) => x.state === l.state);
  const rated = (arr) => arr.filter((x) => x.rating != null);
  const rankBy = (arr, key) => {
    const sorted = rated(arr).slice().sort((a, b) => (b[key] || 0) - (a[key] || 0));
    const idx = sorted.findIndex((x) => x.slug === l.slug);
    return { rank: idx >= 0 ? idx + 1 : null, total: sorted.length };
  };
  return {
    cityPeers, statePeers,
    cityRating: rankBy(cityPeers, "rating"),
    stateRating: rankBy(statePeers, "rating"),
    stateReviews: rankBy(statePeers, "reviews"),
    cityAvg: rated(cityPeers).length
      ? rated(cityPeers).reduce((sum, x) => sum + x.rating, 0) / rated(cityPeers).length
      : null
  };
}

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function ratingContextHtml(l, ctx, stateName) {
  if (l.rating == null) {
    return `      <h2>Review profile</h2>
      <p>${esc(l.name)} does not currently have a public rating in our data set. That is not a negative signal on its own — newer offices and firms that do not actively request reviews often show few or none. It does mean you will want to rely more on a direct consultation and on your state bar's licensing and discipline lookup when evaluating this firm.</p>`;
  }
  const parts = [];
  parts.push(`${esc(l.name)} holds a ${l.rating.toFixed(1)}-star rating from ${l.reviews.toLocaleString()} public review${l.reviews === 1 ? "" : "s"}.`);
  if (ctx.cityRating.rank && ctx.cityRating.total > 1) {
    parts.push(`Among the ${ctx.cityRating.total} rated firms we list in ${esc(l.city)}, that places it ${ordinal(ctx.cityRating.rank)} by rating.`);
  }
  if (ctx.cityAvg != null && ctx.cityPeers.length > 1) {
    const diff = l.rating - ctx.cityAvg;
    const cmp = Math.abs(diff) < 0.05 ? "in line with" : diff > 0 ? "above" : "below";
    parts.push(`The average rating across ${esc(l.city)} listings is ${ctx.cityAvg.toFixed(1)}, so this firm sits ${cmp} the local average.`);
  }
  if (ctx.stateReviews.rank && ctx.stateReviews.total > 5) {
    const pct = Math.round((ctx.stateReviews.rank / ctx.stateReviews.total) * 100);
    if (pct <= 25) {
      parts.push(`By review volume it is among the top ${pct <= 10 ? "10" : "25"} percent of ${esc(stateName)} listings in our directory, which generally indicates an established practice with a substantial client history.`);
    }
  }
  return `      <h2>Review profile</h2>
      <p>${parts.join(" ")}</p>
      <p>Ratings are a useful filter but a poor substitute for diligence. Review counts reward firms that systematically ask for feedback, and a high average across a small number of reviews is far less meaningful than a slightly lower average across hundreds. Read what reviewers actually describe — responsiveness, clarity about fees, whether they felt informed — rather than the number alone.</p>`;
}

function availabilityHtml(l) {
  if (!l.hours || !l.hours.length) return "";
  const text = l.hours.join(" ").toLowerCase();
  const notes = [];
  if (text.includes("open 24 hours")) {
    notes.push("This listing reports 24-hour availability. For personal injury firms that usually reflects an answering service or intake line rather than attorneys working overnight, but it does mean you can start a claim outside business hours.");
  }
  const weekend = l.hours.filter((h) => /^(Saturday|Sunday)/.test(h) && !/closed/i.test(h));
  if (weekend.length && !text.includes("open 24 hours")) {
    notes.push(`Weekend hours are listed for ${weekend.map((h) => h.split(":")[0]).join(" and ")}, which can matter if you cannot take time off work during the week.`);
  }
  if (!weekend.length && !text.includes("open 24 hours")) {
    notes.push("Weekend hours are not listed, so plan to make contact on a weekday. Many firms will still return an after-hours message on the next business day.");
  }
  return `      <h2>Availability</h2>
      <p>${esc(notes.join(" "))}</p>`;
}

function nearbyFirmsHtml(l, ctx) {
  const others = ctx.cityPeers
    .filter((x) => x.slug && x.slug !== l.slug && x.rating != null)
    .sort((a, b) => (b.rating - a.rating) || ((b.reviews || 0) - (a.reviews || 0)))
    .slice(0, 6);
  if (!others.length) return "";
  return `      <h2>Other firms listed in ${esc(l.city)}</h2>
      <p>Most people contact more than one firm before deciding. Consultations are typically free, so comparing two or three costs you nothing but time.</p>
      <ul>
${others.map((x) => `        <li><a href="/partners/${x.slug}/">${esc(x.name)}</a> &mdash; ${x.rating.toFixed(1)} stars${x.reviews ? ` from ${x.reviews.toLocaleString()} reviews` : ""}</li>`).join("\n")}
      </ul>`;
}

function consultationHtml(l) {
  return `      <h2>Preparing to contact ${esc(l.name)}</h2>
      <p>Bring as much of the following as you have. Firms can work without it, but a first consultation is far more productive when the basics are in front of them:</p>
      <ul>
        <li>The police or incident report, or the report number</li>
        <li>Photographs of the scene, vehicles, hazard, or injuries</li>
        <li>Names and contact details for any witnesses</li>
        <li>Medical records, discharge paperwork, and bills received so far</li>
        <li>Your insurance policy, and any correspondence from either insurer</li>
        <li>Documentation of missed work and lost income</li>
        <li>A written timeline of what happened while your memory is fresh</li>
      </ul>
      <p>Questions worth asking on that first call include who will handle your file day to day, what portion of the firm's practice is personal injury, what the contingency percentage is and when it increases, whether case costs are deducted before or after the fee is calculated, and what happens to those costs if the case is unsuccessful. Our guide to <a href="/blog/how-to-choose-a-personal-injury-lawyer/">choosing a personal injury lawyer</a> covers all ten questions in detail, and <a href="/blog/personal-injury-lawyer-cost-contingency-fees/">what a personal injury lawyer costs</a> explains the fee structure.</p>
      <p>Before signing anything, confirm the firm's attorneys are licensed and in good standing through your state bar association's public lookup. It takes about two minutes and is the single most useful check available to you.</p>`;
}

function verifyHtml(l, stateName) {
  return `      <h2>How we source this listing</h2>
      <p>This profile is compiled from publicly available business data: the firm's name, address, business category, public rating and review count, published hours, and website. We do not add editorial commentary about a firm's abilities, and inclusion in this directory is not an endorsement or a referral.</p>
      <p>We do not hold information about which specific case types ${esc(l.name)} accepts, the attorneys who practice there, their credentials, or their case history. Confirm all of that directly with the firm and with the ${esc(stateName)} state bar before making a decision. If you represent this business and something here is inaccurate or out of date, <a href="/contact.html">contact us</a> and we will correct or remove it at no charge.</p>`;
}

function partnerFaqs(l, ctx, stateName) {
  const faqs = [
    {
      q: `Where is ${l.name} located?`,
      a: `${l.name} is located at ${l.address}. Directions from your current location are available from the map on this page.`
    },
    {
      q: `What are ${l.name}'s hours?`,
      a: l.hours && l.hours.length
        ? `Published hours are: ${l.hours.join("; ")}. Hours can change, so confirm directly before travelling.`
        : `Published hours are not available for this listing in our data. Contact the firm directly to confirm when they are open.`
    },
    {
      q: `How much does it cost to consult ${l.name}?`,
      a: `We do not hold fee information for individual firms. Personal injury consultations are typically free and most firms in this practice area work on contingency, meaning you pay attorney fees only if they recover money for you. Confirm the specific fee structure with the firm and get it in writing.`
    }
  ];
  if (l.rating != null) {
    faqs.splice(1, 0, {
      q: `Is ${l.name} well rated?`,
      a: `${l.name} holds a ${l.rating.toFixed(1)}-star public rating from ${l.reviews.toLocaleString()} review${l.reviews === 1 ? "" : "s"}${ctx.cityRating.rank && ctx.cityRating.total > 1 ? `, ranking ${ordinal(ctx.cityRating.rank)} of ${ctx.cityRating.total} rated firms we list in ${l.city}` : ""}. Ratings reflect reviewer opinion and are not a measure of legal skill or likely outcome.`
    });
  }
  return faqs;
}

function partnerPageHtml(l) {
  const stateName = STATE_NAMES[l.state] || l.state;
  const ctx = listingContext(l);
  const pFaqs = partnerFaqs(l, ctx, stateName);
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
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9332749804326149" crossorigin="anonymous"></script>${localBusinessJsonLd}${faqJsonLdFor(pFaqs)}
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

${ratingContextHtml(l, ctx, stateName)}
${availabilityHtml(l)}
${consultationHtml(l)}
${nearbyFirmsHtml(l, ctx)}
${faqBlockHtml(pFaqs)}
${verifyHtml(l, stateName)}

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
    .map((g) => `        <li data-city="${esc(g.city + ", " + s.state)}"><a href="/find/${citySlugFor(lawyerVariant, g)}/">${esc(g.city)}, ${esc(s.state)}</a> <span class="count">(${g.count})</span></li>`)
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
