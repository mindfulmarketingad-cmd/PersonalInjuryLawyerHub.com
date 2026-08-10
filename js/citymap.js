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

  var markerLayer = L.layerGroup();
  map.addLayer(markerLayer);

  var burgundyIcon = L.icon({
    iconUrl: "/vendor/images/marker-burgundy.png",
    iconRetinaUrl: "/vendor/images/marker-burgundy-2x.png",
    shadowUrl: "/vendor/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

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
    markerLayer.clearLayers();
    markersById = {};
    filtered.forEach(function (l) {
      if (l.lat == null || l.lng == null) return;
      var marker = L.marker([l.lat, l.lng], { icon: burgundyIcon });
      var directionsUrl = "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(l.address || l.name);
      var popup =
        "<strong>" + esc(l.name) + "</strong><br>" +
        esc(l.address) + "<br>" +
        (l.rating ? l.rating.toFixed(1) + " stars (" + l.reviews + " reviews)<br>" : "No rating yet<br>") +
        (l.website ? '<a href="' + esc(l.website) + '" target="_blank" rel="noopener nofollow" class="track-website" data-slug="' + esc(l.slug || "") + '" data-name="' + esc(l.name) + '" data-city="' + esc(l.city || "") + '">Website</a> &middot; ' : "") +
        '<a href="' + directionsUrl + '" target="_blank" rel="noopener" class="track-directions" data-slug="' + esc(l.slug || "") + '" data-name="' + esc(l.name) + '" data-city="' + esc(l.city || "") + '">Directions</a>';
      marker.bindPopup(popup);
      markersById[l.id] = marker;
      markerLayer.addLayer(marker);
    });
  }

  function renderCards() {
    metaEl.textContent = filtered.length + " listing" + (filtered.length === 1 ? "" : "s");

    if (!filtered.length) {
      cardsEl.innerHTML = '<p class="no-results">No listings match your filters.</p>';
      return;
    }

    cardsEl.innerHTML = filtered.map(function (l, i) {
      return (
        '<article class="card" data-id="' + l.id + '">' +
        '<span class="card-number">' + (i + 1) + "</span>" +
        '<div class="card-body">' +
        "<h3>" + (l.slug ? '<a href="/partners/' + l.slug + '/">' + esc(l.name) + '</a>' : esc(l.name)) + "</h3>" +
        '<div class="type">' + esc(l.type) + "</div>" +
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

  var hoveredMarker = null;
  function setHoveredMarker(marker) {
    if (hoveredMarker === marker) return;
    if (hoveredMarker && hoveredMarker._icon) hoveredMarker._icon.classList.remove("marker-hover");
    hoveredMarker = marker;
    if (hoveredMarker && hoveredMarker._icon) hoveredMarker._icon.classList.add("marker-hover");
  }
  cardsEl.addEventListener("mouseover", function (e) {
    var card = e.target.closest(".card");
    setHoveredMarker(card ? markersById[card.getAttribute("data-id")] : null);
  });
  cardsEl.addEventListener("mouseleave", function () {
    setHoveredMarker(null);
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
