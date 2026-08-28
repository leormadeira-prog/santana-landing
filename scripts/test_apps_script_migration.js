const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const appsScript = fs.readFileSync(
  path.join(root, "integrations/google-apps-script/Code.gs"),
  "utf8"
);
const context = vm.createContext({ console });
vm.runInContext(appsScript, context, { filename: "Code.gs" });

class MockRange {
  constructor(sheet, row, column, rowCount, columnCount) {
    this.sheet = sheet;
    this.row = row;
    this.column = column;
    this.rowCount = rowCount;
    this.columnCount = columnCount;
  }

  getValues() {
    return Array.from({ length: this.rowCount }, (_, rowOffset) =>
      Array.from({ length: this.columnCount }, (_, columnOffset) =>
        this.sheet.valueAt(this.row + rowOffset, this.column + columnOffset)
      )
    );
  }

  getDisplayValues() {
    return this.getValues().map((row) => row.map((value) => String(value ?? "")));
  }

  setValues(values) {
    assert.equal(values.length, this.rowCount);
    this.sheet.audit.push({
      type: "setValues",
      row: this.row,
      column: this.column,
      values: values.map((row) => Array.from(row))
    });
    values.forEach((row, rowOffset) => {
      assert.equal(row.length, this.columnCount);
      row.forEach((value, columnOffset) => {
        this.sheet.setValue(this.row + rowOffset, this.column + columnOffset, value);
      });
    });
    return this;
  }

  clearContent() {
    for (let rowOffset = 0; rowOffset < this.rowCount; rowOffset += 1) {
      for (let columnOffset = 0; columnOffset < this.columnCount; columnOffset += 1) {
        this.sheet.setValue(this.row + rowOffset, this.column + columnOffset, "");
      }
    }
    return this;
  }

  setFontWeight() {
    return this;
  }
}

class MockSheet {
  constructor() {
    this.cells = new Map();
    this.audit = [];
  }

  key(row, column) {
    return `${row}:${column}`;
  }

  valueAt(row, column) {
    return this.cells.get(this.key(row, column)) ?? "";
  }

  setValue(row, column, value) {
    this.cells.set(this.key(row, column), value);
  }

  getRange(row, column, rowCount, columnCount) {
    return new MockRange(this, row, column, rowCount, columnCount);
  }

  insertColumnsBefore(beforePosition, howMany) {
    const shifted = new Map();
    for (const [key, value] of this.cells.entries()) {
      const [row, column] = key.split(":").map(Number);
      const nextColumn = column >= beforePosition ? column + howMany : column;
      shifted.set(this.key(row, nextColumn), value);
    }
    this.cells = shifted;
    this.audit.push({ type: "insertColumnsBefore", beforePosition, howMany });
    return this;
  }

  getLastRow() {
    let lastRow = 0;
    for (const [key, value] of this.cells.entries()) {
      if (value !== "") lastRow = Math.max(lastRow, Number(key.split(":")[0]));
    }
    return lastRow;
  }

  getLastColumn() {
    let lastColumn = 0;
    for (const [key, value] of this.cells.entries()) {
      if (value !== "") lastColumn = Math.max(lastColumn, Number(key.split(":")[1]));
    }
    return lastColumn;
  }
}

function values(sheet, row, column, columnCount) {
  return sheet.getRange(row, column, 1, columnCount).getValues()[0];
}

const attributionStart = context.ATTRIBUTION_START_COLUMN;
const newHeaders = Array.from(context.ATTRIBUTION_HEADERS);
const legacyHeaders = newHeaders.slice(1, 9);
const liveManualHeaders = [
  "Recebido em", "ID do evento", "Ordem", "Nome Completo", "WhatsApp", "Contato Responde",
  "Prazo de Compra", "Forma de Compra", "Valor de Entrada", "Valor Finan. Pré Aprov.",
  "Interesse em Visita", "Consentimento LGPD", "utm_source", "utm_medium", "utm_campaign",
  "utm_content", "utm_term", "fbclid", "_fbp", "_fbc", "Página de origem", "CAPI enviada",
  "Resposta CAPI", "Status", "Data Contato", "Qualificado?", "Data Visita", "Compareceu?",
  "Proposta?", "Venda?", "Observações", "ID do empreendimento", "Consentimento de medição",
  "Primeira página da sessão", "Referência inicial", "Conteúdo de origem", "CTA de origem",
  "Primeiro acesso em", "Última página antes da conversão", "Versão da atribuição",
  "Versão do consentimento de medição", "Consentimento de medição atualizado em",
  "Versão do consentimento de atendimento", "Consentimento de atendimento em"
];

