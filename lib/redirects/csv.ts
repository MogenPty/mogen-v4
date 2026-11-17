export type CsvRecord = Record<string, string>;

type CsvRow = { cells: string[]; line: number };
const recordLines = new WeakMap<CsvRecord, number>();

function tokenizeCsv(input: string): CsvRow[] {
  const rows: CsvRow[] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let quotedCell = false;
  let line = 1;
  let rowLine = 1;

  const pushCell = () => {
    row.push(quotedCell ? cell : cell.trim());
    cell = "";
    quotedCell = false;
  };
  const pushRow = () => {
    pushCell();
    if (row.some(value => value.length > 0)) rows.push({ cells: row, line: rowLine });
    row = [];
    rowLine = line + 1;
  };

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (character === '"') {
      if (quoted && input[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (quoted) {
        quoted = false;
      } else if (cell.length === 0) {
        quoted = true;
        quotedCell = true;
      } else {
        throw new Error(`CSV row ${line} contains an unexpected quote.`);
      }
      continue;
    }
    if (character === "," && !quoted) {
      pushCell();
      continue;
    }
    if ((character === "\r" || character === "\n") && !quoted) {
      if (character === "\r" && input[index + 1] === "\n") index += 1;
      pushRow();
      line += 1;
      continue;
    }
    if (character === "\r" || character === "\n") {
      if (character === "\r" && input[index + 1] === "\n") {
        cell += "\r\n";
        index += 1;
      } else {
        cell += character;
      }
      line += 1;
      continue;
    }
    cell += character;
  }

  if (quoted) throw new Error(`CSV row ${rowLine} contains an unterminated quoted value.`);
  if (cell.length > 0 || row.length > 0) pushRow();
  return rows;
}

export function csvRecordLine(record: CsvRecord, fallback: number): number {
  return recordLines.get(record) ?? fallback;
}

export function parseCsv(input: string): CsvRecord[] {
  const rows = tokenizeCsv(input.replace(/^\uFEFF/, ""));
  if (!rows.length) throw new Error("CSV file is empty.");
  const headers = rows[0].cells.map(header => header.trim());
  if (new Set(headers).size !== headers.length) throw new Error("CSV headers must be unique.");
  return rows.slice(1).map(row => {
    if (row.cells.length !== headers.length) throw new Error(`CSV row ${row.line} has the wrong number of columns.`);
    const record = Object.fromEntries(headers.map((header, index) => [header, row.cells[index] ?? ""]));
    recordLines.set(record, row.line);
    return record;
  });
}

export function spreadsheetSafeDescription(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

export function importedDescription(value: string): string {
  return /^'[=+\-@]/.test(value) ? value.slice(1) : value;
}

const csvCell = (value: unknown) => {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export function toCsv(headers: string[], rows: Array<Record<string, unknown>>): string {
  return [headers.join(","), ...rows.map(row => headers.map(header => csvCell(row[header])).join(","))].join("\r\n");
}
