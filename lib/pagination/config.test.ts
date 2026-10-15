import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_PAGINATION_PAGE_SIZE,
  getPaginationSettings,
} from "@/lib/pagination/config";

const KEYS = [
  "PAGINATION_PAGE_SIZE",
  "PAGINATION_STYLE",
  "PAGINATION_ENDS",
  "PAGINATION_ARTICLES_PAGE_SIZE",
] as const;

afterEach(() => {
  for (const key of KEYS) delete process.env[key];
});

describe("pagination config — defaults", () => {
  it("defaults to 12 per page, condensed, disabled", () => {
    expect(getPaginationSettings({})).toEqual({
      pageSize: 12,
      style: "condensed",
      ends: "disabled",
    });
    expect(DEFAULT_PAGINATION_PAGE_SIZE).toBe(12);
  });
});

describe("pagination config — page size", () => {
  it("reads PAGINATION_PAGE_SIZE", () => {
    expect(
      getPaginationSettings({ PAGINATION_PAGE_SIZE: "6" })
        .pageSize,
    ).toBe(6);
  });

  it("rejects invalid page sizes back to the default", () => {
    for (const raw of ["0", "-3", "abc", "2.5", ""]) {
      expect(
        getPaginationSettings({ PAGINATION_PAGE_SIZE: raw })
          .pageSize,
      ).toBe(DEFAULT_PAGINATION_PAGE_SIZE);
    }
  });

  it("lets a section override the global page size", () => {
    expect(
      getPaginationSettings(
        {
          PAGINATION_PAGE_SIZE: "12",
          PAGINATION_ARTICLES_PAGE_SIZE: "6",
        },
        "articles",
      ).pageSize,
    ).toBe(6);
  });

  it("falls back to the global size when the section override is invalid", () => {
    expect(
      getPaginationSettings(
        {
          PAGINATION_PAGE_SIZE: "6",
          PAGINATION_ARTICLES_PAGE_SIZE: "bogus",
        },
        "articles",
      ).pageSize,
    ).toBe(6);
  });
});

describe("pagination config — style and ends", () => {
  it("accepts justified style, defaults anything else to condensed", () => {
    expect(
      getPaginationSettings({ PAGINATION_STYLE: "justified" })
        .style,
    ).toBe("justified");
    expect(
      getPaginationSettings({ PAGINATION_STYLE: "CoMpAcT" })
        .style,
    ).toBe("condensed");
  });

  it("accepts smart ends, defaults anything else to disabled", () => {
    expect(
      getPaginationSettings({ PAGINATION_ENDS: "smart" })
        .ends,
    ).toBe("smart");
    expect(
      getPaginationSettings({ PAGINATION_ENDS: "hidden" })
        .ends,
    ).toBe("disabled");
  });

  it("reads the live process.env by default", () => {
    process.env.PAGINATION_PAGE_SIZE = "9";
    process.env.PAGINATION_STYLE = "justified";
    process.env.PAGINATION_ENDS = "smart";
    expect(getPaginationSettings()).toEqual({
      pageSize: 9,
      style: "justified",
      ends: "smart",
    });
  });
});
