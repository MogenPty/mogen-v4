import { describe, expect, it } from "vitest";
import {
  MOGEN_DESTINATION_PATH,
  MOGEN_CAMPAIGN,
  getCampaignDefinition,
  getCampaignLink,
  getCampaignLinks,
} from "@/data/campaigns";
import {
  buildCampaignLinkUrl,
  buildCampaignUrl,
  toAbsoluteCampaignUrl,
} from "./campaign";

describe("buildCampaignUrl — required parameters", () => {
  it("produces the correct UTM parameters for source/medium/campaign", () => {
    const url = buildCampaignUrl({
      path: MOGEN_DESTINATION_PATH,
      source: "whatsapp",
      medium: "organic_social",
      campaign: "sprout-launch-2026",
    });
    const [pathname, query] = url.split("?");
    expect(pathname).toBe("/promotions/mogen-sprout-first-100");
    const params = new URLSearchParams(query);
    expect(params.get("utm_source")).toBe("whatsapp");
    expect(params.get("utm_medium")).toBe("organic_social");
    expect(params.get("utm_campaign")).toBe("sprout-launch-2026");
  });
});

describe("buildCampaignUrl — content parameter", () => {
  it("includes utm_content when supplied", () => {
    const url = buildCampaignUrl({
      path: MOGEN_DESTINATION_PATH,
      source: "whatsapp",
      medium: "organic_social",
      campaign: "sprout-launch-2026",
      content: "whatsapp-catalog",
    });
    expect(new URLSearchParams(url.split("?")[1]).get("utm_content")).toBe(
      "whatsapp-catalog",
    );
  });
});

describe("buildCampaignUrl — optional parameters", () => {
  it("includes utm_term and utm_id when supplied", () => {
    const url = buildCampaignUrl({
      path: MOGEN_DESTINATION_PATH,
      source: "whatsapp",
      medium: "organic_social",
      campaign: "sprout-launch-2026",
      content: "whatsapp-status",
      term: "seed-audience",
      id: "123",
    });
    const params = new URLSearchParams(url.split("?")[1]);
    expect(params.get("utm_term")).toBe("seed-audience");
    expect(params.get("utm_id")).toBe("123");
  });
});

describe("buildCampaignUrl — empty optional parameters", () => {
  it("omits undefined/empty optional values", () => {
    const url = buildCampaignUrl({
      path: MOGEN_DESTINATION_PATH,
      source: "whatsapp",
      medium: "organic_social",
      campaign: "sprout-launch-2026",
      content: undefined,
      term: "",
      id: "   ",
    });
    const params = new URLSearchParams(url.split("?")[1]);
    expect(params.has("utm_content")).toBe(false);
    expect(params.has("utm_term")).toBe(false);
    expect(params.has("utm_id")).toBe(false);
    // Required values are still present.
    expect(params.get("utm_source")).toBe("whatsapp");
  });
});

describe("buildCampaignUrl — encoding", () => {
  it("URL-encodes values with spaces or special characters", () => {
    const url = buildCampaignUrl({
      path: MOGEN_DESTINATION_PATH,
      source: "my source",
      medium: "organic_social",
      campaign: "a b&c",
    });
    const params = new URLSearchParams(url.split("?")[1]);
    expect(params.get("utm_source")).toBe("my source");
    expect(params.get("utm_campaign")).toBe("a b&c");
    // Raw string must not contain a literal space or a second query separator.
    expect(url).not.toContain(" ");
    expect(url).toContain("utm_source=my+source");
    expect(url).toContain("utm_campaign=a+b%26c");
  });
});

describe("buildCampaignUrl — destination path", () => {
  it("keeps /promotions/mogen-sprout-first-100 as the destination path", () => {
    const url = buildCampaignUrl({
      path: "/promotions/mogen-sprout-first-100",
      source: "qr",
      medium: "offline",
      campaign: "sprout-launch-2026",
      content: "flyer",
    });
    expect(url.startsWith("/promotions/mogen-sprout-first-100?")).toBe(true);
  });

  it("never invents service/promotion enquiry context", () => {
    const url = buildCampaignUrl({
      path: MOGEN_DESTINATION_PATH,
      source: "qr",
      medium: "offline",
      campaign: "sprout-launch-2026",
      content: "flyer",
    });
    const params = new URLSearchParams(url.split("?")[1]);
    expect(params.has("service")).toBe(false);
    expect(params.has("promotion")).toBe(false);
  });
});