assert.equal(context.INTEGRATION_VERSION, "growth-v2");
assert.equal(context.META_SHEET_NAME, "Leads Meta Gamboas");
assert.ok(
  appsScript.indexOf("sheet.getRange(row, 1, 1, leadRow.length).setValues([leadRow]);") <
    appsScript.indexOf("var capiResults = sendCapiEvents_(lead);")
);

assert.equal(
  context.inferPropertyId_("https://znempreendimentos.com.br/gamboas/?utm_source=teste"),
  "gamboas"
);
assert.equal(
  context.inferPropertyId_("https://znempreendimentos.com.br/gamboas/unidade-39m.html?utm_source=teste"),
  "gamboas"
);
assert.equal(
  context.inferPropertyId_("https://znempreendimentos.com.br/gamboas/unidade-nao-autorizada.html"),
  ""
);
assert.equal(context.inferPropertyId_("https://znempreendimentos.com.br/"), "");

{
  const lead = {
    fullName: "Pessoa Teste",
    whatsapp: "11987654321",
    consent: true,
    eventId: "lead-test-123",
    website: "",
    formElapsedMs: 2200,
    property_id: "gamboas",
    sourceUrl: "https://znempreendimentos.com.br/gamboas/?utm_source=Meta%20Ads&email=teste%40example.com&content_id=guia#contato",
    firstPageUrl: "https://znempreendimentos.com.br/gamboas/?utm_campaign=Campanha%20Teste&phone=11999999999",
    lastTouchUrl: "https://znempreendimentos.com.br/gamboas/?fbclid=abc.123&name=Pessoa",
    initialReferrer: "https://www.google.com/search?q=apartamento&email=teste%40example.com",
    measurementConsent: "rejected",
    measurementConsentVersion: "measurement-2026-08-19",
    measurementConsentAt: "2026-08-19T10:00:00.000Z",
    attendanceConsentVersion: "privacy-2026-08-19",
    attendanceConsentAt: "2026-08-19T10:01:00.000Z",
    attributionVersion: "growth-v2"
  };

  context.validateLead_(lead);

  assert.equal(
    lead.sourceUrl,
    "https://znempreendimentos.com.br/gamboas/?utm_source=Meta-Ads&content_id=guia"
  );
  assert.equal(
    lead.firstPageUrl,
    "https://znempreendimentos.com.br/gamboas/?utm_campaign=Campanha-Teste"
  );
  assert.equal(
    lead.lastTouchUrl,
    "https://znempreendimentos.com.br/gamboas/?fbclid=abc.123"
  );
  assert.equal(lead.initialReferrer, "https://www.google.com");
  assert.equal(lead.purchaseTimeline, "");
  assert.equal(lead.purchaseMethod, "");
  assert.equal(lead.downPayment, "");
  assert.equal(lead.visitInterest, "");
}

{
  const lead = {
    fullName: "Pessoa Teste",
    whatsapp: "11987654321",
    consent: true,
    eventId: "lead-unit-39m-123",
    website: "",
    formElapsedMs: 2200,
    property_id: "gamboas",
    sourceUrl: "https://znempreendimentos.com.br/gamboas/unidade-39m.html?utm_source=qa_codex#formulario",
    firstPageUrl: "https://znempreendimentos.com.br/gamboas/unidade-39m.html?utm_source=qa_codex",
    lastTouchUrl: "https://znempreendimentos.com.br/gamboas/unidade-39m.html?utm_source=qa_codex",
    measurementConsent: "unknown"
  };

  context.validateLead_(lead);

  assert.equal(
    lead.sourceUrl,
    "https://znempreendimentos.com.br/gamboas/unidade-39m.html?utm_source=qa_codex"
  );
}

