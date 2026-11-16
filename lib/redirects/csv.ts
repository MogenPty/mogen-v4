export type CsvRecord = Record<string, string>;

function parseCells(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += character;
    }
  }
  if (quoted) throw new Error("CSV contains an unterminated quoted value.");
  cells.push(cell.trim());
  return cells;
}

export function parseCsv(input: string): CsvRecord[] {
  const lines = input.replace(/^\uFEFF/, "").split(/\r?\n/).filter(line => line.trim());
  if (!lines.length) throw new Error("CSV file is empty.");
  const headers = parseCells(lines[0]).map(header => header.trim());
  if (new Set(headers).size !== headers.length) throw new Error("CSV headers must be unique.");
  return lines.slice(1).map((line, rowIndex) => {
    const cells = parseCells(line);
    if (cells.length !== headers.length) throw new Error(`CSV row ${rowIndex + 2} has the wrong number of columns.`);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });
}

const csvCell = (value: unknown) => {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export function toCsv(headers: string[], rows: Array<Record<string, unknown>>): string {
  return [headers.join(","), ...rows.map(row => headers.map(header => csvCell(row[header])).join(","))].join("\r\n");
}
