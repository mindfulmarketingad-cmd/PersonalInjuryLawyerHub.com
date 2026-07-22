// Shared "Inquire" lead-capture modal. Injected once per page, opened by
// any element with class "inquire-btn" (cards site-wide, partner profile
// pages). Submits to Supabase — see SUPABASE_URL / SUPABASE_ANON_KEY below.
//
// NOTE: SUPABASE_ANON_KEY is a placeholder. Leads will not be persisted
// until the real anon/public API key (and the target table name/columns)
// are filled in here.

(function () {
  "use strict";

  var SUPABASE_URL = "https://tbqigevoksabizjogvtm.supabase.co";
  var SUPABASE_ANON_KEY = ""; // TODO: set anon/public API key
  var SUPABASE_TABLE = "leads"; // TODO: confirm table name/columns

  var INCIDENT_TYPES = [
    "Car Accident", "Truck Accident", "Motorcycle Accident", "Slip and Fall",
    "Workplace Injury", "Medical Malpractice", "Dog Bite", "Wrongful Death", "Other"
  ];

  var modal, form, overlay, subEl, successEl, currentContext;

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
      '<button type="submit" class="btn">Submit Inquiry</button>' +
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
    form.reset();
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    overlay.classList.remove("open");
    document.body.style.overflow = "";
  }

  function handleSubmit(e) {
    e.preventDefault();
    var fd = new FormData(form);
    var lead = {
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
      source_url: window.location.href,
      created_at: new Date().toISOString()
    };

    if (SUPABASE_ANON_KEY) {
      fetch(SUPABASE_URL + "/rest/v1/" + SUPABASE_TABLE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": "Bearer " + SUPABASE_ANON_KEY,
          "Prefer": "return=minimal"
        },
        body: JSON.stringify([lead])
      }).catch(function (err) {
        console.error("Lead submission failed:", err);
      });
    } else {
      console.warn("Supabase anon key not configured yet — lead was not persisted:", lead);
    }

    form.hidden = true;
    successEl.hidden = false;
  }

  function init() {
    buildModal();
    document.addEventListener("click", function (e) {
      var btn = e.target.closest(".inquire-btn");
      if (!btn) return;
      e.preventDefault();
      openModal({
        name: btn.getAttribute("data-name"),
        slug: btn.getAttribute("data-slug"),
        city: btn.getAttribute("data-city"),
        state: btn.getAttribute("data-state")
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