assert.throws(
  () => context.validateLead_({
    fullName: "Pessoa Teste",
    whatsapp: "11987654321",
    consent: true,
    eventId: "lead-source-blocked-123",
    website: "",
    formElapsedMs: 2200,
    property_id: "gamboas",
    sourceUrl: "https://znempreendimentos.com.br/gamboas/unidade-nao-autorizada.html",
    firstPageUrl: "https://znempreendimentos.com.br/gamboas/unidade-nao-autorizada.html",
    lastTouchUrl: "https://znempreendimentos.com.br/gamboas/unidade-nao-autorizada.html",
    measurementConsent: "unknown"
  }),
  /INVALID_SOURCE/
);

assert.throws(
  () => context.validateLead_({
    fullName: "Pessoa Teste",
    whatsapp: "11987654321",
    consent: true,
    eventId: "lead-test-spam",
    website: "preenchido",
    property_id: "gamboas",
    sourceUrl: "https://znempreendimentos.com.br/gamboas/"
  }),
  /SPAM_DETECTED/
);

{
  const sheet = new MockSheet();
  const eventId = "lead-order-123";
  context.LockService = {
    getScriptLock: () => ({ waitLock() {}, releaseLock() {} })
  };
  context.getLeadSheet_ = () => sheet;
  context.findEventRow_ = () => 0;
  context.json_ = (data) => data;
  context.sendCapiEvents_ = () => {
    sheet.audit.push({ type: "capi" });
    return { sent: true, details: "HTTP 200" };
  };

  const response = context.doPost({
    postData: {
      contents: JSON.stringify({
        fullName: "Pessoa Teste",
        whatsapp: "11987654321",
        purchaseTimeline: "",
        purchaseMethod: "",
        downPayment: "",
        visitInterest: "",
        consent: true,
        website: "",
        formElapsedMs: 2500,
        eventId,
        property_id: "gamboas",
        sourceUrl: "https://znempreendimentos.com.br/gamboas/",
        firstPageUrl: "https://znempreendimentos.com.br/gamboas/",
        lastTouchUrl: "https://znempreendimentos.com.br/gamboas/",
        measurementConsent: "rejected",
        attributionVersion: "growth-v2"
      })
    }
  });

  const persistedAt = sheet.audit.findIndex(
    (entry) => entry.type === "setValues" && entry.row === 2 && entry.column === 1
  );
  const capiAt = sheet.audit.findIndex((entry) => entry.type === "capi");
  assert.ok(persistedAt >= 0);
  assert.ok(capiAt > persistedAt);
  assert.equal(response.ok, true);
  assert.equal(response.stored, true);
  assert.equal(response.version, "growth-v2");
  assert.equal(response.id, eventId);
  assert.equal(sheet.valueAt(2, 2), eventId);
  assert.equal(sheet.valueAt(2, 3), "");
  assert.equal(sheet.valueAt(2, 6), "");
  assert.equal(sheet.valueAt(2, context.BASE_HEADERS.indexOf("CAPI enviada") + 1), "Sim");

  let capiCalledForDuplicate = false;
  context.findEventRow_ = () => 2;
  context.sendCapiEvents_ = () => {
    capiCalledForDuplicate = true;
    return { sent: true, details: "HTTP 200" };
  };
  const duplicate = context.doPost({
    postData: {
      contents: JSON.stringify({
        fullName: "Pessoa Teste",
        whatsapp: "11987654321",
        consent: true,
        eventId,
        property_id: "gamboas",
        sourceUrl: "https://znempreendimentos.com.br/gamboas/",
        firstPageUrl: "https://znempreendimentos.com.br/gamboas/",
        lastTouchUrl: "https://znempreendimentos.com.br/gamboas/",
        measurementConsent: "rejected"
      })
    }
  });
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.stored, true);
  assert.equal(capiCalledForDuplicate, false);
}

