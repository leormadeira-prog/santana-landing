/**
 * Recebe os leads dos empreendimentos e os grava na aba operacional.
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
var INTEGRATION_VERSION = "growth-v2";
var META_GRAPH_VERSION = "v24.0";
var META_LEAD_SYNC_FUNCTION = "syncMetaInstantFormLeads";
var ALLOWED_ATTRIBUTION_QUERY_FIELDS = [
  "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "content_id"
];
var PROPERTY_CONFIGS = {
  gamboas: {
    path: "/gamboas/",
    name: "Edifício Gamboas",
    priceFrom: 295000,
    currency: "BRL"
  }
};
var BASE_HEADERS = [
  "Recebido em",
  "ID do evento",
  "Ordem",
  "Nome completo",
  "WhatsApp",
  "Contato responde",
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
var OPERATION_HEADERS = [
  "Status",
  "Data do primeiro contato",
  "Qualificado?",
  "Visita confirmada?",
  "Compareceu?",
  "Proposta?",
  "Venda?",
  "Observações"
];
var ATTRIBUTION_HEADERS = [
  "ID do empreendimento",
  "Consentimento de medição",
  "Primeira página da sessão",
  "Referência inicial",
  "Conteúdo de origem",
  "CTA de origem",
  "Primeiro acesso em",
  "Última página antes da conversão",
  "Versão da atribuição",
  "Versão do consentimento de medição",
  "Consentimento de medição atualizado em",
  "Versão do consentimento de atendimento",
  "Consentimento de atendimento em"
];
var OPERATION_START_COLUMN = BASE_HEADERS.length + 1;
var ATTRIBUTION_START_COLUMN = OPERATION_START_COLUMN + OPERATION_HEADERS.length;

function setup() {
  var sheet = getLeadSheet_();
  PropertiesService.getScriptProperties().setProperty("SPREADSHEET_ID", sheet.getParent().getId());
  ensureBaseHeaders_(sheet);
  ensureHeaders_(sheet, OPERATION_START_COLUMN, OPERATION_HEADERS, false);
  ensureAttributionHeaders_(sheet);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, ATTRIBUTION_START_COLUMN + ATTRIBUTION_HEADERS.length - 1);
  return "Integração preparada na aba \"" + SHEET_NAME + "\".";
}

/**
 * Ativa a importação automática dos formulários instantâneos da Meta.
 * Execute uma vez depois de configurar as propriedades descritas no README.
 */
function setupMetaLeadSync() {
  setup();
  getMetaLeadConfig_();
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === META_LEAD_SYNC_FUNCTION) {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  ScriptApp.newTrigger(META_LEAD_SYNC_FUNCTION)
    .timeBased()
    .everyMinutes(5)
    .create();
  var result = syncMetaInstantFormLeads();
  return "Sincronização da Meta ativada. " + result.imported + " lead(s) importado(s) agora.";
}

function removeMetaLeadSync() {
  var removed = 0;
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === META_LEAD_SYNC_FUNCTION) {
      ScriptApp.deleteTrigger(trigger);
      removed += 1;
    }
  });
  return removed + " gatilho(s) removido(s).";
}

/**
 * Diagnóstico sem segredos. Execute no editor para conferir a ativação.
 */
function getMetaLeadSyncStatus() {
  var properties = PropertiesService.getScriptProperties();
  var rawFormIds = text_(
    properties.getProperty("META_LEADS_FORM_IDS") || properties.getProperty("META_LEADS_FORM_ID"),
    1000
  );
  var triggerCount = ScriptApp.getProjectTriggers().filter(function (trigger) {
    return trigger.getHandlerFunction() === META_LEAD_SYNC_FUNCTION;
  }).length;
  return {
    spreadsheetConfigured: Boolean(properties.getProperty("SPREADSHEET_ID")),
    accessTokenConfigured: Boolean(properties.getProperty("META_LEADS_ACCESS_TOKEN")),
    formIds: rawFormIds.split(",").map(function (value) {
      return text_(value, 100).replace(/\D/g, "");
    }).filter(function (value) { return value; }),
    triggerCount: triggerCount,
    lastSyncAt: properties.getProperty("META_LEADS_LAST_SYNC_AT") || "",
    lastError: properties.getProperty("META_LEADS_LAST_ERROR") || ""
  };
}

