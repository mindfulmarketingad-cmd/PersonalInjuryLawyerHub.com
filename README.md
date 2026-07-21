# PersonalInjuryLawyerHub.com

A static directory website of personal injury lawyers and attorneys across all
50 US states, built for personalinjurylawyerhub.com.

## How it works

- **Static site.** Plain HTML/CSS/JS with no build step and no server-side
  code. Host it anywhere static files are served (GitHub Pages, Netlify,
  Cloudflare Pages, etc.).
- **Pre-fetched data.** Listing data lives in `data/lawyers.json` and is
  served as a static file. Visitors never trigger Google API calls, so there
  is no ongoing API cost.
- **Homepage map.** Leaflet with marker clustering, zip code search
  (free Zippopotam.us lookup), state/rating/type filters, sorting, a list
  toggle, and a street/satellite toggle.

## Refreshing the listing data

Data is pulled once by `scripts/fetch-places.mjs` using the Google Places API
(Text Search, New). It makes exactly 100 requests (2 queries x 50 states)
with a minimal field mask and **no photos**, then writes `data/lawyers.json`.

```
GOOGLE_PLACES_API_KEY=your-key node scripts/fetch-places.mjs
```

Run it only when you want to refresh the directory. The API key is read from
the environment and is never committed or shipped to the browser.

## Site structure

| Path | Purpose |
| --- | --- |
| `index.html` | Homepage: H1 "Personal Injury Lawyer Directory", map + listing cards |
| `find.html` | Browse lawyers by state |
| `blog/index.html` | Blog index |
| `about.html` | About page |
| `partners.html` | Partnership information |
| `contact.html` | Contact page |
| `disclaimer.html`, `privacy.html`, `terms.html` | Legal pages |
| `sitemap.html` / `sitemap.xml` | Human and search-engine sitemaps |
| `ads.txt` | Google AdSense authorization (pub-9332749804326149) |
| `robots.txt` | Crawler directives |
| `data/lawyers.json` | Pre-fetched listing data |
| `scripts/fetch-places.mjs` | One-time data pull script |

## Local preview

```
python3 -m http.server 8000
```

Then open http://localhost:8000. Absolute paths (`/css/...`, `/data/...`) are
used throughout, so serve from the repository root.
