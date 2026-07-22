// Shared runtime for /find/{slug}/ searchmap pages. Listings are embedded
// directly in the page (see <script id="listings-data">) — no API calls,
// no fetch of the full nationwide dataset.

(function () {
  "use strict";

  var dataEl = document.getElementById("listings-data");
  var all = dataEl ? JSON.parse(dataEl.textContent).map(function (l, i) { l.id = String(i); return l; }) : [];

  var map = L.map("map", { zoomControl: true });

  var streetLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  var satelliteLayer = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      maxZoom: 19,
      attribution: "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics"
    }
  );

  var cluster = L.markerClusterGroup({ chunkedLoading: true, showCoverageOnHover: false });
  map.addLayer(cluster);

  var withCoords = all.filter(function (l) { return l.lat != null && l.lng != null; });
  if (withCoords.length) {
    var bounds = L.latLngBounds(withCoords.map(function (l) { return [l.lat, l.lng]; }));
    map.fitBounds(bounds.pad(0.15));
    if (withCoords.length === 1) map.setZoom(14);
  } else {
    map.setView([39.5, -96.5], 4);
  }

  var filtered = all.slice();
  var markersById = {};

  var cardsEl = document.getElementById("cards");
  var metaEl = document.getElementById("results-meta");
  var typeSel = document.getElementById("type-filter");
  var ratingSel = document.getElementById("rating-filter");
  var sortSel = document.getElementById("sort-select");
  var satToggle = document.getElementById("satellite-toggle");

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

  function applyFilters() {
    var minRating = parseFloat(ratingSel.value) || 0;
    var type = typeSel.value;

    filtered = all.filter(function (l) {
      if (minRating && (!l.rating || l.rating < minRating)) return false;
      if (type && l.type !== type) return false;
      return true;
    });

    var sort = sortSel.value;
    filtered.sort(function (a, b) {
      if (sort === "reviews") return (b.reviews || 0) - (a.reviews || 0);
      if (sort === "name") return a.name.localeCompare(b.name);
      var r = (b.rating || 0) - (a.rating || 0);
      return r !== 0 ? r : (b.reviews || 0) - (a.reviews || 0);
    });

    renderMarkers();
    renderCards();
  }

  function renderMarkers() {
    cluster.clearLayers();
    markersById = {};
    filtered.forEach(function (l) {
      if (l.lat == null || l.lng == null) return;
      var marker = L.marker([l.lat, l.lng]);
      var popup =
        "<strong>" + esc(l.name) + "</strong><br>" +
        esc(l.address) + "<br>" +
        (l.rating ? l.rating.toFixed(1) + " stars (" + l.reviews + " reviews)" : "No rating yet");
      marker.bindPopup(popup);
      markersById[l.id] = marker;
      cluster.addLayer(marker);
    });
  }

  function renderCards() {
    metaEl.textContent = filtered.length + " listing" + (filtered.length === 1 ? "" : "s");

    if (!filtered.length) {
      cardsEl.innerHTML = '<p class="no-results">No listings match your filters.</p>';
      return;
    }

    cardsEl.innerHTML = filtered.map(function (l) {
      return (
        '<article class="card" data-id="' + l.id + '">' +
        "<h3>" + esc(l.name) + "</h3>" +
        '<div class="type">' + esc(l.type) + "</div>" +
        (l.rating
          ? '<div class="rating"><span class="stars">' + stars(l.rating) + "</span> " +
            l.rating.toFixed(1) + " (" + l.reviews + " reviews)</div>"
          : '<div class="rating">No rating yet</div>') +
        '<div class="addr">' + esc(l.address) + "</div>" +
        (l.quote ? "<blockquote>&ldquo;" + esc(l.quote) + "&rdquo;</blockquote>" : "") +
        "</article>"
      );
    }).join("");
  }

  cardsEl.addEventListener("click", function (e) {
    var card = e.target.closest(".card");
    if (!card) return;
    var marker = markersById[card.getAttribute("data-id")];
    if (marker) {
      map.setView(marker.getLatLng(), 15);
      marker.openPopup();
    }
  });

  var typeCounts = {};
  all.forEach(function (l) { if (l.type) typeCounts[l.type] = (typeCounts[l.type] || 0) + 1; });
  Object.keys(typeCounts).sort(function (a, b) { return typeCounts[b] - typeCounts[a]; })
    .forEach(function (t) {
      var opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t;
      typeSel.appendChild(opt);
    });

  satToggle.addEventListener("click", function () {
    var on = satToggle.classList.toggle("on");
    if (on) {
      map.removeLayer(streetLayer);
      map.addLayer(satelliteLayer);
      satToggle.textContent = "Street View";
    } else {
      map.removeLayer(satelliteLayer);
      map.addLayer(streetLayer);
      satToggle.textContent = "Satellite View";
    }
  });

  [typeSel, ratingSel, sortSel].forEach(function (el) {
    el.addEventListener("change", applyFilters);
  });

  applyFilters();
})();