/**
 * Pode ser executada manualmente para testar ou recuperar leads anteriores.
 * A leitura para ao encontrar um ID já salvo e percorre no máximo dez páginas.
 */
function syncMetaInstantFormLeads() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var config = getMetaLeadConfig_();
    var sheet = getLeadSheet_();
    ensureBaseHeaders_(sheet);
    ensureHeaders_(sheet, OPERATION_START_COLUMN, OPERATION_HEADERS, false);
    ensureAttributionHeaders_(sheet);

    var existingIds = getExistingEventIds_(sheet);
    var pending = [];
    config.formIds.forEach(function (formId) {
      pending = pending.concat(fetchNewMetaLeads_(formId, config.accessToken, existingIds));
    });

    pending.sort(function (left, right) {
      return parseMetaDate_(left.created_time).getTime() - parseMetaDate_(right.created_time).getTime();
    });
    pending.forEach(function (metaLead) {
      appendMetaLead_(sheet, metaLead);
      existingIds[metaEventId_(metaLead.id)] = true;
    });

    var properties = PropertiesService.getScriptProperties();
    properties.setProperty("META_LEADS_LAST_SYNC_AT", new Date().toISOString());
    properties.deleteProperty("META_LEADS_LAST_ERROR");
    return { ok: true, imported: pending.length };
  } catch (error) {
    PropertiesService.getScriptProperties().setProperty(
      "META_LEADS_LAST_ERROR",
      new Date().toISOString() + " | " + text_(error && error.message, 900)
    );
    throw error;
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function doGet() {
  return json_({
    ok: true,
    service: "ZN Empreendimentos - Leads",
    version: INTEGRATION_VERSION,
    properties: Object.keys(PROPERTY_CONFIGS)
  });
}

function doPost(event) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var lead = parseLead_(event);
    validateLead_(lead);

    var sheet = getLeadSheet_();
    ensureBaseHeaders_(sheet);
    ensureHeaders_(sheet, OPERATION_START_COLUMN, OPERATION_HEADERS, false);
    ensureAttributionHeaders_(sheet);
    var existingRow = findEventRow_(sheet, lead.eventId);
    if (existingRow) {
      return json_({ ok: true, stored: true, version: INTEGRATION_VERSION, id: lead.eventId, duplicate: true });
    }

    var row = sheet.getLastRow() + 1;
    var baseValues = [
      new Date(),
      safeCell_(lead.eventId),
      "",
      safeCell_(lead.fullName),
      safeCell_(lead.whatsapp),
      "",
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
      "Pendente",
      "Lead gravado; aguardando processamento da CAPI"
    ];
    var operationValues = ["Novo", "", "", "", "", "", "", ""];
    var attributionValues = [
      safeCell_(lead.property_id),
      lead.measurementConsent === "accepted" ? "Aceito" : lead.measurementConsent === "rejected" ? "Recusado" : "Não informado",
      safeCell_(lead.firstPageUrl),
      safeCell_(lead.initialReferrer),
      safeCell_(lead.contentOrigin),
      safeCell_(lead.ctaOrigin),
      safeCell_(lead.firstTouchAt),
      safeCell_(lead.lastTouchUrl),
      safeCell_(lead.attributionVersion),
      safeCell_(lead.measurementConsentVersion),
      safeCell_(lead.measurementConsentAt),
      safeCell_(lead.attendanceConsentVersion),
      safeCell_(lead.attendanceConsentAt)
    ];
    var leadRow = baseValues.concat(operationValues, attributionValues);
    sheet.getRange(row, 1, 1, leadRow.length).setValues([leadRow]);

    var capiResults = sendCapiEvents_(lead);
    try {
      var capiStatusColumn = BASE_HEADERS.indexOf("CAPI enviada") + 1;
      sheet.getRange(row, capiStatusColumn, 1, 2).setValues([[
        capiResults.sent ? "Sim" : "Não",
        safeCell_(capiResults.details)
      ]]);
    } catch (statusError) {
      console.error("CAPI_STATUS_UPDATE_FAILED: " + text_(statusError && statusError.message, 120));
    }

    return json_({ ok: true, stored: true, version: INTEGRATION_VERSION, id: lead.eventId });
  } catch (error) {
    console.error("LEAD_POST_FAILED: " + text_(error && error.message, 120));
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
  var source = sanitizeInternalUrl_(lead.sourceUrl);
  var propertyId = text_(lead.property_id, 120).toLowerCase();
  if (!propertyId) propertyId = inferPropertyId_(source);
  var propertyConfig = PROPERTY_CONFIGS[propertyId];
  var measurement = text_(lead.measurementConsent, 20) || "unknown";
  var firstPage = sanitizeInternalUrl_(lead.firstPageUrl || source);
  var lastTouch = sanitizeInternalUrl_(lead.lastTouchUrl || source);
  var contentOrigin = text_(lead.contentOrigin, 120).toLowerCase();
  var ctaOrigin = text_(lead.ctaOrigin, 120).toLowerCase();
  var allowedOptions = {
    purchaseTimeline: ["", "Imediatamente", "Em até 3 meses", "De 3 a 6 meses", "Apenas pesquisando"],
    purchaseMethod: ["", "Financiamento bancário", "Entrada + financiamento", "Recursos próprios", "Ainda preciso avaliar"],
    downPayment: ["", "Até R$ 30 mil", "De R$ 30 mil a R$ 60 mil", "Acima de R$ 60 mil", "Ainda não possuo"],
    visitInterest: ["", "Sim, nesta semana", "Sim, nas próximas semanas", "Primeiro quero receber informações"]
  };

  if (name.length < 2) throw new Error("INVALID_NAME");
  if (!/^[0-9]{10,11}$/.test(phone) || /^(\d)\1+$/.test(phone)) throw new Error("INVALID_PHONE");
  if (lead.consent !== true) throw new Error("CONSENT_REQUIRED");
  if (!/^[a-zA-Z0-9_-]{8,100}$/.test(text_(lead.eventId, 100))) throw new Error("EVENT_ID_REQUIRED");
  if (text_(lead.website, 200)) throw new Error("SPAM_DETECTED");
  var elapsed = text_(lead.formElapsedMs, 20);
  if (elapsed && (!/^\d+$/.test(elapsed) || Number(elapsed) < 1500 || Number(elapsed) > 86400000)) {
    throw new Error("SPAM_DETECTED");
  }
  if (!propertyConfig || !/^[a-z0-9][a-z0-9_-]{0,119}$/.test(propertyId)) throw new Error("INVALID_PROPERTY");
  if (source.split("?")[0] !== ALLOWED_ORIGIN + propertyConfig.path) throw new Error("INVALID_SOURCE");
  if (["accepted", "rejected", "unknown"].indexOf(measurement) === -1) throw new Error("INVALID_MEASUREMENT_CONSENT");
  if (firstPage.indexOf(ALLOWED_ORIGIN + "/") !== 0 || lastTouch.indexOf(ALLOWED_ORIGIN + "/") !== 0) {
    throw new Error("INVALID_ATTRIBUTION");
  }
  if (contentOrigin && !/^[a-z0-9][a-z0-9_-]{0,119}$/.test(contentOrigin)) throw new Error("INVALID_ATTRIBUTION");
  if (ctaOrigin && !/^[a-z0-9][a-z0-9_-]{0,119}$/.test(ctaOrigin)) throw new Error("INVALID_ATTRIBUTION");

  Object.keys(allowedOptions).forEach(function (field) {
    var option = text_(lead[field], 200);
    if (allowedOptions[field].indexOf(option) === -1) {
      throw new Error("INVALID_" + field.toUpperCase());
    }
    lead[field] = option;
  });

  lead.fullName = name;
  lead.whatsapp = phone;
  lead.property_id = propertyId;
  lead.eventId = text_(lead.eventId, 100);
  lead.sourceUrl = source;
  lead.utm_source = safeCampaignValue_(lead.utm_source, 160);
  lead.utm_medium = safeCampaignValue_(lead.utm_medium, 160);
  lead.utm_campaign = safeCampaignValue_(lead.utm_campaign, 160);
  lead.utm_content = safeCampaignValue_(lead.utm_content, 160);
  lead.utm_term = safeCampaignValue_(lead.utm_term, 160);
  lead.fbclid = safeCampaignValue_(lead.fbclid, 500);
  lead.fbp = safeMeasurementIdentifier_(lead.fbp);
  lead.fbc = safeMeasurementIdentifier_(lead.fbc);
  lead.userAgent = text_(lead.userAgent, 1000);
  lead.measurementConsent = measurement;
  lead.firstPageUrl = firstPage;
  lead.initialReferrer = sanitizeReferrer_(lead.initialReferrer);
  lead.contentOrigin = contentOrigin;
  lead.ctaOrigin = ctaOrigin || "formulario-direto";
  lead.firstTouchAt = text_(lead.firstTouchAt, 50);
  lead.lastTouchUrl = lastTouch;
  lead.attributionVersion = text_(lead.attributionVersion, 50) || "legacy";
  lead.measurementConsentVersion = text_(lead.measurementConsentVersion, 80) || "legacy";
  lead.measurementConsentAt = text_(lead.measurementConsentAt, 50);
  lead.attendanceConsentVersion = text_(lead.attendanceConsentVersion, 80) || "legacy";
  lead.attendanceConsentAt = text_(lead.attendanceConsentAt, 50);
}

