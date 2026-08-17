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

  getLastRow() {
    let lastRow = 0;
    for (const [key, value] of this.cells.entries()) {
      if (value !== "") lastRow = Math.max(lastRow, Number(key.split(":")[0]));
    }
    return lastRow;
  }
}

function values(sheet, row, column, columnCount) {
  return sheet.getRange(row, column, 1, columnCount).getValues()[0];
}

const attributionStart = context.ATTRIBUTION_START_COLUMN;
const newHeaders = Array.from(context.ATTRIBUTION_HEADERS);
const legacyHeaders = newHeaders.slice(1);

assert.equal(
  context.inferPropertyId_("https://znempreendimentos.com.br/gamboas/?utm_source=teste"),
  "gamboas"
);
assert.equal(context.inferPropertyId_("https://znempreendimentos.com.br/"), "");

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
  sheet.getRange(1, 1, 1, context.BASE_HEADERS.length).setValues([Array.from(context.BASE_HEADERS)]);
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
    field_data: [
      { name: "full_name", values: ["Maria da Silva"] },
      { name: "phone_number", values: ["+55 (11) 99999-0000"] },
      { name: "Em quanto tempo pretende comprar?", values: ["Em até 3 meses"] },
      { name: "Como pretende comprar?", values: ["Entrada + financiamento"] },
      { name: "Possui valor para entrada?", values: ["De R$ 30 mil a R$ 60 mil"] },
      { name: "Gostaria de agendar uma visita?", values: ["Sim, nesta semana"] }
    ]
  };

  context.appendMetaLead_(sheet, metaLead);

  assert.equal(sheet.valueAt(2, 2), "meta-987654321");
  assert.equal(sheet.valueAt(2, 3), "Maria da Silva");
  assert.equal(sheet.valueAt(2, 4), "11999990000");
  assert.equal(sheet.valueAt(2, 5), "Em até 3 meses");
  assert.equal(sheet.valueAt(2, 6), "Entrada + financiamento");
  assert.equal(sheet.valueAt(2, 7), "De R$ 30 mil a R$ 60 mil");
  assert.equal(sheet.valueAt(2, 8), "Sim, nesta semana");
  assert.equal(sheet.valueAt(2, 10), "meta");
  assert.equal(sheet.valueAt(2, 11), "paid_social");
  assert.equal(sheet.valueAt(2, context.OPERATION_START_COLUMN), "Novo");
  assert.match(
    sheet.valueAt(2, context.OPERATION_START_COLUMN + context.OPERATION_HEADERS.length - 1),
    /Meta lead ID: 987654321/
  );
  assert.equal(sheet.valueAt(2, attributionStart), "gamboas");
  assert.equal(sheet.valueAt(2, attributionStart + 3), "Meta Instant Form");

  const knownIds = context.getExistingEventIds_(sheet);
  assert.equal(knownIds["meta-987654321"], true);
  assert.equal(context.normalizeMetaKey_("Gostaria de agendar uma visita?"), "gostaria_de_agendar_uma_visita");
}

console.log("Apps Script migration and Meta lead tests passed.");
