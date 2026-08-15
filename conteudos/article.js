(function () {
  "use strict";

  var body = document.body;
  var GA_MEASUREMENT_ID = String(body.dataset.gaMeasurementId || "").trim();
  var META_PIXEL_ID = String(body.dataset.metaPixelId || "").trim();
  var CONTENT_ID = String(body.dataset.contentId || "").trim();
  var CONTENT_TITLE = String(body.dataset.contentTitle || "").trim();
  var CONTENT_CATEGORY = String(body.dataset.contentCategory || "").trim();
  var CONSENT_KEY = "zn-measurement-consent";
  var LEGACY_CONSENT_KEY = "gamboas-analytics-consent";
  var measurementActive = false;

  function readLocalValue(key, legacyKey) {
    try {
      var value = localStorage.getItem(key) || (legacyKey ? localStorage.getItem(legacyKey) : "");
      if (value && !localStorage.getItem(key)) localStorage.setItem(key, value);
      return value;
    } catch (_) {
      return "";
    }
  }

  function writeLocalValue(key, value) {
    try { localStorage.setItem(key, value); } catch (_) {}
  }

  function measurementConsent() {
    var value = readLocalValue(CONSENT_KEY, LEGACY_CONSENT_KEY);
    return value === "accepted" || value === "rejected" ? value : "unknown";
  }

  function installGoogleAnalytics() {
    if (!GA_MEASUREMENT_ID || window.gtag) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", GA_MEASUREMENT_ID, { anonymize_ip: true });
    var script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA_MEASUREMENT_ID);
    document.head.appendChild(script);
  }

  function installMetaPixel() {
    if (!META_PIXEL_ID || window.fbq) return;
    var fbq = function () {
      if (fbq.callMethod) fbq.callMethod.apply(fbq, arguments);
      else fbq.queue.push(arguments);
    };
    fbq.queue = [];
    fbq.loaded = true;
    fbq.version = "2.0";
    window._fbq = fbq;
    window.fbq = fbq;
    fbq("init", META_PIXEL_ID);
    var script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/pt_BR/fbevents.js";
    document.head.appendChild(script);
  }

  function trackContentView() {
    if (body.dataset.pageType !== "article") return;
    if (window.gtag) {
      window.gtag("event", "view_item", {
        content_type: "article",
        content_id: CONTENT_ID,
        content_name: CONTENT_TITLE,
        item_category: CONTENT_CATEGORY,
        items: [{ item_id: CONTENT_ID, item_name: CONTENT_TITLE, item_category: CONTENT_CATEGORY }]
      });
    }
    if (window.fbq) {
      window.fbq("track", "ViewContent", {
        content_ids: [CONTENT_ID],
        content_name: CONTENT_TITLE,
        content_category: CONTENT_CATEGORY,
        content_type: "article"
      });
    }
  }

  function activateMeasurement() {
    if (measurementActive) return;
    measurementActive = true;
    installGoogleAnalytics();
    installMetaPixel();
    if (window.fbq) window.fbq("track", "PageView");
    trackContentView();
  }

  var banner = document.getElementById("cookie-banner");
  var accept = document.getElementById("cookie-accept");
  var reject = document.getElementById("cookie-reject");
  var consent = measurementConsent();
  if (consent === "accepted") activateMeasurement();
  else if (consent !== "rejected" && banner) banner.hidden = false;

  if (accept) accept.addEventListener("click", function () {
    writeLocalValue(CONSENT_KEY, "accepted");
    if (banner) banner.hidden = true;
    activateMeasurement();
  });
  if (reject) reject.addEventListener("click", function () {
    writeLocalValue(CONSENT_KEY, "rejected");
    if (banner) banner.hidden = true;
  });

  document.querySelectorAll("a[data-content-cta]").forEach(function (link) {
    link.addEventListener("click", function () {
      if (measurementConsent() !== "accepted") return;
      var cta = String(link.dataset.contentCta || "").trim();
      var propertyId = String(link.dataset.propertyId || "").trim();
      if (window.gtag) {
        window.gtag("event", "select_content", {
          content_type: "article_cta",
          content_id: CONTENT_ID,
          content_name: CONTENT_TITLE,
          cta_origin: cta,
          property_id: propertyId,
          link_url: link.href
        });
      }
      if (window.fbq) {
        window.fbq("trackCustom", "ContentCTAClick", {
          content_id: CONTENT_ID,
          cta_origin: cta,
          property_id: propertyId
        });
      }
    });
  });
})();