function getLeadSheet_() {
  var properties = PropertiesService.getScriptProperties();
  var spreadsheetId = properties.getProperty("SPREADSHEET_ID");
  var spreadsheet = spreadsheetId
    ? SpreadsheetApp.openById(spreadsheetId)
    : SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error("SPREADSHEET_NOT_FOUND");
  return spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
}

function getMetaLeadConfig_() {
  var properties = PropertiesService.getScriptProperties();
  var token = text_(properties.getProperty("META_LEADS_ACCESS_TOKEN"), 3000);
  var rawFormIds = text_(
    properties.getProperty("META_LEADS_FORM_IDS") || properties.getProperty("META_LEADS_FORM_ID"),
    1000
  );
  var formIds = rawFormIds.split(",").map(function (value) {
    return text_(value, 100).replace(/\D/g, "");
  }).filter(function (value) { return value; });
  if (!token) throw new Error("META_LEADS_TOKEN_REQUIRED");
  if (!formIds.length) throw new Error("META_LEADS_FORM_REQUIRED");
  return { accessToken: token, formIds: formIds };
}

function getExistingEventIds_(sheet) {
  var ids = {};
  if (sheet.getLastRow() < 2) return ids;
  sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getDisplayValues().forEach(function (row) {
    var eventId = text_(row[0], 200);
    if (eventId) ids[eventId] = true;
  });
  return ids;
}

