/**
 * Recebe os leads do Edifício Gamboas e os grava na aba "Leads Gamboas".
 *
 * Instalação:
 * 1. Crie uma Planilha Google e abra Extensões > Apps Script.
 * 2. Substitua o conteúdo de Code.gs por este arquivo.
 * 3. Execute setup() uma vez e aceite as permissões solicitadas.
 * 4. Implante como app da Web, executando como o proprietário e permitindo
 *    acesso a qualquer pessoa.
 * 5. Use na landing a URL da implantação terminada em /exec.
 */

var SHEET_NAME = "Leads Gamboas";
var ALLOWED_ORIGIN = "https://znempreendimentos.com.br";
var HEADERS = [
  "Recebido em",
  "ID do evento",
  "Nome completo",
  "WhatsApp",
  "Prazo de compra",
  "Forma de compra",
  "Valor de entrada",
  "Interesse em visita",
  "Consentimento LGPD",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "fbclid",
  "_fbp",
  "_fbc",
  "Página de origem",
  "CAPI enviada",
  "Resposta CAPI"
];

function setup() {
  var sheet = getLeadSheet_();
  ensureHeader_(sheet);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, HEADERS.length);
  return "Integração preparada na aba \"" + SHEET_NAME + "\".";
}

function doGet() {
  return json_({ ok: true, service: "ZN Empreendimentos - Leads Gamboas" });
}

function doPost(event) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var lead = parseLead_(event);
    validateLead_(lead);

    var sheet = getLeadSheet_();
    ensureHeader_(sheet);
    var existingRow = findEventRow_(sheet, lead.eventId);
    if (existingRow) {
      return json_({ ok: true, id: lead.eventId, duplicate: true });
    }

    var capiResults = sendCapiEvents_(lead);
    sheet.appendRow([
      new Date(),
      safeCell_(lead.eventId),
      safeCell_(lead.fullName),
      safeCell_(lead.whatsapp),
      safeCell_(lead.purchaseTimeline),
      safeCell_(lead.purchaseMethod),
      safeCell_(lead.downPayment),
      safeCell_(lead.visitInterest),
      lead.consent === true ? "Sim" : "Não",
      safeCell_(lead.utm_source),
      safeCell_(lead.utm_medium),
      safeCell_(lead.utm_campaign),
      safeCell_(lead.utm_content),
      safeCell_(lead.utm_term),
      safeCell_(lead.fbclid),
      safeCell_(lead.fbp),
      safeCell_(lead.fbc),
      safeCell_(lead.sourceUrl),
      capiResults.sent ? "Sim" : "Não",
      safeCell_(capiResults.details)
    ]);

    return json_({ ok: true, id: lead.eventId });
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return json_({ ok: false, error: publicError_(error) });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function parseLead_(event) {
  var raw = event && event.postData && event.postData.contents;
  if (!raw) throw new Error("EMPTY_REQUEST");
  var lead;
  try { lead = JSON.parse(raw); } catch (_) { throw new Error("INVALID_JSON"); }
  if (!lead || typeof lead !== "object") throw new Error("INVALID_JSON");
  return lead;
}

function validateLead_(lead) {
  var name = text_(lead.fullName, 120);
  var phone = text_(lead.whatsapp, 20).replace(/\D/g, "");
  var source = text_(lead.sourceUrl, 1000);
  var allowedOptions = {
    purchaseTimeline: ["Imediatamente", "Em até 3 meses", "De 3 a 6 meses", "Apenas pesquisando"],
    purchaseMethod: ["Financiamento bancário", "Entrada + financiamento", "Recursos próprios", "Ainda preciso avaliar"],
    downPayment: ["Até R$ 30 mil", "De R$ 30 mil a R$ 60 mil", "Acima de R$ 60 mil", "Ainda não possuo"],
    visitInterest: ["Sim, nesta semana", "Sim, nas próximas semanas", "Primeiro quero receber informações"]
  };

  if (name.split(/\s+/).length < 2) throw new Error("INVALID_NAME");
  if (!/^[0-9]{10,11}$/.test(phone) || /^(\d)\1+$/.test(phone)) throw new Error("INVALID_PHONE");
  if (lead.consent !== true) throw new Error("CONSENT_REQUIRED");
  if (!text_(lead.eventId, 100)) throw new Error("EVENT_ID_REQUIRED");
  if (source.indexOf(ALLOWED_ORIGIN + "/gamboas/") !== 0) throw new Error("INVALID_SOURCE");

  Object.keys(allowedOptions).forEach(function (field) {
    if (allowedOptions[field].indexOf(text_(lead[field], 200)) === -1) {
      throw new Error("INVALID_" + field.toUpperCase());
    }
  });

  lead.fullName = name;
  lead.whatsapp = phone;
  lead.eventId = text_(lead.eventId, 100);
  lead.sourceUrl = source;
}

