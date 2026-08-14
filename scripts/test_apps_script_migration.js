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

console.log("Apps Script migration tests passed.");