{
  const sheet = new MockSheet();
  const legacyBaseHeaders = Array.from(context.BASE_HEADERS).filter(
    (header) => header !== "Ordem" && header !== "Contato responde"
  );
  const legacyValues = legacyBaseHeaders.map((header) => `valor:${header}`);
  sheet.getRange(1, 1, 1, legacyBaseHeaders.length).setValues([legacyBaseHeaders]);
  sheet.getRange(2, 1, 1, legacyValues.length).setValues([legacyValues]);

  context.ensureBaseHeaders_(sheet);

  assert.deepEqual(values(sheet, 1, 1, context.BASE_HEADERS.length), Array.from(context.BASE_HEADERS));
  assert.equal(sheet.valueAt(2, 3), "");
  assert.equal(sheet.valueAt(2, 6), "");
  assert.equal(sheet.valueAt(2, 4), "valor:Nome completo");
  assert.equal(sheet.valueAt(2, 7), "valor:Prazo de compra");
}

{
  const sheet = new MockSheet();
  sheet.getRange(1, 1, 1, liveManualHeaders.length).setValues([liveManualHeaders]);
  sheet.getRange(2, 1, 1, liveManualHeaders.length).setValues([
    liveManualHeaders.map((_, index) => index === 30 ? "Operação preservada" : "")
  ]);

  context.getLeadSheet_ = () => sheet;
  context.findEventRow_ = () => 0;
  context.sendCapiEvents_ = () => ({ sent: false, details: "CAPI não configurada" });
  const eventId = "lead-live-schema-123";
  const response = context.doPost({
    postData: {
      contents: JSON.stringify({
        fullName: "Pessoa Estrutura Real",
        whatsapp: "11987654321",
        purchaseTimeline: "Em até 3 meses",
        purchaseMethod: "Entrada + financiamento",
        downPayment: "De R$ 30 mil a R$ 60 mil",
        visitInterest: "Sim, nesta semana",
        consent: true,
        website: "",
        formElapsedMs: 2500,
        eventId,
        property_id: "gamboas",
        sourceUrl: "https://znempreendimentos.com.br/gamboas/",
        firstPageUrl: "https://znempreendimentos.com.br/gamboas/",
        lastTouchUrl: "https://znempreendimentos.com.br/gamboas/",
        measurementConsent: "accepted",
        attributionVersion: "growth-v2"
      })
    }
  });

  assert.equal(response.ok, true);
  assert.equal(response.stored, true);
  assert.equal(response.id, eventId);
  assert.equal(sheet.valueAt(3, 2), eventId);
  assert.equal(sheet.valueAt(3, 4), "Pessoa Estrutura Real");
  assert.equal(sheet.valueAt(3, 9), "De R$ 30 mil a R$ 60 mil");
  assert.equal(sheet.valueAt(3, 10), "");
  assert.equal(sheet.valueAt(3, 11), "Sim, nesta semana");
  assert.equal(sheet.valueAt(3, 22), "Não");
  assert.equal(sheet.valueAt(3, 24), "Novo");
  assert.equal(sheet.valueAt(3, 32), "gamboas");
  assert.equal(sheet.valueAt(2, 31), "Operação preservada");
  assert.equal(sheet.audit.filter((entry) => entry.type === "insertColumnsBefore").length, 0);
}

