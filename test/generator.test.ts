import { describe, it, expect } from "vitest";
import {
  generateLlmsTxt,
  generateLlmsFullTxt,
  generateJson,
} from "../src/core/generator.js";
import type { SiteData, Page } from "../src/types.js";

function makePage(overrides: Partial<Page> = {}): Page {
  return {
    url: "https://example.com/docs/intro",
    title: "Introduction",
    description: "Getting started guide",
    fallbackDescription: "Welcome to the docs.",
    markdown: "# Introduction\n\nWelcome to the docs.",
    section: "Docs",
    ...overrides,
  };
}

function makeSite(overrides: Partial<SiteData> = {}): SiteData {
  return {
    url: "https://example.com",
    name: "Example",
    description: "An example site",
    pages: [makePage()],
    ...overrides,
  };
}

describe("generateLlmsTxt", () => {
  it("produces valid llms.txt with a single page", () => {
    const result = generateLlmsTxt(makeSite());
    expect(result).toContain("# Example");
    expect(result).toContain("> An example site");
    expect(result).toContain("## Docs");
    expect(result).toContain(
      "- [Introduction](https://example.com/docs/intro): Getting started guide"
    );
    expect(result.endsWith("\n")).toBe(true);
  });

  it("omits description blockquote when site has no description", () => {
    const result = generateLlmsTxt(makeSite({ description: "" }));
    expect(result).not.toContain(">");
  });

  it("omits page description when page has none", () => {
    const page = makePage({ description: "", fallbackDescription: "" });
    const result = generateLlmsTxt(makeSite({ pages: [page] }));
    expect(result).toContain("- [Introduction](https://example.com/docs/intro)");
    expect(result).not.toContain(": Getting started");
  });

  it("groups pages by section", () => {
    const pages = [
      makePage({ section: "Docs", title: "Intro", url: "https://example.com/docs/intro" }),
      makePage({ section: "Docs", title: "API", url: "https://example.com/docs/api" }),
      makePage({ section: "Blog", title: "Post 1", url: "https://example.com/blog/post-1" }),
    ];
    const result = generateLlmsTxt(makeSite({ pages }));
    expect(result).toContain("## Docs");
    expect(result).toContain("## Blog");
    // Docs section should have two entries
    const docsIndex = result.indexOf("## Docs");
    const blogIndex = result.indexOf("## Blog");
    expect(docsIndex).toBeLessThan(blogIndex);
    const docsSection = result.slice(docsIndex, blogIndex);
    expect(docsSection).toContain("[Intro]");
    expect(docsSection).toContain("[API]");
  });

  it("handles empty pages array", () => {
    const result = generateLlmsTxt(makeSite({ pages: [] }));
    expect(result).toContain("# Example");
    expect(result).not.toContain("##");
  });
});

describe("description deduplication", () => {
  it("uses fallback when most pages share the same description", () => {
    const genericDesc = "Generic site description repeated everywhere";
    const pages = [
      makePage({ title: "Page A", url: "https://example.com/a", description: genericDesc, fallbackDescription: "Unique content about A." }),
      makePage({ title: "Page B", url: "https://example.com/b", description: genericDesc, fallbackDescription: "Unique content about B." }),
      makePage({ title: "Page C", url: "https://example.com/c", description: genericDesc, fallbackDescription: "Unique content about C." }),
      makePage({ title: "Page D", url: "https://example.com/d", description: "A unique description", fallbackDescription: "Fallback for D." }),
    ];
    const result = generateLlmsTxt(makeSite({ pages }));
    // Generic description (on 75% of pages) should be replaced with fallbacks
    expect(result).not.toContain(genericDesc);
    expect(result).toContain("Unique content about A.");
    expect(result).toContain("Unique content about B.");
    // Page D has a unique description, should keep it
    expect(result).toContain("A unique description");
  });

  it("keeps descriptions when they are all unique", () => {
    const pages = [
      makePage({ title: "Page A", url: "https://example.com/a", description: "Desc A", fallbackDescription: "Fallback A" }),
      makePage({ title: "Page B", url: "https://example.com/b", description: "Desc B", fallbackDescription: "Fallback B" }),
    ];
    const result = generateLlmsTxt(makeSite({ pages }));
    expect(result).toContain("Desc A");
    expect(result).toContain("Desc B");
    expect(result).not.toContain("Fallback");
  });

  it("omits description entirely when both meta and fallback are empty", () => {
    const pages = [
      makePage({ title: "Page A", url: "https://example.com/a", description: "", fallbackDescription: "" }),
    ];
    const result = generateLlmsTxt(makeSite({ pages }));
    expect(result).toContain("- [Page A](https://example.com/a)");
    // No colon after the link (no description suffix)
    expect(result).not.toMatch(/\[Page A\]\(https:\/\/example\.com\/a\):/);
  });
});

describe("generateLlmsFullTxt", () => {
  it("includes page markdown content", () => {
    const result = generateLlmsFullTxt(makeSite());
    expect(result).toContain("# Example");
    expect(result).toContain("> An example site");
    expect(result).toContain("---");
    expect(result).toContain("## Introduction");
    expect(result).toContain("Source: https://example.com/docs/intro");
    expect(result).toContain("Welcome to the docs.");
    expect(result.endsWith("\n")).toBe(true);
  });

  it("concatenates multiple pages with separators", () => {
    const pages = [
      makePage({ title: "Page A", markdown: "Content A" }),
      makePage({ title: "Page B", markdown: "Content B", url: "https://example.com/docs/b" }),
    ];
    const result = generateLlmsFullTxt(makeSite({ pages }));
    expect(result).toContain("## Page A");
    expect(result).toContain("Content A");
    expect(result).toContain("## Page B");
    expect(result).toContain("Content B");
    // Two separators for two pages
    const separators = result.match(/^---$/gm);
    expect(separators).toHaveLength(2);
  });

  it("handles empty pages array", () => {
    const result = generateLlmsFullTxt(makeSite({ pages: [] }));
    expect(result).toContain("# Example");
    expect(result).not.toContain("---");
  });
});

describe("generateJson", () => {
  it("produces valid JSON with expected fields", () => {
    const result = generateJson(makeSite());
    const parsed = JSON.parse(result);
    expect(parsed.name).toBe("Example");
    expect(parsed.description).toBe("An example site");
    expect(parsed.url).toBe("https://example.com");
    expect(parsed.pages).toHaveLength(1);
    expect(parsed.pages[0]).toEqual({
      url: "https://example.com/docs/intro",
      title: "Introduction",
      description: "Getting started guide",
      section: "Docs",
    });
  });

  it("does not include markdown in JSON output", () => {
    const result = generateJson(makeSite());
    const parsed = JSON.parse(result);
    expect(parsed.pages[0]).not.toHaveProperty("markdown");
  });

  it("handles empty pages", () => {
    const result = generateJson(makeSite({ pages: [] }));
    const parsed = JSON.parse(result);
    expect(parsed.pages).toEqual([]);
  });

  it("handles multiple pages", () => {
    const pages = [
      makePage({ title: "A", section: "Docs" }),
      makePage({ title: "B", section: "Blog", url: "https://example.com/blog/b" }),
    ];
    const result = generateJson(makeSite({ pages }));
    const parsed = JSON.parse(result);
    expect(parsed.pages).toHaveLength(2);
  });
});