function getLeadSheet_() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error("SPREADSHEET_NOT_FOUND");
  return spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
}

function ensureHeader_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight("bold");
  }
}

function findEventRow_(sheet, eventId) {
  if (sheet.getLastRow() < 2) return 0;
  var match = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1)
    .createTextFinder(eventId)
    .matchEntireCell(true)
    .findNext();
  return match ? match.getRow() : 0;
}

function sendCapiEvents_(lead) {
  var properties = PropertiesService.getScriptProperties();
  var pixelId = properties.getProperty("META_PIXEL_ID");
  var token = properties.getProperty("META_ACCESS_TOKEN");
  if (!pixelId || !token) return { sent: false, details: "CAPI ainda não configurada" };

  var nameParts = lead.fullName.trim().toLowerCase().split(/\s+/);
  var userData = {
    fn: [sha256_(nameParts[0])],
    ln: [sha256_(nameParts.slice(1).join(" "))],
    ph: [sha256_("55" + lead.whatsapp)],
    client_user_agent: text_(lead.userAgent, 1000)
  };
  if (lead.fbp) userData.fbp = text_(lead.fbp, 500);
  if (lead.fbc) userData.fbc = text_(lead.fbc, 500);

  var now = Math.floor(Date.now() / 1000);
  var events = [{
      event_name: "Lead",
      event_time: now,
      event_id: lead.eventId,
      action_source: "website",
      event_source_url: lead.sourceUrl,
      user_data: userData,
      custom_data: { currency: "BRL", value: 295000, content_name: "Edifício Gamboas" }
  }];
  if (lead.visitInterest.indexOf("Sim") === 0) {
    events.push({
      event_name: "Schedule",
      event_time: now,
      event_id: lead.eventId + "-schedule",
      action_source: "website",
      event_source_url: lead.sourceUrl,
      user_data: userData,
      custom_data: { content_name: "Edifício Gamboas", method: "Formulário" }
    });
  }
  var payload = { data: events };
  var testCode = properties.getProperty("META_TEST_EVENT_CODE");
  if (testCode) payload.test_event_code = testCode;

  try {
    var response = UrlFetchApp.fetch(
      "https://graph.facebook.com/v24.0/" + encodeURIComponent(pixelId) + "/events?access_token=" + encodeURIComponent(token),
      { method: "post", contentType: "application/json", payload: JSON.stringify(payload), muteHttpExceptions: true }
    );
    var code = response.getResponseCode();
    var body = response.getContentText().slice(0, 1000);
    return { sent: code >= 200 && code < 300, details: "HTTP " + code + ": " + body };
  } catch (error) {
    return { sent: false, details: "Erro CAPI: " + text_(error && error.message, 800) };
  }
}

function sha256_(value) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8);
  return bytes.map(function (byte) { return (byte + 256).toString(16).slice(-2); }).join("");
}

function text_(value, maxLength) {
  return String(value == null ? "" : value).trim().slice(0, maxLength || 500);
}

function safeCell_(value) {
  var text = text_(value, 1000);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function publicError_(error) {
  var code = text_(error && error.message, 100);
  var messages = {
    EMPTY_REQUEST: "Requisição vazia.",
    INVALID_JSON: "Dados inválidos.",
    INVALID_NAME: "Nome completo inválido.",
    INVALID_PHONE: "WhatsApp inválido.",
    CONSENT_REQUIRED: "O consentimento é obrigatório.",
    EVENT_ID_REQUIRED: "Identificador do envio ausente.",
    INVALID_SOURCE: "Origem do envio não autorizada."
  };
  return messages[code] || "Não foi possível registrar o interesse.";
}

function json_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