function fetchNewMetaLeads_(formId, accessToken, existingIds) {
  var fields = [
    "id", "created_time", "ad_id", "ad_name", "adset_id", "adset_name",
    "campaign_id", "campaign_name", "form_id", "field_data", "platform", "is_organic"
  ].join(",");
  var url = "https://graph.facebook.com/" + META_GRAPH_VERSION + "/" +
    encodeURIComponent(formId) + "/leads?limit=100&fields=" + encodeURIComponent(fields);
  var leads = [];
  var page = 0;
  var reachedKnownLead = false;

  while (url && page < 10 && !reachedKnownLead) {
    var response = UrlFetchApp.fetch(url, {
      method: "get",
      muteHttpExceptions: true,
      headers: { Authorization: "Bearer " + accessToken }
    });
    var code = response.getResponseCode();
    var body = response.getContentText();
    if (code < 200 || code >= 300) {
      throw new Error("META_LEADS_HTTP_" + code + ": " + text_(body, 800));
    }
    var payload;
    try { payload = JSON.parse(body); } catch (_) { throw new Error("META_LEADS_INVALID_JSON"); }
    var pageLeads = payload && Array.isArray(payload.data) ? payload.data : [];
    for (var index = 0; index < pageLeads.length; index += 1) {
      var lead = pageLeads[index];
      if (!lead || !lead.id) continue;
      if (existingIds[metaEventId_(lead.id)]) {
        reachedKnownLead = true;
        break;
      }
      if (!lead.form_id) lead.form_id = formId;
      leads.push(lead);
    }
    url = payload && payload.paging && payload.paging.next ? payload.paging.next : "";
    page += 1;
  }
  return leads;
}

