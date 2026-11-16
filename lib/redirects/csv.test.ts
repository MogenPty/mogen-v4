import { describe, expect, it } from "vitest";
import { parseCsv, toCsv } from "./csv";

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
});
