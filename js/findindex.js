// Client-side search, filter, and sort for find.html. All data is already
// in the static HTML (state-block divs and city-list items) — no fetch.

(function () {
  "use strict";

  var listEl = document.getElementById("state-list");
  var searchInput = document.getElementById("find-search");
  var sortSel = document.getElementById("find-sort");
  var filterSel = document.getElementById("find-filter");
  var metaEl = document.getElementById("find-meta");
  if (!listEl) return;

  var blocks = Array.prototype.slice.call(listEl.querySelectorAll(".state-block"));

  function apply() {
    var q = searchInput.value.trim().toLowerCase();
    var minCount = parseInt(filterSel.value, 10) || 0;
    var visibleStates = 0;
    var visibleCities = 0;

    blocks.forEach(function (block) {
      var stateName = (block.getAttribute("data-state-name") || "").toLowerCase();
      var count = parseInt(block.getAttribute("data-count"), 10) || 0;
      var items = Array.prototype.slice.call(block.querySelectorAll(".city-list li"));
      var stateMatches = !q || stateName.indexOf(q) !== -1;

      var passesFilter = count >= minCount;
      var anyCityVisible = false;
      items.forEach(function (li) {
        var cityText = (li.getAttribute("data-city") || "").toLowerCase();
        var cityMatches = passesFilter && (stateMatches || cityText.indexOf(q) !== -1);
        li.style.display = cityMatches ? "" : "none";
        if (cityMatches) anyCityVisible = true;
      });

      var show = passesFilter && (stateMatches || anyCityVisible);
      block.style.display = show ? "" : "none";
      if (show) {
        visibleStates++;
        visibleCities += items.filter(function (li) { return li.style.display !== "none"; }).length;
      }
    });

    metaEl.textContent = visibleStates + " state" + (visibleStates === 1 ? "" : "s") +
      ", " + visibleCities + " cit" + (visibleCities === 1 ? "y" : "ies") + " shown";
  }

  function sort() {
    var mode = sortSel.value;
    var sorted = blocks.slice().sort(function (a, b) {
      if (mode === "count") {
        return (parseInt(b.getAttribute("data-count"), 10) || 0) - (parseInt(a.getAttribute("data-count"), 10) || 0);
      }
      return (a.getAttribute("data-state-name") || "").localeCompare(b.getAttribute("data-state-name") || "");
    });
    sorted.forEach(function (block) { listEl.appendChild(block); });
  }

  var trackTimer = null;
  function trackSearch() {
    clearTimeout(trackTimer);
    trackTimer = setTimeout(function () {
      var q = searchInput.value.trim();
      if (q && window.PILHAnalytics) window.PILHAnalytics.trackEvent("search", { query: q });
    }, 700);
  }

  searchInput.addEventListener("input", apply);
  searchInput.addEventListener("input", trackSearch);
  filterSel.addEventListener("change", apply);
  sortSel.addEventListener("change", function () {
    sort();
    apply();
  });

  apply();
})();
