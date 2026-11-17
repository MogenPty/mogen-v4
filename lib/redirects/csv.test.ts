import { describe, expect, it } from "vitest";
import { csvRecordLine, importedDescription, parseCsv, spreadsheetSafeDescription, toCsv } from "./csv";

describe("redirect CSV", () => {
  it("parses quoted commas and escaped quotes", () => {
    expect(parseCsv('sourcePath,destinationPath,description\n/old,/new,"Moved, because ""legacy"""')).toEqual([
      { sourcePath: "/old", destinationPath: "/new", description: 'Moved, because "legacy"' },
    ]);
  });

  it("rejects malformed row lengths", () => {
    expect(() => parseCsv("sourcePath,destinationPath\n/old")).toThrow(/row 2/i);
  });

  it("round trips wildcard rows safely", () => {
    const csv = toCsv(["sourcePath", "destinationPath"], [{ sourcePath: "/blog/*", destinationPath: "/articles/*" }]);
    expect(parseCsv(csv)[0]).toEqual({ sourcePath: "/blog/*", destinationPath: "/articles/*" });
  });

  it.each(["\n", "\r\n"])("parses multiline quoted fields with %j rows", newline => {
    const records = parseCsv(`sourcePath,destinationPath,description${newline}/old,/new,"first${newline}second"${newline}/later,/final,ok`);
    expect(records[0]?.description).toBe(`first${newline}second`);
    expect(csvRecordLine(records[1]!, 0)).toBe(4);
  });

  it("protects spreadsheet formulas without changing imported descriptions", () => {
    expect(spreadsheetSafeDescription("=HYPERLINK(\"bad\")")).toBe("'=HYPERLINK(\"bad\")");
    expect(importedDescription("'=HYPERLINK(\"bad\")")).toBe("=HYPERLINK(\"bad\")");
  });
});
