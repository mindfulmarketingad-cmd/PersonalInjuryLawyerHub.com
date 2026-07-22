// Single-marker map for /partners/{slug}/ profile pages. Business details
// are static, crawlable HTML already in the page — this only adds the map.

(function () {
  "use strict";
  var el = document.getElementById("map");
  if (!el) return;

  var lat = parseFloat(el.getAttribute("data-lat"));
  var lng = parseFloat(el.getAttribute("data-lng"));
  var name = el.getAttribute("data-name") || "";
  if (isNaN(lat) || isNaN(lng)) return;

  var map = L.map("map", { zoomControl: true }).setView([lat, lng], 15);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
  var burgundyIcon = L.icon({
    iconUrl: "/vendor/images/marker-burgundy.png",
    iconRetinaUrl: "/vendor/images/marker-burgundy-2x.png",
    shadowUrl: "/vendor/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
  L.marker([lat, lng], { icon: burgundyIcon }).addTo(map).bindPopup(name).openPopup();
})();
