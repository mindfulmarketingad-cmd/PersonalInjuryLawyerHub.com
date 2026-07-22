// Homepage directory map for PersonalInjuryLawyerHub.com
// Loads pre-fetched static data from /data/lawyers.json (generated once by
// scripts/fetch-places.mjs). No live API calls are made from the browser.

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

  var map = L.map("map", { zoomControl: true }).setView([39.5, -96.5], 4);

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

  var all = [];
  var filtered = [];
  var markersById = {};
  var CARD_LIMIT = 60;
  var NEAR_ME_RADIUS_MILES = 100;
  var NEAR_ME_MIN_RESULTS = 15;

  var userCoords = null;
  var nearMeMode = false;
  var nearMeIds = null;

  function milesBetween(lat1, lng1, lat2, lng2) {
    var toRad = function (d) { return (d * Math.PI) / 180; };
    var R = 3958.8;
    var dLat = toRad(lat2 - lat1);
    var dLng = toRad(lng2 - lng1);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function computeNearMeSet() {
    if (!userCoords || !all.length) return;
    var withDist = all
      .filter(function (l) { return l.lat != null && l.lng != null; })
      .map(function (l) {
        l._distance = milesBetween(userCoords.lat, userCoords.lng, l.lat, l.lng);
        return l;
      })
      .sort(function (a, b) { return a._distance - b._distance; });

    var within = withDist.filter(function (l) { return l._distance <= NEAR_ME_RADIUS_MILES; });
    var nearby = within.length >= NEAR_ME_MIN_RESULTS ? within : withDist.slice(0, NEAR_ME_MIN_RESULTS);
    nearMeIds = {};
    nearby.forEach(function (l) { nearMeIds[l.id] = true; });
    nearMeMode = true;
    applyFilters();
    map.setView([userCoords.lat, userCoords.lng], 10);
  }

  function requestUserLocation() {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        userCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        computeNearMeSet();
      },
      function () { /* denied or unavailable — keep nationwide default */ },
      { timeout: 8000, maximumAge: 600000 }
    );
  }

  var cardsEl = document.getElementById("cards");
  var metaEl = document.getElementById("results-meta");
  var stateSel = document.getElementById("state-filter");
  var ratingSel = document.getElementById("rating-filter");
  var typeSel = document.getElementById("type-filter");
  var sortSel = document.getElementById("sort-select");
  var zipInput = document.getElementById("zip-input");
  var zipBtn = document.getElementById("zip-btn");
  var listToggle = document.getElementById("list-toggle");
  var satToggle = document.getElementById("satellite-toggle");
  var panel = document.querySelector(".listings-panel");

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
    var st = stateSel.value;
    var minRating = parseFloat(ratingSel.value) || 0;
    var type = typeSel.value;
    var pool = (nearMeMode && !st) ? all.filter(function (l) { return nearMeIds[l.id]; }) : all;

    filtered = pool.filter(function (l) {
      if (st && l.state !== st) return false;
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
        (l.website ? '<a href="' + esc(l.website) + '" target="_blank" rel="noopener nofollow">Website</a> &middot; ' : "") +
        '<a href="' + directionsUrl + '" target="_blank" rel="noopener">Directions</a>';
      marker.bindPopup(popup);
      markersById[l.id] = marker;
      markerLayer.addLayer(marker);
    });
  }

  function renderCards() {
    var shown = filtered.slice(0, CARD_LIMIT);
    var scopeLabel = (nearMeMode && !stateSel.value)
      ? " near you"
      : (stateSel.value ? " in " + (STATE_NAMES[stateSel.value] || stateSel.value) : " nationwide");
    metaEl.textContent = filtered.length + " listings" + scopeLabel +
      (filtered.length > CARD_LIMIT ? " (showing top " + CARD_LIMIT + ")" : "");

    if (!shown.length) {
      cardsEl.innerHTML = '<p class="no-results">No listings match your filters. Try broadening your search.</p>';
      return;
    }

    cardsEl.innerHTML = shown.map(function (l, i) {
      return (
        '<article class="card" data-id="' + l.id + '">' +
        '<span class="card-number">' + (i + 1) + "</span>" +
        '<div class="card-body">' +
        '<h3>' + (l.slug ? '<a href="/partners/' + l.slug + '/">' + esc(l.name) + '</a>' : esc(l.name)) + "</h3>" +
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
  }

  cardsEl.addEventListener("click", function (e) {
    var card = e.target.closest(".card");
    if (!card) return;
    var marker = markersById[card.getAttribute("data-id")];
    if (marker) {
      map.setView(marker.getLatLng(), 13);
      marker.openPopup();
    }
  });

  // Zip code search via the free Zippopotam.us API (no key required).
  function searchZip() {
    var zip = zipInput.value.trim();
    if (!/^\d{5}$/.test(zip)) {
      metaEl.textContent = "Enter a valid 5-digit zip code.";
      return;
    }
    fetch("https://api.zippopotam.us/us/" + zip)
      .then(function (r) {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then(function (data) {
        var place = data.places && data.places[0];
        if (!place) throw new Error("not found");
        var lat = parseFloat(place.latitude);
        var lng = parseFloat(place.longitude);
        var abbr = place["state abbreviation"];
        if (abbr && STATE_NAMES[abbr]) {
          nearMeMode = false;
          stateSel.value = abbr;
          applyFilters();
        }
        map.setView([lat, lng], 11);
      })
      .catch(function () {
        metaEl.textContent = "Zip code not found. Please try another.";
      });
  }
  zipBtn.addEventListener("click", searchZip);
  zipInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") searchZip();
  });

  listToggle.addEventListener("click", function () {
    var hidden = panel.classList.toggle("hidden-list");
    panel.style.display = hidden ? "none" : "";
    listToggle.textContent = hidden ? "Show List" : "Hide List";
    listToggle.classList.toggle("on", !hidden);
    setTimeout(function () { map.invalidateSize(); }, 100);
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

  // The list toggle lives inside the panel it hides, so mirror it on the map
  // as a Leaflet control so the list can be re-opened once hidden.
  var ShowListControl = L.Control.extend({
    options: { position: "topright" },
    onAdd: function () {
      var btn = L.DomUtil.create("button", "toggle-btn");
      btn.textContent = "Toggle List";
      btn.style.padding = "6px 10px";
      btn.style.cursor = "pointer";
      L.DomEvent.on(btn, "click", function (e) {
        L.DomEvent.stop(e);
        listToggle.click();
      });
      return btn;
    }
  });
  map.addControl(new ShowListControl());

  fetch("/data/lawyers.json")
    .then(function (r) { return r.json(); })
    .then(function (data) {
      all = data.listings.map(function (l, i) {
        l.id = String(i);
        return l;
      });

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

      // Deep link support: /?state=TX
      var params = new URLSearchParams(window.location.search);
      var st = (params.get("state") || "").toUpperCase();
      if (st && states[st]) {
        stateSel.value = st;
        applyFilters();
      } else {
        applyFilters();
        requestUserLocation();
      }
    })
    .catch(function () {
      metaEl.textContent = "Unable to load listings. Please refresh the page.";
    });

  [stateSel, ratingSel, typeSel, sortSel].forEach(function (el) {
    el.addEventListener("change", function () {
      nearMeMode = false;
      applyFilters();
    });
  });
})();