function appendMetaLead_(sheet, metaLead) {
  var answers = metaAnswers_(metaLead.field_data);
  var firstName = firstMetaAnswer_(answers, ["first_name", "primeiro_nome", "nome"]);
  var lastName = firstMetaAnswer_(answers, ["last_name", "sobrenome"]);
  var fullName = firstMetaAnswer_(answers, ["full_name", "nome_completo"]);
  if (!fullName) fullName = text_(firstName + " " + lastName, 120);
  var phone = normalizeBrazilPhone_(firstMetaAnswer_(answers, [
    "phone_number", "whatsapp", "numero_de_whatsapp", "telefone", "celular"
  ]));
  var purchaseTimeline = firstMetaAnswer_(answers, [
    "em_quanto_tempo_pretende_comprar", "quanto_tempo_pretende_comprar", "prazo_de_compra"
  ]);
  var purchaseMethod = firstMetaAnswer_(answers, [
    "como_pretende_comprar", "forma_de_compra", "modalidade_de_compra"
  ]);
  var downPayment = firstMetaAnswer_(answers, [
    "possui_valor_para_entrada", "valor_para_entrada", "valor_de_entrada", "entrada"
  ]);
  var visitInterest = firstMetaAnswer_(answers, [
    "gostaria_de_agendar_uma_visita", "agendar_uma_visita", "interesse_em_visita", "visita"
  ]);
  var createdAt = parseMetaDate_(metaLead.created_time);
  var formId = text_(metaLead.form_id, 100);
  var eventId = metaEventId_(metaLead.id);
  var sourceLabel = "Meta Instant Form" + (formId ? " " + formId : "");
  var campaignName = text_(metaLead.campaign_name, 300);
  var adsetName = text_(metaLead.adset_name, 300);
  var adName = text_(metaLead.ad_name, 300);
  var row = sheet.getLastRow() + 1;

  var baseValues = [
    createdAt,
    safeCell_(eventId),
    "",
    safeCell_(fullName),
    safeCell_(phone),
    "",
    safeCell_(purchaseTimeline),
    safeCell_(purchaseMethod),
    safeCell_(downPayment),
    safeCell_(visitInterest),
    "Sim (formulário Meta)",
    "meta",
    "paid_social",
    safeCell_(campaignName),
    safeCell_(adName),
    safeCell_(adsetName),
    "",
    "",
    "",
    safeCell_(sourceLabel),
    "Não",
    "Não aplicável: lead convertido dentro da Meta"
  ];
  var operationValues = [
    "Novo", "", "", "", "", "", "", safeCell_(buildMetaLeadObservations_(metaLead, answers))
  ];
  var attributionValues = [
    "gamboas",
    "Não informado",
    "",
    "Meta Instant Form",
    safeCell_(adName || campaignName),
    "meta-instant-form",
    createdAt,
    safeCell_(sourceLabel),
    "meta-leads-v1",
    "",
    "",
    safeCell_("meta-form-" + formId),
    createdAt
  ];
  var metaRow = baseValues.concat(operationValues, attributionValues);
  sheet.getRange(row, 1, 1, metaRow.length).setValues([metaRow]);
}