{
  const sheet = new MockSheet();
  const operationValues = ["Novo", "14/08/2026", "Sim", "Não", "", "", "", "Prioridade alta"];
  const legacyValues = [
    "Aceito",
    "https://znempreendimentos.com.br/gamboas/",
    "https://instagram.com/",
    "meta-organico",
    "cabecalho",
    "2026-08-14T10:00:00-03:00",
    "https://znempreendimentos.com.br/gamboas/",
    "growth-v1"
  ];

  sheet.getRange(1, attributionStart, 1, legacyHeaders.length).setValues([legacyHeaders]);
  sheet.getRange(2, context.OPERATION_START_COLUMN, 1, operationValues.length).setValues([operationValues]);
  sheet.getRange(2, attributionStart, 1, legacyValues.length).setValues([legacyValues]);

  context.ensureAttributionHeaders_(sheet);

  assert.deepEqual(values(sheet, 1, attributionStart, newHeaders.length), newHeaders);
  assert.equal(sheet.valueAt(2, attributionStart), "");
  assert.deepEqual(values(sheet, 2, attributionStart + 1, legacyValues.length), legacyValues);
  assert.deepEqual(
    values(sheet, 2, context.OPERATION_START_COLUMN, operationValues.length),
    operationValues
  );
}

{
  const sheet = new MockSheet();
  context.ensureAttributionHeaders_(sheet);
  assert.deepEqual(values(sheet, 1, attributionStart, newHeaders.length), newHeaders);
}

{
  const sheet = new MockSheet();
  const growthV1Headers = newHeaders.slice(0, 9);
  const growthV1Values = [
    "gamboas", "Aceito", "primeira", "referencia", "conteudo", "cta", "data", "ultima", "growth-v1"
  ];
  const rawMetaHeaders = ["id", "created_time", "ad_id", "ad_name"];
  const rawMetaValues = ["lead-1", "2026-08-19", "ad-1", "Anúncio"];
  sheet.getRange(1, attributionStart, 1, growthV1Headers.length).setValues([growthV1Headers]);
  sheet.getRange(2, attributionStart, 1, growthV1Values.length).setValues([growthV1Values]);
  sheet.getRange(1, attributionStart + growthV1Headers.length, 1, rawMetaHeaders.length).setValues([rawMetaHeaders]);
  sheet.getRange(2, attributionStart + growthV1Values.length, 1, rawMetaValues.length).setValues([rawMetaValues]);

  context.ensureAttributionHeaders_(sheet);

  assert.deepEqual(values(sheet, 1, attributionStart, newHeaders.length), newHeaders);
  assert.deepEqual(values(sheet, 2, attributionStart, growthV1Values.length), growthV1Values);
  assert.deepEqual(values(sheet, 2, attributionStart + growthV1Values.length, 4), ["", "", "", ""]);
  assert.deepEqual(values(sheet, 1, attributionStart + newHeaders.length, rawMetaHeaders.length), rawMetaHeaders);
  assert.deepEqual(values(sheet, 2, attributionStart + newHeaders.length, rawMetaValues.length), rawMetaValues);
}

