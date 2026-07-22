// Full listing directory table for the Partners page.
// Reuses the same pre-fetched /data/lawyers.json used on the homepage map.

(function () {
  "use strict";

  var STATE_NAMES = {
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

  var PAGE_SIZE = 50;
  var all = [];
  var filtered = [];
  var shownCount = PAGE_SIZE;

  var rowsEl = document.getElementById("pl-rows");
  var metaEl = document.getElementById("pl-meta");
  var searchInput = document.getElementById("pl-search");
  var stateSel = document.getElementById("pl-state");
  var typeSel = document.getElementById("pl-type");
  var ratingSel = document.getElementById("pl-rating");
  var sortSel = document.getElementById("pl-sort");
  var loadMoreBtn = document.getElementById("pl-load-more");

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function stars(rating) {
    if (!rating) return "";
    var full = Math.round(rating);
    var out = "";
    for (var i = 0; i < 5; i++) out += i < full ? "★" : "☆";
    return out;
  }

  var debounceTimer = null;
  function debounce(fn, delay) {
    return function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(fn, delay);
    };
  }

  function applyFilters() {
    var q = searchInput.value.trim().toLowerCase();
    var st = stateSel.value;
    var type = typeSel.value;
    var minRating = parseFloat(ratingSel.value) || 0;

    filtered = all.filter(function (l) {
      if (st && l.state !== st) return false;
      if (type && l.type !== type) return false;
      if (minRating && (!l.rating || l.rating < minRating)) return false;
      if (q) {
        var haystack = (l.name + " " + l.city + " " + l.state).toLowerCase();
        if (haystack.indexOf(q) === -1) return false;
      }
      return true;
    });

    var sort = sortSel.value;
    filtered.sort(function (a, b) {
      if (sort === "reviews") return (b.reviews || 0) - (a.reviews || 0);
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "state") return (a.state || "").localeCompare(b.state || "") || a.name.localeCompare(b.name);
      var r = (b.rating || 0) - (a.rating || 0);
      return r !== 0 ? r : (b.reviews || 0) - (a.reviews || 0);
    });

    shownCount = PAGE_SIZE;
    render();
  }

  function render() {
    var visible = filtered.slice(0, shownCount);

    metaEl.textContent = filtered.length + " listing" + (filtered.length === 1 ? "" : "s") + " found" +
      (filtered.length ? " — showing " + visible.length : "");

    if (!visible.length) {
      rowsEl.innerHTML = '<p class="no-results">No listings match your search. Try different filters.</p>';
      loadMoreBtn.style.display = "none";
      return;
    }

    rowsEl.innerHTML = visible.map(function (l, i) {
      return (
        '<article class="card">' +
        '<span class="card-number">' + (i + 1) + "</span>" +
        '<div class="card-body">' +
        "<h3>" + (l.slug ? '<a href="/partners/' + l.slug + '/">' + esc(l.name) + '</a>' : esc(l.name)) + "</h3>" +
        '<div class="type">' + esc(l.type) + " &middot; " + esc(l.city ? l.city + ", " : "") + esc(l.state) + "</div>" +
        (l.rating
          ? '<div class="rating"><span class="stars">' + stars(l.rating) + "</span> " +
            l.rating.toFixed(1) + " (" + l.reviews + " reviews)</div>"
          : '<div class="rating">No rating yet</div>') +
        '<div class="addr">' + esc(l.address) + "</div>" +
        (l.quote ? "<blockquote>&ldquo;" + esc(l.quote) + "&rdquo;</blockquote>" : "") +
        '<button class="btn btn-outline inquire-btn" type="button" data-name="' + esc(l.name) + '" data-slug="' + esc(l.slug || "") + '" data-city="' + esc(l.city || "") + '" data-state="' + esc(l.state || "") + '">Inquire</button>' +
        "</div>" +
        "</article>"
      );
    }).join("");

    loadMoreBtn.style.display = filtered.length > shownCount ? "" : "none";
  }

  loadMoreBtn.addEventListener("click", function () {
    shownCount += PAGE_SIZE;
    render();
  });

  [stateSel, typeSel, ratingSel, sortSel].forEach(function (el) {
    el.addEventListener("change", applyFilters);
  });
  searchInput.addEventListener("input", debounce(applyFilters, 200));

  fetch("/data/lawyers.json")
    .then(function (r) { return r.json(); })
    .then(function (data) {
      all = data.listings;

      var states = {};
      var types = {};
      all.forEach(function (l) {
        if (l.state) states[l.state] = true;
        if (l.type) types[l.type] = (types[l.type] || 0) + 1;
      });

      Object.keys(states).sort().forEach(function (s) {
        var opt = document.createElement("option");
        opt.value = s;
        opt.textContent = STATE_NAMES[s] || s;
        stateSel.appendChild(opt);
      });

      Object.keys(types).sort(function (a, b) { return types[b] - types[a]; })
        .forEach(function (t) {
          var opt = document.createElement("option");
          opt.value = t;
          opt.textContent = t;
          typeSel.appendChild(opt);
        });

      applyFilters();
    })
    .catch(function () {
      metaEl.textContent = "Unable to load listings. Please refresh the page.";
    });
})();
