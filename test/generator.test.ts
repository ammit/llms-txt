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
    const page = makePage({ description: "" });
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