{
  const manualSheet = new MockSheet();
  const metaSheet = new MockSheet();
  manualSheet.getRange(1, 1, 1, liveManualHeaders.length).setValues([liveManualHeaders]);
  manualSheet.getRange(2, 1, 1, liveManualHeaders.length).setValues([
    liveManualHeaders.map((_, index) => index === 3 ? "Lead manual preservado" : "")
  ]);
  context.ensureMetaLeadSchema_(metaSheet, manualSheet);
  const metaLead = {
    id: "987654321",
    created_time: "2026-08-17T12:30:00-03:00",
    form_id: "123456789",
    campaign_id: "campaign-1",
    campaign_name: "GAMBOAS | LEADS | 08-2026",
    adset_id: "adset-1",
    adset_name: "FORM HIGH INTENT | PROSPECCAO",
    ad_id: "ad-1",
    ad_name: "GAMBOAS | FACHADA | OFERTA 295K",
    platform: "instagram",
    is_organic: false,
    field_data: [
      { name: "full_name", values: ["Maria da Silva"] },
      { name: "phone_number", values: ["+55 (11) 99999-0000"] },
      { name: "email", values: ["maria@example.com"] },
      { name: "Em quanto tempo pretende comprar?", values: ["Em até 3 meses"] },
      { name: "Como pretende comprar?", values: ["Entrada + financiamento"] },
      { name: "Possui valor para entrada?", values: ["De R$ 30 mil a R$ 60 mil"] },
      { name: "Gostaria de agendar uma visita?", values: ["Sim, nesta semana"] }
    ]
  };

  context.appendMetaLead_(metaSheet, metaLead);

  const metaColumns = context.headerColumns_(metaSheet);
  const metaColumn = (header) => context.headerColumn_(metaColumns, header);
  assert.deepEqual(
    values(metaSheet, 1, 1, liveManualHeaders.length),
    liveManualHeaders
  );
  assert.equal(manualSheet.getLastRow(), 2);
  assert.equal(manualSheet.valueAt(2, 4), "Lead manual preservado");
  assert.equal(metaSheet.valueAt(2, metaColumn("ID do evento")), "meta-987654321");
  assert.equal(metaSheet.valueAt(2, metaColumn("Ordem")), "");
  assert.equal(metaSheet.valueAt(2, metaColumn("Nome completo")), "Maria da Silva");
  assert.equal(metaSheet.valueAt(2, metaColumn("WhatsApp")), "11999990000");
  assert.equal(metaSheet.valueAt(2, metaColumn("Contato responde")), "");
  assert.equal(metaSheet.valueAt(2, metaColumn("Prazo de compra")), "Em até 3 meses");
  assert.equal(metaSheet.valueAt(2, metaColumn("Forma de compra")), "Entrada + financiamento");
  assert.equal(metaSheet.valueAt(2, metaColumn("Valor de entrada")), "De R$ 30 mil a R$ 60 mil");
  assert.equal(metaSheet.valueAt(2, metaColumn("Interesse em visita")), "Sim, nesta semana");
  assert.equal(metaSheet.valueAt(2, metaColumn("utm_source")), "meta");
  assert.equal(metaSheet.valueAt(2, metaColumn("utm_medium")), "paid_social");
  assert.equal(metaSheet.valueAt(2, metaColumn("Status")), "Novo");
  assert.match(
    metaSheet.valueAt(2, metaColumn("Observações")),
    /Meta lead ID: 987654321/
  );
  assert.equal(metaSheet.valueAt(2, metaColumn("ID do empreendimento")), "gamboas");
  assert.equal(metaSheet.valueAt(2, metaColumn("Referência inicial")), "Meta Instant Form");
  assert.equal(metaSheet.valueAt(2, metaColumn("Versão do consentimento de atendimento")), "meta-form-123456789");
  assert.equal(metaSheet.valueAt(2, metaColumn("Email")), "maria@example.com");
  assert.equal(metaSheet.valueAt(2, metaColumn("Meta Lead ID")), "987654321");
  assert.equal(metaSheet.valueAt(2, metaColumn("Meta Form ID")), "123456789");
  assert.equal(metaSheet.valueAt(2, metaColumn("Meta Campaign ID")), "campaign-1");
  assert.equal(metaSheet.valueAt(2, metaColumn("Meta Ad Set ID")), "adset-1");
  assert.equal(metaSheet.valueAt(2, metaColumn("Meta Ad ID")), "ad-1");
  assert.equal(metaSheet.valueAt(2, metaColumn("Meta Platform")), "instagram");
  assert.equal(metaSheet.valueAt(2, metaColumn("Meta Organic")), "Não");
  assert.ok(metaSheet.valueAt(2, metaColumn("Importado da Meta em")));
  assert.doesNotMatch(
    metaSheet.valueAt(2, metaColumn("Observações")),
    /Maria da Silva|99999-0000|maria@example\.com/
  );

  const knownIds = context.getExistingEventIds_(metaSheet);
  assert.equal(knownIds["meta-987654321"], true);
  context.mergeEventIds_(knownIds, { "lead-manual-1": true });
  assert.equal(knownIds["lead-manual-1"], true);
  assert.equal(context.normalizeMetaKey_("Gostaria de agendar uma visita?"), "gostaria_de_agendar_uma_visita");
}

console.log("Apps Script migration and Meta lead tests passed.");
