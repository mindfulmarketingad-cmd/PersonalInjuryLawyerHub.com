// Shared "Inquire" lead-capture modal. Injected once per page, opened by
// any element with class "inquire-btn" (cards site-wide, partner profile
// pages). Submits leads to Supabase via the REST API.
//
// The publishable key below is intended to be public — it is the browser-side
// key and carries no privileges of its own. Access is controlled entirely by
// Row Level Security on the target table, so the leads table must have an RLS
// policy permitting INSERT for the anon role. If inserts are rejected with a
// 401 or 403, that policy is the thing to check.
//
// FIELD_MAP is the single place to adjust column names. Keys are this site's
// internal field names; values are the actual column names in your table.
// If a column does not exist in your schema, set its value to null and it
// will be omitted from the insert.

(function () {
  "use strict";

  var SUPABASE_URL = "https://tbqigevoksabizjogvtm.supabase.co";
  var SUPABASE_ANON_KEY = "sb_publishable_aHlx0Tdu2rhOTBUp3lhkQw_Lv6Awz7a";
  var SUPABASE_TABLE = "leads";

  var FIELD_MAP = {
    name: "name",
    email: "email",
    phone: "phone",
    zip: "zip",
    incident_type: "incident_type",
    incident_timing: "incident_timing",
    sought_treatment: "sought_treatment",
    spoke_to_attorney: "spoke_to_attorney",
    details: "details",
    business_name: "business_name",
    business_slug: "business_slug",
    business_city: "business_city",
    business_state: "business_state",
    source_site: "source_site",
    source_url: "source_url"
    // created_at intentionally omitted — let the database default set it.
  };

  var FALLBACK_EMAIL = "contact@personalinjurylawyerhub.com";

  var INCIDENT_TYPES = [
    "Car Accident", "Truck Accident", "Motorcycle Accident", "Slip and Fall",
    "Workplace Injury", "Medical Malpractice", "Dog Bite", "Wrongful Death", "Other"
  ];

  var modal, form, overlay, subEl, successEl, errorEl, submitBtn, currentContext;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function buildModal() {
    var wrap = document.createElement("div");
    wrap.innerHTML =
      '<div class="modal-overlay" id="inquire-overlay">' +
      '<div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="inquire-title">' +
      '<button class="modal-close" type="button" aria-label="Close">&times;</button>' +
      '<h2 id="inquire-title">Get Matched With a Personal Injury Lawyer</h2>' +
      '<p class="modal-sub" id="inquire-sub">Tell us about your case and we will match you with the right lawyer.</p>' +
      '<form id="inquire-form">' +
      '<label for="inq-incident">What type of incident was it?</label>' +
      '<select id="inq-incident" name="incident_type" required>' +
      INCIDENT_TYPES.map(function (t) { return '<option value="' + esc(t) + '">' + esc(t) + "</option>"; }).join("") +
      "</select>" +

      '<label for="inq-when">When did it happen?</label>' +
      '<select id="inq-when" name="incident_timing" required>' +
      '<option value="Within the last week">Within the last week</option>' +
      '<option value="1-4 weeks ago">1-4 weeks ago</option>' +
      '<option value="1-6 months ago">1-6 months ago</option>' +
      '<option value="6-12 months ago">6-12 months ago</option>' +
      '<option value="Over a year ago">Over a year ago</option>' +
      "</select>" +

      '<label for="inq-treatment">Have you received medical treatment?</label>' +
      '<select id="inq-treatment" name="sought_treatment" required>' +
      '<option value="Yes">Yes</option><option value="No">No</option>' +
      "</select>" +

      '<label for="inq-attorney">Have you already spoken with a lawyer about this?</label>' +
      '<select id="inq-attorney" name="spoke_to_attorney" required>' +
      '<option value="No">No</option><option value="Yes">Yes</option>' +
      "</select>" +

      '<label for="inq-zip">Your zip code</label>' +
      '<input type="text" id="inq-zip" name="zip" inputmode="numeric" maxlength="5" required>' +

      '<label for="inq-name">Full name</label>' +
      '<input type="text" id="inq-name" name="name" required>' +

      '<label for="inq-phone">Phone</label>' +
      '<input type="tel" id="inq-phone" name="phone" required>' +

      '<label for="inq-email">Email</label>' +
      '<input type="email" id="inq-email" name="email" required>' +

      '<label for="inq-details">Briefly describe what happened (optional)</label>' +
      '<textarea id="inq-details" name="details" rows="3"></textarea>' +

      '<p class="form-note">By submitting, you agree to be contacted about your inquiry. This is not legal advice and does not create an attorney-client relationship.</p>' +
      '<div class="modal-error" id="inquire-error" role="alert" hidden></div>' +
      '<button type="submit" class="btn" id="inquire-submit">Submit Inquiry</button>' +
      "</form>" +
      '<div class="modal-success" id="inquire-success" hidden>' +
      "<p>Thank you. Your information has been submitted and a personal injury lawyer match will be in touch soon.</p>" +
      '<button type="button" class="btn btn-outline" id="inquire-close-success">Close</button>' +
      "</div>" +
      "</div></div>";
    document.body.appendChild(wrap.firstChild);

    overlay = document.getElementById("inquire-overlay");
    modal = overlay.querySelector(".modal-box");
    form = document.getElementById("inquire-form");
    subEl = document.getElementById("inquire-sub");
    successEl = document.getElementById("inquire-success");
    errorEl = document.getElementById("inquire-error");
    submitBtn = document.getElementById("inquire-submit");

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeModal();
    });
    overlay.querySelector(".modal-close").addEventListener("click", closeModal);
    document.getElementById("inquire-close-success").addEventListener("click", closeModal);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlay.classList.contains("open")) closeModal();
    });
    form.addEventListener("submit", handleSubmit);
  }

  function openModal(context) {
    currentContext = context || {};
    if (currentContext.name) {
      subEl.textContent = "Inquiring about " + currentContext.name +
        (currentContext.city ? " in " + currentContext.city + (currentContext.state ? ", " + currentContext.state : "") : "") + ".";
    } else {
      subEl.textContent = "Tell us about your case and we will match you with the right personal injury lawyer.";
    }
    form.hidden = false;
    successEl.hidden = true;
    errorEl.hidden = true;
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit Inquiry";
    form.reset();
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    overlay.classList.remove("open");
    document.body.style.overflow = "";
  }

  // Build the insert payload using FIELD_MAP so column names live in one place.
  function buildPayload(fd) {
    var values = {
      name: fd.get("name"),
      email: fd.get("email"),
      phone: fd.get("phone"),
      zip: fd.get("zip"),
      incident_type: fd.get("incident_type"),
      incident_timing: fd.get("incident_timing"),
      sought_treatment: fd.get("sought_treatment"),
      spoke_to_attorney: fd.get("spoke_to_attorney"),
      details: fd.get("details") || null,
      business_name: currentContext.name || null,
      business_slug: currentContext.slug || null,
      business_city: currentContext.city || null,
      business_state: currentContext.state || null,
      source_site: "personalinjurylawyerhub.com",
      source_url: window.location.href
    };
    var row = {};
    Object.keys(values).forEach(function (key) {
      var column = FIELD_MAP[key];
      if (column) row[column] = values[key];
    });
    return row;
  }

  function showError(message, lead) {
    // Never tell someone their inquiry went through when it did not — a lost
    // lead is worse than a visible error, for them and for the site owner.
    var mailto = "mailto:" + FALLBACK_EMAIL +
      "?subject=" + encodeURIComponent("Personal injury inquiry") +
      "&body=" + encodeURIComponent(
        "Name: " + (lead.name || "") + "\nPhone: " + (lead.phone || "") +
        "\nEmail: " + (lead.email || "") + "\nZip: " + (lead.zip || "") +
        "\n\n" + (lead.details || "")
      );
    errorEl.innerHTML =
      "<p><strong>We could not submit your inquiry.</strong> " + esc(message) + "</p>" +
      '<p>Please try again, or email us directly at <a href="' + mailto + '">' +
      FALLBACK_EMAIL + "</a> and we will follow up.</p>";
    errorEl.hidden = false;
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit Inquiry";
  }

  function handleSubmit(e) {
    e.preventDefault();
    errorEl.hidden = true;

    var fd = new FormData(form);
    var lead = {
      name: fd.get("name"), email: fd.get("email"),
      phone: fd.get("phone"), zip: fd.get("zip"), details: fd.get("details")
    };
    var row = buildPayload(fd);

    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    fetch(SUPABASE_URL + "/rest/v1/" + SUPABASE_TABLE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": "Bearer " + SUPABASE_ANON_KEY,
        "Prefer": "return=minimal"
      },
      body: JSON.stringify([row])
    })
      .then(function (res) {
        if (res.ok) {
          form.hidden = true;
          errorEl.hidden = true;
          successEl.hidden = false;
          return;
        }
        return res.text().then(function (text) {
          console.error("Supabase insert failed:", res.status, text);
          var msg = res.status === 401 || res.status === 403
            ? "The submission was rejected by the server."
            : "The server returned an error (" + res.status + ").";
          showError(msg, lead);
        });
      })
      .catch(function (err) {
        console.error("Lead submission failed:", err);
        showError("We could not reach the server. Please check your connection.", lead);
      });
  }

  function init() {
    buildModal();
    document.addEventListener("click", function (e) {
      var btn = e.target.closest(".inquire-btn");
      if (!btn) return;
      e.preventDefault();
      var context = {
        name: btn.getAttribute("data-name"),
        slug: btn.getAttribute("data-slug"),
        city: btn.getAttribute("data-city"),
        state: btn.getAttribute("data-state")
      };
      if (window.PILHAnalytics) {
        window.PILHAnalytics.trackEvent("inquire_click", {
          listingSlug: context.slug, listingName: context.name, city: context.city
        });
      }
      openModal(context);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
