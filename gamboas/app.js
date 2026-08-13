(function () {
  "use strict";

  var META_PIXEL_ID = "1580854386761765";
  var GA_MEASUREMENT_ID = "G-GKLE6VCGWH";
  var LEAD_API_URL = "https://script.google.com/macros/s/AKfycbyWacS4ejnYS5dBpKwOdtSDiivDBIRehFG59-0Wx-33GToMnz3Ha7zLhrg96Soi4hRi/exec";
  var CONSENT_KEY = "gamboas-analytics-consent";
  var UTM_KEY = "gamboas-campaign-attribution";
  var UTM_FIELDS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"];
  var gaEventNames = {
    ViewContent: "view_item",
    Lead: "generate_lead",
    Contact: "contact",
    Schedule: "schedule_visit"
  };

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

  function campaignData() {
    var stored = {};
    try { stored = JSON.parse(sessionStorage.getItem(UTM_KEY) || "{}"); } catch (_) { stored = {}; }
    var params = new URLSearchParams(window.location.search);
    UTM_FIELDS.forEach(function (key) {
      var value = params.get(key);
      if (value) stored[key] = value.slice(0, 500);
    });
    sessionStorage.setItem(UTM_KEY, JSON.stringify(stored));
    return stored;
  }

  var attribution = campaignData();

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

  function track(eventName, parameters, eventId) {
    var data = parameters || {};
    if (window.gtag) window.gtag("event", gaEventNames[eventName], data);
    if (window.fbq) window.fbq("track", eventName, data, eventId ? { eventID: eventId } : undefined);
  }

  function activateMeasurement() {
    installGoogleAnalytics();
    installMetaPixel();
    track("ViewContent", {
      content_name: "Edifício Gamboas",
      content_type: "product",
      value: 295000,
      currency: "BRL"
    });
  }

  var banner = document.getElementById("cookie-banner");
  var consent = localStorage.getItem(CONSENT_KEY);
  if (consent === "accepted") activateMeasurement();
  else if (consent !== "rejected") banner.hidden = false;

  document.getElementById("cookie-accept").addEventListener("click", function () {
    localStorage.setItem(CONSENT_KEY, "accepted");
    banner.hidden = true;
    activateMeasurement();
  });
  document.getElementById("cookie-reject").addEventListener("click", function () {
    localStorage.setItem(CONSENT_KEY, "rejected");
    banner.hidden = true;
  });

  document.querySelectorAll("a[data-track]").forEach(function (link) {
    link.addEventListener("click", function () {
      var eventName = link.dataset.track;
      var method = link.dataset.trackMethod || "Link";
      track(eventName, { content_name: "Edifício Gamboas", method: method });
    });
  });

  var form = document.getElementById("formulario");
  var nameInput = document.getElementById("full-name");
  var phoneInput = document.getElementById("whatsapp");
  var errorBox = document.getElementById("form-error");
  var formTitle = document.getElementById("form-title");
  var stepIndicator = document.getElementById("step-indicator");
  var progress = document.getElementById("form-progress");
  var reviewList = document.getElementById("review-list");
  var submitButton = form.querySelector('button[type="submit"]');

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
      purchaseMethod: String(fields.get("purchaseMethod") || ""),
      downPayment: String(fields.get("downPayment") || ""),
      visitInterest: String(fields.get("visitInterest") || ""),
      consent: fields.get("consent") === "on"
    };
  }

  function showStep(step) {
    form.querySelectorAll("[data-step]").forEach(function (panel) {
      panel.hidden = Number(panel.dataset.step) !== step;
    });
    stepIndicator.textContent = step + "/3";
    progress.style.width = (step * 33.333) + "%";
    progress.parentElement.setAttribute("aria-label", "Etapa " + step + " de 3");
    formTitle.textContent = step === 3 ? "Revise seus dados" : "Receba valores e disponibilidade";
    clearError();
  }

  function contactIsValid() {
    var fullName = nameInput.value.trim();
    var okName = fullName.split(/\s+/).length >= 2;
    var okPhone = validPhone(phoneInput.value);
    nameInput.setAttribute("aria-invalid", okName ? "false" : "true");
    phoneInput.setAttribute("aria-invalid", okPhone ? "false" : "true");
    if (!okName || !okPhone) showError("Informe seu nome completo e um WhatsApp válido com DDD.");
    return okName && okPhone;
  }

  function profileIsValid() {
    var data = values();
    var ok = data.purchaseTimeline && data.purchaseMethod && data.downPayment && data.visitInterest;
    if (!ok) showError("Selecione uma opção em cada pergunta.");
    return Boolean(ok);
  }

  function buildReview() {
    var data = values();
    var rows = [
      ["Contato", data.fullName + "\n" + formatPhone(data.whatsapp)],
      ["Prazo", data.purchaseTimeline],
      ["Forma de compra", data.purchaseMethod],
      ["Entrada", data.downPayment],
      ["Visita", data.visitInterest]
    ];
    reviewList.textContent = "";
    rows.forEach(function (row) {
      var wrapper = document.createElement("div");
      var term = document.createElement("dt");
      var description = document.createElement("dd");
      term.textContent = row[0];
      description.textContent = row[1];
      description.style.whiteSpace = "pre-line";
      wrapper.append(term, description);
      reviewList.appendChild(wrapper);
    });
  }

  form.querySelectorAll("[data-next]").forEach(function (button) {
    button.addEventListener("click", function () {
      var next = Number(button.dataset.next);
      if (next === 2 && !contactIsValid()) return;
      if (next === 3 && !profileIsValid()) return;
      if (next === 3) buildReview();
      showStep(next);
    });
  });
  form.querySelectorAll("[data-back]").forEach(function (button) {
    button.addEventListener("click", function () { showStep(Number(button.dataset.back)); });
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    var data = values();
    if (!data.consent) {
      showError("Confirme o consentimento para que possamos responder ao seu pedido.");
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Enviando…";
    clearError();
    var eventId = window.crypto && crypto.randomUUID ? crypto.randomUUID() : "lead-" + Date.now();

    try {
      var response = await fetch(LEAD_API_URL, {
        method: "POST",
        headers: { "content-type": "text/plain;charset=UTF-8" },
        body: JSON.stringify(Object.assign({}, data, attribution, {
          eventId: eventId,
          sourceUrl: window.location.href,
          fbp: getCookie("_fbp"),
          fbc: getCookie("_fbc"),
          userAgent: navigator.userAgent
        }))
      });
      var result = await response.json();
      if (!response.ok || !result.id) throw new Error(result.error || "Não foi possível enviar.");

      track("Lead", { content_name: "Edifício Gamboas", value: 295000, currency: "BRL" }, eventId);
      if (data.visitInterest.indexOf("Sim") === 0) {
        track("Schedule", { content_name: "Edifício Gamboas", method: "Formulário" }, eventId + "-schedule");
      }
      sessionStorage.setItem("gamboas-lead-summary", JSON.stringify({
        fullName: data.fullName,
        whatsapp: formatPhone(data.whatsapp),
        visitInterest: data.visitInterest
      }));
      var search = new URLSearchParams(attribution).toString();
      window.location.assign("./obrigado/" + (search ? "?" + search : ""));
    } catch (caught) {
      showError(caught && caught.message ? caught.message : "Não foi possível enviar. Tente novamente.");
      submitButton.disabled = false;
      submitButton.textContent = "Enviar meu interesse";
    }
  });
})();
