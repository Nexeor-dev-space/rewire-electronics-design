export type CsvCell = string | number;

export interface CsvSection {
  title: string;
  columns: readonly string[];
  rows: readonly (readonly CsvCell[])[];
}

const LINE_BREAK = "\r\n";
/** Excel reads a file without this as the wrong encoding, which breaks any Arabic or accented name. */
const UTF8_BOM = "﻿";
const PLAIN_NUMBER = /^-?\d+(\.\d+)?$/;
const FORMULA_START = /^[=+\-@\t\r]/;
const NEEDS_QUOTES = /[",\r\n]/;

function csvCell(cell: CsvCell): string {
  if (typeof cell === "number") return String(cell);
  // A spreadsheet runs a cell starting with these as a formula, and names here are typed by people.
  const safe = FORMULA_START.test(cell) && !PLAIN_NUMBER.test(cell) ? `'${cell}` : cell;
  return NEEDS_QUOTES.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

function csvLine(cells: readonly CsvCell[]): string {
  return cells.map(csvCell).join(",");
}

/** Title rows, then each section under its own heading, the way a spreadsheet reader expects to skim it. */
export function toCsv(titleRows: readonly (readonly CsvCell[])[], sections: readonly CsvSection[]): string {
  const lines = titleRows.map(csvLine);
  for (const section of sections) {
    lines.push("", csvLine([section.title]), csvLine(section.columns), ...section.rows.map(csvLine));
  }
  return lines.join(LINE_BREAK) + LINE_BREAK;
}

export function csvHasRows(sections: readonly CsvSection[]): boolean {
  return sections.some((section) => section.rows.length > 0);
}

export function downloadCsv(filename: string, csv: string): void {
  const url = URL.createObjectURL(new Blob([UTF8_BOM, csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