describe("buildCampaignUrl — existing query strings", () => {
  it("merges with an existing query string via URLSearchParams", () => {
    const url = buildCampaignUrl({
      path: "/promotions/mogen-sprout-first-100?ref=partner",
      source: "qr",
      medium: "offline",
      campaign: "sprout-launch-2026",
      content: "flyer",
    });
    expect(url).toContain("?");
    expect(url.indexOf("?")).toBe(url.lastIndexOf("?"));
    const params = new URLSearchParams(url.split("?")[1]);
    expect(params.get("ref")).toBe("partner");
    expect(params.get("utm_source")).toBe("qr");
    expect(params.get("utm_content")).toBe("flyer");
  });

  it("clears stale optional UTMs when the input omits them", () => {
    const url = buildCampaignUrl({
      path: "/promotions/mogen-sprout-first-100?ref=partner&utm_content=stale&utm_term=stale&utm_id=stale",
      source: "qr",
      medium: "offline",
      campaign: "sprout-launch-2026",
    });
    const params = new URLSearchParams(url.split("?")[1]);
    expect(params.get("ref")).toBe("partner");
    expect(params.has("utm_content")).toBe(false);
    expect(params.has("utm_term")).toBe(false);
    expect(params.has("utm_id")).toBe(false);
    expect(params.get("utm_source")).toBe("qr");
  });

  it("overwrites a stale optional UTM when the input supplies it", () => {
    const url = buildCampaignUrl({
      path: "/promotions/mogen-sprout-first-100?utm_content=stale",
      source: "qr",
      medium: "offline",
      campaign: "sprout-launch-2026",
      content: "flyer",
    });
    expect(new URLSearchParams(url.split("?")[1]).get("utm_content")).toBe(
      "flyer",
    );
  });
});

describe("buildCampaignUrl — relative paths only", () => {
  it.each([
    "https://evil.com/promotions/mogen-sprout-first-100",
    "http://evil.com/promotions/mogen-sprout-first-100",
    "HTTPS://evil.com/promotions/mogen-sprout-first-100",
    "//evil.com/promotions/mogen-sprout-first-100",
  ])("rejects untrusted destination %s", (path) => {
    expect(() =>
      buildCampaignUrl({
        path,
        source: "qr",
        medium: "offline",
        campaign: "sprout-launch-2026",
      }),
    ).toThrow(/must be relative/);
  });
});

describe("getCampaignDefinition — prototype safety", () => {
  it("returns undefined for inherited property names", () => {
    expect(getCampaignDefinition("toString")).toBeUndefined();
    expect(getCampaignDefinition("constructor")).toBeUndefined();
    expect(getCampaignDefinition("hasOwnProperty")).toBeUndefined();
    expect(getCampaignLinks("toString")).toEqual([]);
    expect(getCampaignLink("toString", "whatsapp-catalog")).toBeUndefined();
  });

  it("still returns the registered campaign", () => {
    expect(getCampaignDefinition("sprout-launch-2026")).toBe(MOGEN_CAMPAIGN);
  });
});

describe("sprout-launch-2026 campaign links", () => {
  const expected: Record<string, string> = {
    "whatsapp-catalog":
      "/promotions/mogen-sprout-first-100?utm_source=whatsapp&utm_medium=organic_social&utm_campaign=sprout-launch-2026&utm_content=whatsapp-catalog",
    "whatsapp-status":
      "/promotions/mogen-sprout-first-100?utm_source=whatsapp&utm_medium=organic_social&utm_campaign=sprout-launch-2026&utm_content=whatsapp-status",
    "instagram-profile":
      "/promotions/mogen-sprout-first-100?utm_source=instagram&utm_medium=organic_social&utm_campaign=sprout-launch-2026&utm_content=profile",
    "facebook-post":
      "/promotions/mogen-sprout-first-100?utm_source=facebook&utm_medium=organic_social&utm_campaign=sprout-launch-2026&utm_content=post",
    "tiktok-profile":
      "/promotions/mogen-sprout-first-100?utm_source=tiktok&utm_medium=organic_social&utm_campaign=sprout-launch-2026&utm_content=profile",
    "google-business-profile":
      "/promotions/mogen-sprout-first-100?utm_source=google&utm_medium=organic&utm_campaign=sprout-launch-2026&utm_content=business-profile",
    "qr-flyer":
      "/promotions/mogen-sprout-first-100?utm_source=qr&utm_medium=offline&utm_campaign=sprout-launch-2026&utm_content=flyer",
  };

  it.each(Object.entries(expected))(
    "reproduces the %s link from centralized definitions",
    (key, expectedUrl) => {
      const link = getCampaignLink("sprout-launch-2026", key);
      expect(link).toBeDefined();
      const url = buildCampaignLinkUrl(link!, MOGEN_CAMPAIGN.destinationPath);
      expect(url).toBe(expectedUrl);
    },
  );

  it("derives the destination from the central promotion slug (no duplication)", () => {
    expect(MOGEN_CAMPAIGN.destinationPath).toBe(
      "/promotions/mogen-sprout-first-100",
    );
    expect(MOGEN_CAMPAIGN.id).toBe("sprout-launch-2026");
    expect(MOGEN_CAMPAIGN.name).toBe("sprout-launch-2026");
  });
});

describe("toAbsoluteCampaignUrl", () => {
  it("prefixes the canonical site URL without hardcoding a domain", () => {
    const relative = buildCampaignLinkUrl(
      getCampaignLink("sprout-launch-2026", "qr-flyer")!,
      MOGEN_CAMPAIGN.destinationPath,
    );
    const absolute = toAbsoluteCampaignUrl(relative);
    expect(absolute.startsWith("https://www.mogen.co.za/promotions/")).toBe(true);
    expect(absolute).toContain("utm_campaign=sprout-launch-2026");
  });
});
