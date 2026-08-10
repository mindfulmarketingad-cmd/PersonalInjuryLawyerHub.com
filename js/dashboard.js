// Public analytics dashboard for personalinjurylawyerhub.com.
//
// Reads directly from Supabase using the public anon/publishable key — this
// is a static site with no server, and the personalinjurylawyerhub_dashboard
// table's RLS policy allows public SELECT specifically so this page can
// work with no backend of its own. See
// supabase/migrations/20260722_analytics_dashboard.sql for the schema and
// the reasoning behind what is and isn't public.
//
// Aggregation (daily trend, action breakdown, per-business totals) happens
// client-side over the rows for the selected range, rather than relying on
// PostgREST aggregate query support. That's simple and predictable at the
// table's current size; if this table grows into the millions of rows, the
// fetch below should be replaced with a Postgres view or RPC that
// aggregates server-side instead of shipping raw rows to the browser.

(function () {
  "use strict";

  var SUPABASE_URL = "https://tbqigevoksabizjogvtm.supabase.co";
  var SUPABASE_ANON_KEY = "sb_publishable_aHlx0Tdu2rhOTBUp3lhkQw_Lv6Awz7a";
  var TABLE = "personalinjurylawyerhub_dashboard";
  var ROW_LIMIT = 20000;

  var client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  var statusEl = document.getElementById("dash-status");
  var rangeBtns = Array.prototype.slice.call(document.querySelectorAll(".range-btn"));
  var currentDays = 30;
  var liveCount = 0;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fmt(n) { return n.toLocaleString(); }

  function dayKey(iso) { return iso.slice(0, 10); }

  var LEAD_ACTION_TYPES = ["directions_click", "website_click", "inquire_click"];
  var IMPRESSION_TYPES = ["pageview", "listing_view"];

  // ---------------------------------------------------------------
  // Data load + aggregation
  // ---------------------------------------------------------------
  function loadRange(days) {
    currentDays = days;
    statusEl.textContent = "Loading…";
    var cutoff = new Date(Date.now() - days * 86400000).toISOString();

    var eventsPromise = client
      .from(TABLE)
      .select("event_type,created_at,session_id,visitor_id,listing_slug,listing_name,city")
      .gte("created_at", cutoff)
      .order("created_at", { ascending: true })
      .limit(ROW_LIMIT);

    var leadsPromise = client.rpc("personalinjurylawyerhub_leads_count", { days_back: days });

    Promise.all([eventsPromise, leadsPromise])
      .then(function (results) {
        var eventsRes = results[0], leadsRes = results[1];
        if (eventsRes.error) throw eventsRes.error;
        renderAll(eventsRes.data || [], days);
        document.getElementById("stat-leads").textContent =
          leadsRes.error ? "—" : fmt(leadsRes.data || 0);
        if (leadsRes.error) console.warn("Leads count unavailable:", leadsRes.error.message);
        statusEl.textContent = "Updated " + new Date().toLocaleTimeString();
      })
      .catch(function (err) {
        console.error("Dashboard load failed:", err);
        statusEl.textContent = "Could not load analytics data. " + (err && err.message ? err.message : "");
      });
  }

  function renderAll(rows, days) {
    renderStats(rows);
    renderTrendChart(rows, days);
    renderActionChart(rows);
    renderBusinessTable(rows);
  }

  function renderStats(rows) {
    var sessions = {}, visitors = {}, impressions = 0, searches = 0, leadActions = 0;
    rows.forEach(function (r) {
      if (r.session_id) sessions[r.session_id] = true;
      if (r.visitor_id) visitors[r.visitor_id] = true;
      if (IMPRESSION_TYPES.indexOf(r.event_type) !== -1) impressions++;
      if (r.event_type === "search") searches++;
      if (LEAD_ACTION_TYPES.indexOf(r.event_type) !== -1) leadActions++;
    });
    document.getElementById("stat-sessions").textContent = fmt(Object.keys(sessions).length);
    document.getElementById("stat-visitors").textContent = fmt(Object.keys(visitors).length);
    document.getElementById("stat-impressions").textContent = fmt(impressions);
    document.getElementById("stat-searches").textContent = fmt(searches);
    document.getElementById("stat-lead-actions").textContent = fmt(leadActions);
  }

  // ---------------------------------------------------------------
  // Daily trend — hand-rolled inline SVG line chart (no chart library;
  // this is a static site with no bundler, so plain SVG keeps the values
  // in the markup and readable by assistive tech via the table fallback).
  // ---------------------------------------------------------------
  function renderTrendChart(rows, days) {
    var el = document.getElementById("trend-chart");
    var counts = {};
    var today = new Date();
    for (var i = days - 1; i >= 0; i--) {
      var d = new Date(today.getTime() - i * 86400000);
      counts[dayKey(d.toISOString())] = 0;
    }
    rows.forEach(function (r) {
      var k = dayKey(r.created_at);
      if (k in counts) counts[k]++;
    });

    var keys = Object.keys(counts).sort();
    var values = keys.map(function (k) { return counts[k]; });
    var max = Math.max.apply(null, values.concat([1]));

    var W = 720, H = 220, PAD = 32;
    var stepX = keys.length > 1 ? (W - PAD * 2) / (keys.length - 1) : 0;
    var points = values.map(function (v, i) {
      var x = PAD + i * stepX;
      var y = H - PAD - (v / max) * (H - PAD * 2);
      return x.toFixed(1) + "," + y.toFixed(1);
    });
    var areaPoints = points.concat([(PAD + (keys.length - 1) * stepX).toFixed(1) + "," + (H - PAD), PAD + "," + (H - PAD)]);

    var labelEvery = Math.max(1, Math.ceil(keys.length / 7));
    var labels = keys.map(function (k, i) {
      if (i % labelEvery !== 0 && i !== keys.length - 1) return "";
      var x = PAD + i * stepX;
      var d = k.slice(5).replace("-", "/");
      return '<text x="' + x.toFixed(1) + '" y="' + (H - 8) + '" font-size="10" text-anchor="middle" fill="#6b6265">' + d + "</text>";
    }).join("");

    var svg =
      '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Daily event count over the selected range" class="trend-svg">' +
      '<line x1="' + PAD + '" y1="' + (H - PAD) + '" x2="' + (W - PAD) + '" y2="' + (H - PAD) + '" stroke="#e4dcde"/>' +
      '<polygon points="' + areaPoints.join(" ") + '" fill="#6e1423" fill-opacity="0.12" stroke="none"/>' +
      '<polyline points="' + points.join(" ") + '" fill="none" stroke="#6e1423" stroke-width="2"/>' +
      labels +
      "</svg>";

    el.innerHTML = svg +
      '<p class="bar-note">Peak day: ' + (max ? fmt(max) + " events" : "no activity yet") + " in the selected range.</p>";
  }

  // ---------------------------------------------------------------
  // Action breakdown — reuses the .bar-chart component already used on
  // blog posts for consistency.
  // ---------------------------------------------------------------
  var EVENT_LABELS = {
    pageview: "Page Views",
    listing_view: "Listing Views",
    search: "Searches",
    directions_click: "Directions Clicks",
    website_click: "Website Clicks",
    inquire_click: "Inquire Clicks",
    call_click: "Call Clicks",
    review_click: "Review Clicks"
  };
  var ORDERED_TYPES = ["pageview", "listing_view", "search", "directions_click", "website_click", "inquire_click", "call_click", "review_click"];

  function renderActionChart(rows) {
    var el = document.getElementById("action-chart");
    var counts = {};
    rows.forEach(function (r) { counts[r.event_type] = (counts[r.event_type] || 0) + 1; });
    var present = ORDERED_TYPES.filter(function (t) { return counts[t] > 0; });
    if (!present.length) {
      el.innerHTML = '<p class="bar-caption">No events recorded yet in this range.</p>';
      return;
    }
    var max = Math.max.apply(null, present.map(function (t) { return counts[t]; }));
    el.innerHTML = '<p class="bar-caption">Total events by type in the selected range.</p>' +
      present.map(function (t, i) {
        var pct = Math.round((counts[t] / max) * 100);
        return '<div class="bar-row">' +
          '<div class="bar-label"><span>' + esc(EVENT_LABELS[t] || t) + '</span><span class="bar-value">' + fmt(counts[t]) + "</span></div>" +
          '<div class="bar-track"><span class="bar-fill' + (i % 2 ? " alt" : "") + '" style="width:' + pct + '%"></span></div>' +
          "</div>";
      }).join("");
  }

  // ---------------------------------------------------------------
  // Per-business breakdown
  // ---------------------------------------------------------------
  function renderBusinessTable(rows) {
    var tbody = document.getElementById("business-rows");
    var byBiz = {};
    rows.forEach(function (r) {
      if (!r.listing_slug) return;
      if (!byBiz[r.listing_slug]) {
        byBiz[r.listing_slug] = {
          name: r.listing_name || r.listing_slug, city: r.city || "",
          views: 0, directions: 0, website: 0, inquire: 0, total: 0
        };
      }
      var b = byBiz[r.listing_slug];
      if (r.event_type === "listing_view") b.views++;
      else if (r.event_type === "directions_click") b.directions++;
      else if (r.event_type === "website_click") b.website++;
      else if (r.event_type === "inquire_click") b.inquire++;
      b.total++;
    });

    var list = Object.keys(byBiz).map(function (slug) {
      var b = byBiz[slug]; b.slug = slug; return b;
    }).sort(function (a, b) { return b.total - a.total; });

    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="no-results">No tracked engagement with a specific listing yet in this range.</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(function (b) {
      return "<tr>" +
        '<th scope="row"><a href="/partners/' + esc(b.slug) + '/">' + esc(b.name) + "</a></th>" +
        "<td>" + esc(b.city) + "</td>" +
        "<td>" + fmt(b.views) + "</td>" +
        "<td>" + fmt(b.directions) + "</td>" +
        "<td>" + fmt(b.website) + "</td>" +
        "<td>" + fmt(b.inquire) + "</td>" +
        "<td><strong>" + fmt(b.total) + "</strong></td>" +
        "</tr>";
    }).join("");
  }

  // ---------------------------------------------------------------
  // Live activity via Supabase Realtime
  // ---------------------------------------------------------------
  function timeAgo() { return "just now"; }

  function initRealtime() {
    var feedEl = document.getElementById("live-feed");
    var countEl = document.getElementById("live-count");
    var emptyRow = feedEl.querySelector(".live-empty");

    client
      .channel("pilh-dashboard-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: TABLE }, function (payload) {
        var r = payload.new;
        liveCount++;
        countEl.textContent = fmt(liveCount);
        if (emptyRow) { emptyRow.remove(); emptyRow = null; }

        var label = EVENT_LABELS[r.event_type] || r.event_type;
        var detail = r.listing_name ? " — " + esc(r.listing_name) : (r.query ? " — “" + esc(r.query) + "”" : "");
        var li = document.createElement("li");
        li.innerHTML = '<span class="live-dot"></span><span class="live-label">' + esc(label) + detail +
          '</span><span class="live-time">' + timeAgo() + "</span>";
        feedEl.insertBefore(li, feedEl.firstChild);
        while (feedEl.children.length > 25) feedEl.removeChild(feedEl.lastChild);
      })
      .subscribe(function (status) {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("Realtime subscription issue:", status);
        }
      });
  }

  // ---------------------------------------------------------------
  // Wire up range selector
  // ---------------------------------------------------------------
  rangeBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      rangeBtns.forEach(function (b) { b.classList.remove("on"); });
      btn.classList.add("on");
      loadRange(parseInt(btn.getAttribute("data-days"), 10));
    });
  });

  loadRange(currentDays);
  initRealtime();
})();
