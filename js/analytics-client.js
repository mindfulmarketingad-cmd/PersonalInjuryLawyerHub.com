// Fire-and-forget analytics tracker for personalinjurylawyerhub.com.
//
// This is a static site with no server of its own, so there is no place to
// hold a Supabase service-role key. Events are posted directly from the
// browser to the Supabase REST API using the public anon/publishable key —
// the same pattern already used by js/inquire.js for lead submission.
// Access is governed entirely by Row Level Security on the
// personalinjurylawyerhub_dashboard table (public insert, public select;
// see supabase/migrations/20260722_analytics_dashboard.sql).
//
// This must never affect the page it runs on: every path here is wrapped
// so a network failure, a blocked request, or a missing table cannot throw
// or block rendering.
//
// Other scripts call window.PILHAnalytics.trackEvent(type, extra) directly
// — see map.js (search, directions_click, website_click), citymap.js
// (same), inquire.js (inquire_click), findindex.js and partners.js (search).

(function () {
  "use strict";

  var SUPABASE_URL = "https://tbqigevoksabizjogvtm.supabase.co";
  var SUPABASE_ANON_KEY = "sb_publishable_aHlx0Tdu2rhOTBUp3lhkQw_Lv6Awz7a";
  var TABLE = "personalinjurylawyerhub_dashboard";

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function getId(storage, key) {
    try {
      var id = storage.getItem(key);
      if (!id) {
        id = uuid();
        storage.setItem(key, id);
      }
      return id;
    } catch (e) {
      return null; // private browsing / storage disabled — degrade silently
    }
  }

  function getSessionId() { return getId(window.sessionStorage, "pilh_session_id"); }
  function getVisitorId() { return getId(window.localStorage, "pilh_visitor_id"); }

  function trackEvent(eventType, extra) {
    try {
      var row = {
        event_type: eventType,
        path: location.pathname,
        referrer: document.referrer || null,
        session_id: getSessionId(),
        visitor_id: getVisitorId()
      };
      if (extra) {
        if (extra.listingSlug) row.listing_slug = extra.listingSlug;
        if (extra.listingName) row.listing_name = extra.listingName;
        if (extra.city) row.city = extra.city;
        if (extra.query) row.query = extra.query;
      }
      fetch(SUPABASE_URL + "/rest/v1/" + TABLE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": "Bearer " + SUPABASE_ANON_KEY,
          "Prefer": "return=minimal"
        },
        body: JSON.stringify([row]),
        keepalive: true
      }).catch(function () { /* fire-and-forget */ });
    } catch (e) { /* tracking must never break the page */ }
  }

  function trackPageview() {
    var body = document.body;
    var slug = body && body.getAttribute("data-listing-slug");
    if (slug) {
      trackEvent("listing_view", {
        listingSlug: slug,
        listingName: body.getAttribute("data-listing-name"),
        city: body.getAttribute("data-listing-city")
      });
    } else {
      trackEvent("pageview");
    }
  }

  window.PILHAnalytics = { trackEvent: trackEvent };

  // Centralized here (not per-page script) so directions/website clicks are
  // caught on every page that has them — homepage map, /find searchmap
  // pages, and partner profile pages — without double-firing from more
  // than one delegated listener on the same click.
  document.addEventListener("click", function (e) {
    var el = e.target.closest(".track-website, .track-directions");
    if (!el) return;
    var type = el.classList.contains("track-website") ? "website_click" : "directions_click";
    trackEvent(type, {
      listingSlug: el.getAttribute("data-slug"),
      listingName: el.getAttribute("data-name"),
      city: el.getAttribute("data-city")
    });
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", trackPageview);
  } else {
    trackPageview();
  }
})();
