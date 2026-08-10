// Generates /blog/ posts and the blog index from the POSTS array below.
// Shared header/footer/nav live here so every post stays consistent with
// the rest of the site. Re-run after editing or adding a post:
//
//   node scripts/build-blog.mjs

import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://personalinjurylawyerhub.com";

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const POSTS = [];

function faqJsonLd(faqs) {
  if (!faqs || !faqs.length) return "";
  return `\n  <script type="application/ld+json">\n  {\n    "@context": "https://schema.org",\n    "@type": "FAQPage",\n    "mainEntity": [\n${faqs
    .map(
      (f) =>
        `      {\n        "@type": "Question",\n        "name": ${JSON.stringify(f.q)},\n        "acceptedAnswer": { "@type": "Answer", "text": ${JSON.stringify(f.a)} }\n      }`
    )
    .join(",\n")}\n    ]\n  }\n  </script>`;
}

function faqHtml(faqs) {
  if (!faqs || !faqs.length) return "";
  return (
    `      <h2>Frequently Asked Questions</h2>\n` +
    faqs.map((f) => `      <h3>${esc(f.q)}</h3>\n      <p>${f.a}</p>`).join("\n")
  );
}

export function renderPost(p) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" type="image/svg+xml" href="/assets/logo/logo.svg">
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/logo/favicon-32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/assets/logo/favicon-16.png">
  <link rel="apple-touch-icon" href="/assets/logo/apple-touch-icon.png">
  <title>${esc(p.title)} | Personal Injury Lawyer Hub</title>
  <meta name="description" content="${esc(p.description)}">
  <link rel="canonical" href="${SITE}/blog/${p.slug}/">
  <meta property="og:title" content="${esc(p.title)}">
  <meta property="og:description" content="${esc(p.description)}">
  <meta property="og:type" content="article">
  <meta property="og:image" content="${SITE}/assets/featured/search-map.svg">
  <link rel="stylesheet" href="/css/style.css">
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9332749804326149" crossorigin="anonymous"></script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": ${JSON.stringify(p.title)},
    "description": ${JSON.stringify(p.description)},
    "datePublished": "${p.date}",
    "dateModified": "${p.date}",
    "author": { "@type": "Organization", "name": "Personal Injury Lawyer Hub" },
    "publisher": { "@type": "Organization", "name": "Personal Injury Lawyer Hub" },
    "mainEntityOfPage": "${SITE}/blog/${p.slug}/"
  }
  </script>${faqJsonLd(p.faqs)}
</head>
<body>
  <header class="site-header">
    <div class="container">
      <a class="brand" href="/"><img src="/assets/logo/logo.svg" alt="Personal Injury Lawyer Hub" class="brand-logo">Personal Injury <span>Lawyer Hub</span></a>
      <nav class="site-nav">
        <a href="/">Home</a>
        <a href="/blog/" class="active">Blog</a>
        <a href="/about.html">About</a>
        <a href="/find.html">Find</a>
        <a href="/partners.html">Partners</a>
      </nav>
    </div>
  </header>

  <section class="page-title">
    <div class="container">
      <p class="breadcrumb"><a href="/blog/">Blog</a> &rsaquo; ${esc(p.crumb || p.title)}</p>
      <h1>${esc(p.title)}</h1>
      <p>${esc(p.standfirst)}</p>
    </div>
  </section>

  <main class="content">
    <div class="container">
${p.body}

${faqHtml(p.faqs)}

      <h2>Find a Personal Injury Lawyer Near You</h2>
      <p>${p.cta}</p>
      <p>Browse our <a href="/">nationwide directory map</a>, search <a href="/find.html">by state and city</a>, or read more on our <a href="/blog/">blog</a>.</p>
      <p class="form-note">This article is general information, not legal advice, and reading it does not create an attorney-client relationship. Laws and deadlines vary by state and change over time. Always confirm how the rules apply to your situation with a licensed attorney in your state. See our full <a href="/disclaimer.html">Disclaimer</a>.</p>
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
  <script src="/js/analytics-client.js"></script>
</body>
</html>
`;
}

export function renderIndex(posts) {
  const items = posts
    .map(
      (p) => `        <article class="post-card">
          <h3><a href="/blog/${p.slug}/">${esc(p.title)}</a></h3>
          <p>${esc(p.description)}</p>
          <p class="post-meta"><a href="/blog/${p.slug}/">Read the full guide</a></p>
        </article>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" type="image/svg+xml" href="/assets/logo/logo.svg">
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/logo/favicon-32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/assets/logo/favicon-16.png">
  <link rel="apple-touch-icon" href="/assets/logo/apple-touch-icon.png">
  <title>Blog | Personal Injury Lawyer Hub</title>
  <meta name="description" content="Plain-English guides on finding and working with a personal injury lawyer, understanding claims and deadlines, and protecting your rights after an accident.">
  <link rel="canonical" href="${SITE}/blog/">
  <link rel="stylesheet" href="/css/style.css">
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9332749804326149" crossorigin="anonymous"></script>
</head>
<body>
  <header class="site-header">
    <div class="container">
      <a class="brand" href="/"><img src="/assets/logo/logo.svg" alt="Personal Injury Lawyer Hub" class="brand-logo">Personal Injury <span>Lawyer Hub</span></a>
      <nav class="site-nav">
        <a href="/">Home</a>
        <a href="/blog/" class="active">Blog</a>
        <a href="/about.html">About</a>
        <a href="/find.html">Find</a>
        <a href="/partners.html">Partners</a>
      </nav>
    </div>
  </header>

  <section class="page-title">
    <div class="container">
      <h1>Personal Injury Law Blog</h1>
      <p>Plain-English guides for accident victims and their families.</p>
    </div>
  </section>

  <main class="content">
    <div class="container">
      <p>We built Personal Injury Lawyer Hub because finding a lawyer after an accident is genuinely hard, and most of what you find online is written to sell rather than to explain. These guides are our attempt to answer the questions people actually ask us, in plain language, without pretending every case is the same. None of it is legal advice, and we will always tell you when something depends on your state.</p>
      <div class="post-list">
${items}
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
  <script src="/js/analytics-client.js"></script>
</body>
</html>
`;
}

export function build(posts) {
  for (const p of posts) {
    // `external` posts are hand-authored HTML already on disk; they still
    // appear in the index but are not regenerated from a body template.
    if (p.external) continue;
    const dir = join(ROOT, "blog", p.slug);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "index.html"), renderPost(p));
  }
  writeFileSync(join(ROOT, "blog", "index.html"), renderIndex(posts));
  console.log(`Wrote ${posts.length} blog posts and blog/index.html`);
}