function metaAnswers_(fieldData) {
  var answers = {};
  (Array.isArray(fieldData) ? fieldData : []).forEach(function (field) {
    var key = normalizeMetaKey_(field && field.name);
    var values = field && Array.isArray(field.values) ? field.values : [];
    if (key) answers[key] = text_(values.join(" | "), 1000);
  });
  return answers;
}

function firstMetaAnswer_(answers, aliases) {
  for (var index = 0; index < aliases.length; index += 1) {
    var exact = answers[normalizeMetaKey_(aliases[index])];
    if (exact) return exact;
  }
  var keys = Object.keys(answers);
  for (var aliasIndex = 0; aliasIndex < aliases.length; aliasIndex += 1) {
    var alias = normalizeMetaKey_(aliases[aliasIndex]);
    for (var keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
      if (keys[keyIndex].indexOf(alias) !== -1 && answers[keys[keyIndex]]) return answers[keys[keyIndex]];
    }
  }
  return "";
}

function normalizeMetaKey_(value) {
  var normalized = text_(value, 300).toLowerCase();
  if (normalized.normalize) normalized = normalized.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return normalized.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function normalizeBrazilPhone_(value) {
  var digits = text_(value, 40).replace(/\D/g, "");
  if (digits.indexOf("55") === 0 && digits.length >= 12) digits = digits.slice(2);
  return digits;
}

function buildMetaLeadObservations_(metaLead, answers) {
  var parts = [
    "Origem: formulário instantâneo da Meta",
    "Meta lead ID: " + text_(metaLead.id, 100),
    "Form ID: " + text_(metaLead.form_id, 100),
    "Campaign: " + text_(metaLead.campaign_name || metaLead.campaign_id, 300),
    "Ad set: " + text_(metaLead.adset_name || metaLead.adset_id, 300),
    "Ad: " + text_(metaLead.ad_name || metaLead.ad_id, 300)
  ];
  Object.keys(answers).sort().forEach(function (key) {
    if (isSensitiveMetaAnswerKey_(key)) return;
    parts.push(key + ": " + answers[key]);
  });
  return parts.filter(function (part) { return part.replace(/:\s*$/, ":").slice(-1) !== ":"; }).join(" | ");
}

function isSensitiveMetaAnswerKey_(key) {
  return [
    "full_name", "nome_completo", "first_name", "primeiro_nome", "nome", "last_name", "sobrenome",
    "phone_number", "whatsapp", "numero_de_whatsapp", "telefone", "celular", "email"
  ].indexOf(normalizeMetaKey_(key)) !== -1;
}

function metaEventId_(leadId) {
  return "meta-" + text_(leadId, 180);
}

function parseMetaDate_(value) {
  var parsed = new Date(value || Date.now());
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

function getPropertyConfig_(propertyId) {
  var config = PROPERTY_CONFIGS[propertyId];
  if (!config) throw new Error("INVALID_PROPERTY");
  return config;
}

function inferPropertyId_(sourceUrl) {
  var matches = Object.keys(PROPERTY_CONFIGS).filter(function (propertyId) {
    return sourceUrl.indexOf(ALLOWED_ORIGIN + PROPERTY_CONFIGS[propertyId].path) === 0;
  });
  return matches.length === 1 ? matches[0] : "";
}

function safeCampaignValue_(value, maxLength) {
  return text_(value, maxLength || 160)
    .replace(/[^a-zA-Z0-9._~-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function safeMeasurementIdentifier_(value) {
  var cleaned = text_(value, 500);
  return !cleaned || /^[a-zA-Z0-9._-]+$/.test(cleaned) ? cleaned : "";
}

function sanitizeInternalUrl_(value) {
  var raw = text_(value, 1000).split("#")[0];
  if (raw.indexOf(ALLOWED_ORIGIN + "/") !== 0 || /[\s<>]/.test(raw)) return "";
  var parts = raw.split("?");
  var base = parts.shift();
  if (!/^https:\/\/znempreendimentos\.com\.br\/[a-zA-Z0-9/_-]*$/.test(base)) return "";
  var cleanPairs = [];
  parts.join("?").split("&").forEach(function (pair) {
    if (!pair) return;
    var separator = pair.indexOf("=");
    var rawKey = separator === -1 ? pair : pair.slice(0, separator);
    var rawValue = separator === -1 ? "" : pair.slice(separator + 1);
    var key;
    var decodedValue;
    try {
      key = decodeURIComponent(rawKey.replace(/\+/g, " "));
      decodedValue = decodeURIComponent(rawValue.replace(/\+/g, " "));
    } catch (_) {
      return;
    }
    if (ALLOWED_ATTRIBUTION_QUERY_FIELDS.indexOf(key) === -1) return;
    var cleanValue = safeCampaignValue_(decodedValue, key === "fbclid" ? 500 : 160);
    if (cleanValue) cleanPairs.push(encodeURIComponent(key) + "=" + encodeURIComponent(cleanValue));
  });
  return base + (cleanPairs.length ? "?" + cleanPairs.join("&") : "");
}

function sanitizeReferrer_(value) {
  var raw = text_(value, 1000);
  if (!raw) return "";
  if (raw.indexOf(ALLOWED_ORIGIN + "/") === 0) return sanitizeInternalUrl_(raw);
  var match = raw.match(/^(https?:\/\/[^\s\/?#<>]+)/i);
  return match ? match[1].slice(0, 500) : "";
}

function ensureHeaders_(sheet, startColumn, headers, strict) {
  var range = sheet.getRange(1, startColumn, 1, headers.length);
  var existing = range.getValues()[0];
  var values = headers.map(function (header, index) {
    var current = text_(existing[index], 200);
    if (strict && current && current !== header) throw new Error("HEADER_MISMATCH");
    return current || header;
  });
  range.setValues([values]);
  if (sheet.getLastRow() <= 1) {
    range.setFontWeight("bold");
  }
}

function ensureBaseHeaders_(sheet) {
  var existing = sheet.getRange(1, 1, 1, BASE_HEADERS.length).getValues()[0]
    .map(function (value) { return text_(value, 200); });
  var isCurrent = BASE_HEADERS.every(function (header, index) { return existing[index] === header; });
  var isEmpty = existing.every(function (header) { return !header; });
  if (isCurrent || isEmpty) {
    ensureHeaders_(sheet, 1, BASE_HEADERS, true);
    return;
  }

  var legacyHeaders = BASE_HEADERS.filter(function (header) {
    return header !== "Ordem" && header !== "Contato responde";
  });
  var legacyExisting = sheet.getRange(1, 1, 1, legacyHeaders.length).getValues()[0]
    .map(function (value) { return text_(value, 200); });
  var isLegacy = legacyHeaders.every(function (header, index) { return legacyExisting[index] === header; });
  if (!isLegacy) throw new Error("HEADER_MISMATCH");

  sheet.insertColumnsBefore(3, 1);
  sheet.insertColumnsBefore(6, 1);
  ensureHeaders_(sheet, 1, BASE_HEADERS, true);
}

function ensureAttributionHeaders_(sheet) {
  var existing = sheet.getRange(1, ATTRIBUTION_START_COLUMN, 1, ATTRIBUTION_HEADERS.length)
    .getValues()[0]
    .map(function (value) { return text_(value, 200); });
  var isCurrent = ATTRIBUTION_HEADERS.every(function (header, index) { return existing[index] === header; });
  var isEmpty = existing.every(function (header) { return !header; });
  if (isCurrent || isEmpty) {
    ensureHeaders_(sheet, ATTRIBUTION_START_COLUMN, ATTRIBUTION_HEADERS, true);
    return;
  }

  var growthV1Headers = ATTRIBUTION_HEADERS.slice(0, 9);
  var isGrowthV1 = growthV1Headers.every(function (header, index) { return existing[index] === header; });
  if (isGrowthV1) {
    var occupiedAfterV1 = existing.slice(growthV1Headers.length).some(function (header) { return Boolean(header); });
    if (occupiedAfterV1) {
      sheet.insertColumnsBefore(ATTRIBUTION_START_COLUMN + growthV1Headers.length, 4);
    }
    sheet.getRange(1, ATTRIBUTION_START_COLUMN, 1, ATTRIBUTION_HEADERS.length)
      .setValues([ATTRIBUTION_HEADERS])
      .setFontWeight("bold");
    return;
  }

  var legacyHeaders = ATTRIBUTION_HEADERS.slice(1, 9);
  var isLegacy = legacyHeaders.every(function (header, index) { return existing[index] === header; });
  if (isLegacy) {
    sheet.insertColumnsBefore(ATTRIBUTION_START_COLUMN, 1);
    sheet.insertColumnsBefore(ATTRIBUTION_START_COLUMN + growthV1Headers.length, 4);
    sheet.getRange(1, ATTRIBUTION_START_COLUMN, 1, ATTRIBUTION_HEADERS.length)
      .setValues([ATTRIBUTION_HEADERS])
      .setFontWeight("bold");
    return;
  }

  throw new Error("HEADER_MISMATCH");
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
  if (lead.measurementConsent !== "accepted") {
    return { sent: false, details: "CAPI não enviada: medição não autorizada" };
  }
  var properties = PropertiesService.getScriptProperties();
  var propertyConfig = getPropertyConfig_(lead.property_id);
  var pixelId = properties.getProperty("META_PIXEL_ID");
  var token = properties.getProperty("META_ACCESS_TOKEN");
  if (!pixelId || !token) return { sent: false, details: "CAPI ainda não configurada" };

  var nameParts = lead.fullName.trim().toLowerCase().split(/\s+/);
  var lastName = nameParts.slice(1).join(" ");
  var userData = {
    fn: [sha256_(nameParts[0])],
    ph: [sha256_("55" + lead.whatsapp)],
    client_user_agent: text_(lead.userAgent, 1000)
  };
  if (lastName) userData.ln = [sha256_(lastName)];
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
      custom_data: {
        property_id: lead.property_id,
        content_ids: [lead.property_id],
        content_type: "product",
        currency: propertyConfig.currency,
        value: propertyConfig.priceFrom,
        content_name: propertyConfig.name
      }
  }];
  if (lead.visitInterest.indexOf("Sim") === 0) {
    events.push({
      event_name: "Schedule",
      event_time: now,
      event_id: lead.eventId + "-schedule",
      action_source: "website",
      event_source_url: lead.sourceUrl,
      user_data: userData,
      custom_data: {
        property_id: lead.property_id,
        content_ids: [lead.property_id],
        content_type: "product",
        content_name: propertyConfig.name,
        method: "Formulário"
      }
    });
  }
  var payload = { data: events };
  var testCode = properties.getProperty("META_TEST_EVENT_CODE");
  if (testCode) payload.test_event_code = testCode;

  try {
    var response = UrlFetchApp.fetch(
      "https://graph.facebook.com/" + META_GRAPH_VERSION + "/" + encodeURIComponent(pixelId) + "/events?access_token=" + encodeURIComponent(token),
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
    SPAM_DETECTED: "Não foi possível validar o envio.",
    INVALID_MEASUREMENT_CONSENT: "Preferência de medição inválida.",
    INVALID_ATTRIBUTION: "Dados de origem inválidos.",
    INVALID_PROPERTY: "Empreendimento inválido.",
    EVENT_ID_REQUIRED: "Identificador do envio ausente.",
    INVALID_SOURCE: "Origem do envio não autorizada.",
    HEADER_MISMATCH: "A estrutura da planilha precisa ser revisada."
  };
  return messages[code] || "Não foi possível registrar o interesse.";
}

function json_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
