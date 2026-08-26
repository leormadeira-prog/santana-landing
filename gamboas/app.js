(function () {
  "use strict";

  var META_PIXEL_ID = "28317074327887665";
  var GA_MEASUREMENT_ID = "G-NFEM9HPFLR";
  var LEAD_API_URL = "https://script.google.com/macros/s/AKfycbyWacS4ejnYS5dBpKwOdtSDiivDBIRehFG59-0Wx-33GToMnz3Ha7zLhrg96Soi4hRi/exec";
  var LEAD_API_VERSION = "growth-v2";
  var MEASUREMENT_CONSENT_VERSION = "measurement-2026-08-19";
  var ATTENDANCE_CONSENT_VERSION = "privacy-2026-08-19";
  var PROPERTY = Object.freeze({
    id: safeAttributionToken(document.body.dataset.propertyId),
    name: String(document.body.dataset.propertyName || "").trim().slice(0, 120),
    priceFrom: Number(document.body.dataset.propertyPrice) || 0,
    currency: String(document.body.dataset.propertyCurrency || "BRL").trim().slice(0, 3)
  });
  var CONSENT_KEY = "zn-measurement-consent";
  var LEGACY_CONSENT_KEY = "gamboas-analytics-consent";
  var UTM_KEY = "zn-campaign-attribution";
  var LEGACY_UTM_KEY = "gamboas-campaign-attribution";
  var ATTRIBUTION_KEY = "zn-growth-attribution";
  var ATTRIBUTION_VERSION = "growth-v2";
  var PENDING_EVENT_KEY = "zn-pending-lead-event:" + PROPERTY.id;
  var UTM_FIELDS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"];
  var SAFE_QUERY_FIELDS = UTM_FIELDS.concat(["content_id"]);
  var gaEventNames = {
    PageView: "page_view",
    ViewContent: "view_item",
    FormStart: "form_start",
    Lead: "generate_lead",
    Contact: "contact",
    Schedule: "schedule_visit",
    ClickWhatsApp: "click_whatsapp",
    ViewPlants: "view_plants",
    ClickCta: "click_cta"
  };
  var metaStandardEvents = {
    PageView: true,
    ViewContent: true,
    Lead: true,
    Contact: true,
    Schedule: true
  };
  var metaEventNames = {
    PageView: "PageView",
    ViewContent: "ViewContent",
    FormStart: "FormStart",
    Lead: "Lead",
    Contact: "Contact",
    Schedule: "Schedule",
    ClickWhatsApp: "ClickWhatsApp",
    ViewPlants: "ViewPlants",
    ClickCta: "ClickCTA"
  };
  var measurementActivated = false;
  var pendingEventId = "";
  var formLoadedAt = Date.now();

  function onlyDigits(value) {
    return String(value || "").replace(/\D/g, "").slice(0, 11);
  }

  function formatPhone(value) {
    var digits = onlyDigits(value);
    if (digits.length <= 2) return digits ? "(" + digits : "";
    if (digits.length <= 6) return "(" + digits.slice(0, 2) + ") " + digits.slice(2);
    if (digits.length <= 10) return "(" + digits.slice(0, 2) + ") " + digits.slice(2, 6) + "-" + digits.slice(6);
    return "(" + digits.slice(0, 2) + ") " + digits.slice(2, 7) + "-" + digits.slice(7);
  }

  function validPhone(value) {
    var digits = onlyDigits(value);
    return (digits.length === 10 || digits.length === 11) && !/^(\d)\1+$/.test(digits);
  }

  function getCookie(name) {
    var prefix = name + "=";
    var match = document.cookie.split("; ").find(function (item) { return item.indexOf(prefix) === 0; });
    return match ? match.slice(prefix.length) : "";
  }

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

  function readSessionObject(key, legacyKey) {
    try {
      var raw = sessionStorage.getItem(key) || (legacyKey ? sessionStorage.getItem(legacyKey) : "") || "{}";
      var value = JSON.parse(raw);
      if (!sessionStorage.getItem(key)) sessionStorage.setItem(key, JSON.stringify(value));
      return value;
    } catch (_) {
      return {};
    }
  }

  function writeSessionObject(key, value) {
    try { sessionStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  }

  function readSessionValue(key) {
    try { return sessionStorage.getItem(key) || ""; } catch (_) { return ""; }
  }

  function writeSessionValue(key, value) {
    try { sessionStorage.setItem(key, value); } catch (_) {}
  }

  function removeSessionValue(key) {
    try { sessionStorage.removeItem(key); } catch (_) {}
  }

  function safeUrl(value) {
    if (!value) return "";
    try {
      var parsed = new URL(value, window.location.href);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "";
      parsed.username = "";
      parsed.password = "";
      parsed.hash = "";
      var cleanParams = new URLSearchParams();
      if (parsed.origin === window.location.origin) {
        SAFE_QUERY_FIELDS.forEach(function (key) {
          var parameter = parsed.searchParams.get(key);
          if (parameter) cleanParams.set(key, safeCampaignValue(parameter, key === "fbclid" ? 500 : 160));
        });
      }
      parsed.search = cleanParams.toString();
      return parsed.href.slice(0, 1000);
    } catch (_) {
      return "";
    }
  }

  function isSameOrigin(value) {
    if (!value) return false;
    try { return new URL(value).origin === window.location.origin; } catch (_) { return false; }
  }

  function safeReferrer(value) {
    if (!value) return "";
    if (isSameOrigin(value)) return safeUrl(value);
    try {
      var parsed = new URL(value);
      return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.origin.slice(0, 500) : "";
    } catch (_) {
      return "";
    }
  }

  function safeAttributionToken(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120);
  }

  function safeCampaignValue(value, maxLength) {
    return String(value || "")
      .trim()
      .replace(/[^a-zA-Z0-9._~-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, maxLength || 160);
  }

  function contentOriginFromUrl(value) {
    if (!isSameOrigin(value)) return "";
    try {
      var match = new URL(value).pathname.match(/^\/conteudos\/([^/]+)\/?$/);
      return match ? safeAttributionToken(decodeURIComponent(match[1])) : "";
    } catch (_) {
      return "";
    }
  }

  function measurementConsentRecord() {
    var raw = readLocalValue(CONSENT_KEY, LEGACY_CONSENT_KEY);
    if (raw === "accepted" || raw === "rejected") {
      return { state: raw, version: "legacy", updatedAt: "" };
    }
    try {
      var record = JSON.parse(raw || "{}");
      if (record.state === "accepted" || record.state === "rejected") {
        return {
          state: record.state,
          version: String(record.version || "legacy").slice(0, 80),
          updatedAt: String(record.updatedAt || "").slice(0, 50)
        };
      }
    } catch (_) {}
    return { state: "unknown", version: MEASUREMENT_CONSENT_VERSION, updatedAt: "" };
  }

  function measurementConsent() {
    return measurementConsentRecord().state;
  }

  function saveMeasurementConsent(state) {
    var record = {
      state: state,
      version: MEASUREMENT_CONSENT_VERSION,
      updatedAt: new Date().toISOString()
    };
    writeLocalValue(CONSENT_KEY, JSON.stringify(record));
    return record;
  }

  function campaignData() {
    var stored = readSessionObject(UTM_KEY, LEGACY_UTM_KEY);
    var params = new URLSearchParams(window.location.search);
    var sanitized = {};
    UTM_FIELDS.forEach(function (key) {
      var value = stored[key] || params.get(key);
      if (value) sanitized[key] = safeCampaignValue(value, key === "fbclid" ? 500 : 160);
    });
    writeSessionObject(UTM_KEY, sanitized);
    return sanitized;
  }

  function attributionData() {
    var stored = readSessionObject(ATTRIBUTION_KEY);
    var params = new URLSearchParams(window.location.search);
    var currentUrl = safeUrl(window.location.href);
    var referrer = safeReferrer(document.referrer);
    var sameSiteReferrer = isSameOrigin(referrer) ? referrer : "";
    var contentId = safeAttributionToken(params.get("content_id"));

    if (!stored.firstPageUrl) {
      stored.firstPageUrl = sameSiteReferrer || currentUrl;
      stored.initialReferrer = referrer;
      stored.firstTouchAt = new Date().toISOString();
    }
    if (!stored.contentOrigin) {
      stored.contentOrigin = contentId || contentOriginFromUrl(sameSiteReferrer);
    }
    if (stored.currentPropertyId && stored.currentPropertyId !== PROPERTY.id) {
      stored.ctaOrigin = "formulario-direto";
    }
    stored.currentPropertyId = PROPERTY.id;
    stored.firstPageUrl = isSameOrigin(stored.firstPageUrl) ? safeUrl(stored.firstPageUrl) : currentUrl;
    stored.initialReferrer = safeReferrer(stored.initialReferrer);
    stored.contentOrigin = safeAttributionToken(stored.contentOrigin);
    stored.ctaOrigin = safeAttributionToken(stored.ctaOrigin) || "formulario-direto";
    stored.firstTouchAt = String(stored.firstTouchAt || "").slice(0, 50);
    stored.lastTouchUrl = currentUrl;
    stored.attributionVersion = ATTRIBUTION_VERSION;
    writeSessionObject(ATTRIBUTION_KEY, stored);
    return stored;
  }

  function setCtaOrigin(value) {
    growthAttribution.ctaOrigin = safeAttributionToken(value) || "formulario-direto";
    growthAttribution.lastTouchUrl = safeUrl(window.location.href);
    writeSessionObject(ATTRIBUTION_KEY, growthAttribution);
  }

  var campaign = campaignData();
  var growthAttribution = attributionData();

  function installGoogleAnalytics() {
    if (!GA_MEASUREMENT_ID || window.gtag) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", GA_MEASUREMENT_ID, { anonymize_ip: true, send_page_view: false });
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

  function track(eventName, parameters, eventId) {
    var data = Object.assign({
      property_id: PROPERTY.id,
      content_ids: [PROPERTY.id],
      content_name: PROPERTY.name,
      content_type: "product"
    }, parameters || {});
    if (window.gtag && gaEventNames[eventName]) window.gtag("event", gaEventNames[eventName], data);
    if (window.fbq && metaEventNames[eventName]) {
      var method = metaStandardEvents[eventName] ? "track" : "trackCustom";
      window.fbq(method, metaEventNames[eventName], data, eventId ? { eventID: eventId } : undefined);
    }
  }

  function activateMeasurement() {
    if (measurementActivated) return;
    measurementActivated = true;
    installGoogleAnalytics();
    installMetaPixel();
    track("PageView", {
      page_location: safeUrl(window.location.href),
      page_title: document.title
    });
    track("ViewContent", {
      value: PROPERTY.priceFrom,
      currency: PROPERTY.currency
    });
  }

  var banner = document.getElementById("cookie-banner");
  function showConsentBanner() {
    banner.hidden = false;
    document.body.classList.add("consent-open");
  }

  function hideConsentBanner() {
    banner.hidden = true;
    document.body.classList.remove("consent-open");
  }

  var consent = measurementConsent();
  if (consent === "accepted") activateMeasurement();
  if (consent !== "accepted" && consent !== "rejected") showConsentBanner();
  if (new URLSearchParams(window.location.search).get("privacy") === "manage") showConsentBanner();

  document.getElementById("cookie-accept").addEventListener("click", function () {
    saveMeasurementConsent("accepted");
    hideConsentBanner();
    activateMeasurement();
  });
  document.getElementById("cookie-reject").addEventListener("click", function () {
    saveMeasurementConsent("rejected");
    hideConsentBanner();
    if (measurementActivated) window.location.reload();
  });

  document.querySelectorAll("[data-manage-consent]").forEach(function (button) {
    button.addEventListener("click", function () {
      showConsentBanner();
      document.getElementById("cookie-accept").focus();
    });
  });

  document.querySelectorAll("a[data-track]").forEach(function (link) {
    link.addEventListener("click", function () {
      var eventName = link.dataset.track;
      var method = link.dataset.trackMethod || "Link";
      track(eventName, { method: method });
    });
  });

  document.querySelectorAll("a[data-attribution-cta]").forEach(function (link) {
    link.addEventListener("click", function () {
      var ctaId = link.dataset.attributionCta;
      setCtaOrigin(ctaId);
      track("ClickCta", {
        cta_id: safeAttributionToken(ctaId),
        link_url: safeUrl(link.href)
      });
    });
  });

  var mobileHeroCta = document.querySelector(".hero-mobile-offer a");
  if (mobileHeroCta && "IntersectionObserver" in window) {
    var mobileCtaObserver = new IntersectionObserver(function (entries) {
      document.body.classList.toggle(
        "hero-cta-visible",
        entries.some(function (entry) { return entry.isIntersecting; })
      );
    }, { threshold: 0.15 });
    mobileCtaObserver.observe(mobileHeroCta);
  }

  var loadMapButton = document.getElementById("load-map");
  var locationMap = document.getElementById("location-map");
  var mapPlaceholder = document.getElementById("map-placeholder");
  if (loadMapButton && locationMap && mapPlaceholder) {
    loadMapButton.addEventListener("click", function () {
      locationMap.src = locationMap.dataset.src;
      locationMap.hidden = false;
      mapPlaceholder.hidden = true;
      track("ClickCta", { cta_id: "carregar-mapa", method: "Mapa" });
    });
  }

  var plantsSection = document.querySelector("[data-track-view-plants]");
  var plantsTracked = false;
  if (plantsSection && "IntersectionObserver" in window) {
    var plantsObserver = new IntersectionObserver(function (entries) {
      if (plantsTracked || !entries.some(function (entry) { return entry.isIntersecting; })) return;
      plantsTracked = true;
      track("ViewPlants", { method: "section_view" });
      plantsObserver.disconnect();
    }, { threshold: 0.45 });
    plantsObserver.observe(plantsSection);
  }

  var form = document.getElementById("formulario");
  var nameInput = document.getElementById("full-name");
  var phoneInput = document.getElementById("whatsapp");
  var errorBox = document.getElementById("form-error");
  var formTitle = document.getElementById("form-title");
  var stepIndicator = document.getElementById("step-indicator");
  var progress = document.getElementById("form-progress");
  var submitButton = form.querySelector('button[type="submit"]');
  var submitDefaultLabel = submitButton.textContent;
  var formStarted = false;
  var currentStep = 1;

  form.addEventListener("focusin", function (event) {
    if (event.target && event.target.name === "website") return;
    if (formStarted || measurementConsent() !== "accepted") return;
    formStarted = true;
    track("FormStart", { method: "Formulário" });
  });

  phoneInput.addEventListener("input", function () {
    phoneInput.value = formatPhone(phoneInput.value);
    phoneInput.removeAttribute("aria-invalid");
    clearError();
  });
  nameInput.addEventListener("input", function () {
    nameInput.removeAttribute("aria-invalid");
    clearError();
  });

  function clearError() {
    errorBox.textContent = "";
    errorBox.classList.remove("visible");
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.add("visible");
  }

  function values() {
    var fields = new FormData(form);
    return {
      fullName: String(fields.get("fullName") || "").trim(),
      whatsapp: onlyDigits(fields.get("whatsapp")),
      purchaseTimeline: String(fields.get("purchaseTimeline") || ""),
      purchaseMethod: "",
      downPayment: String(fields.get("downPayment") || ""),
      visitInterest: "",
      consent: fields.get("consent") === "on",
      website: String(fields.get("website") || "").trim()
    };
  }

  function showStep(step) {
    currentStep = step;
    form.querySelectorAll("[data-step]").forEach(function (panel) {
      panel.hidden = Number(panel.dataset.step) !== step;
    });
    stepIndicator.textContent = step + "/2";
    progress.style.width = (step * 50) + "%";
    progress.parentElement.setAttribute("aria-label", "Etapa " + step + " de 2");
    progress.parentElement.setAttribute("aria-valuenow", String(step));
    formTitle.textContent = step === 2 ? "Só mais duas informações opcionais" : "Receba plantas e condições";
    clearError();
  }

  function contactIsValid() {
    var fullName = nameInput.value.trim();
    var okName = fullName.length >= 2;
    var okPhone = validPhone(phoneInput.value);
    nameInput.setAttribute("aria-invalid", okName ? "false" : "true");
    phoneInput.setAttribute("aria-invalid", okPhone ? "false" : "true");
    if (!okName || !okPhone) showError("Informe seu nome e um WhatsApp válido com DDD.");
    return okName && okPhone;
  }

  form.querySelectorAll("[data-next]").forEach(function (button) {
    button.addEventListener("click", function () {
      var next = Number(button.dataset.next);
      if (next === 2 && !contactIsValid()) return;
      showStep(next);
    });
  });
  form.querySelectorAll("[data-back]").forEach(function (button) {
    button.addEventListener("click", function () { showStep(Number(button.dataset.back)); });
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (currentStep === 1) {
      if (!contactIsValid()) return;
      showStep(2);
      var firstOptionalField = form.querySelector('[data-step="2"] select');
      if (firstOptionalField) firstOptionalField.focus();
      return;
    }
    var data = values();
    if (!data.consent) {
      showError("Confirme o consentimento para que possamos responder ao seu pedido.");
      return;
    }
    if (data.website) {
      showError("Não foi possível validar o envio. Atualize a página e tente novamente.");
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Enviando…";
    clearError();
    pendingEventId = pendingEventId || readSessionValue(PENDING_EVENT_KEY);
    if (!pendingEventId) {
      pendingEventId = window.crypto && crypto.randomUUID ? crypto.randomUUID() : "lead-" + Date.now();
      writeSessionValue(PENDING_EVENT_KEY, pendingEventId);
    }
    var eventId = pendingEventId;
    var measurementRecord = measurementConsentRecord();
    var measurement = measurementRecord.state;
    var submittedAt = new Date().toISOString();
    growthAttribution.lastTouchUrl = safeUrl(window.location.href);
    writeSessionObject(ATTRIBUTION_KEY, growthAttribution);
    var measurementIdentifiers = measurement === "accepted" ? {
      fbp: getCookie("_fbp"),
      fbc: getCookie("_fbc"),
      userAgent: navigator.userAgent
    } : {
      fbp: "",
      fbc: "",
      userAgent: ""
    };

    try {
      var response = await fetch(LEAD_API_URL, {
        method: "POST",
        headers: { "content-type": "text/plain;charset=UTF-8" },
        body: JSON.stringify(Object.assign({}, data, campaign, growthAttribution, measurementIdentifiers, {
          property_id: PROPERTY.id,
          eventId: eventId,
          sourceUrl: safeUrl(window.location.href),
          formElapsedMs: Math.max(0, Date.now() - formLoadedAt),
          measurementConsent: measurement,
          measurementConsentVersion: measurementRecord.version,
          measurementConsentAt: measurementRecord.updatedAt,
          attendanceConsentVersion: ATTENDANCE_CONSENT_VERSION,
          attendanceConsentAt: submittedAt
        }))
      });
      var result = await response.json();
      if (!response.ok || result.ok !== true || result.version !== LEAD_API_VERSION || result.stored !== true || result.id !== eventId) {
        throw new Error(result.error || "Não foi possível confirmar o registro.");
      }

      track("Lead", { value: PROPERTY.priceFrom, currency: PROPERTY.currency }, eventId);
      if (data.visitInterest.indexOf("Sim") === 0) {
        track("Schedule", { method: "Formulário" }, eventId + "-schedule");
      }
      pendingEventId = "";
      removeSessionValue(PENDING_EVENT_KEY);
      var search = new URLSearchParams(campaign).toString();
      window.location.assign("./obrigado/" + (search ? "?" + search : ""));
    } catch (caught) {
      showError("Não foi possível confirmar o envio. Tente novamente; o mesmo pedido não será duplicado.");
      submitButton.disabled = false;
      submitButton.textContent = submitDefaultLabel;
    }
  });
})();
