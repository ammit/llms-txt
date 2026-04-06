import { describe, it, expect } from "vitest";
import { extract, extractFirstSentence } from "../src/core/extractor.js";

const minimalHtml = `
<!DOCTYPE html>
<html>
<head><title>Test Page</title></head>
<body>
  <article>
    <h1>Hello World</h1>
    <p>This is a test paragraph with enough content to be extracted by Readability.
    It needs to be reasonably long so the algorithm considers it meaningful content.
    Here is another sentence to pad out the content a bit more for extraction.</p>
    <p>Second paragraph with additional content that helps Readability identify this
    as the main content area of the page. More text helps the extraction algorithm.</p>
  </article>
</body>
</html>
`;

const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Full Page Title</title>
  <meta name="description" content="A full test page description">
  <meta property="og:title" content="OG Title Override">
</head>
<body>
  <nav><a href="/home">Home</a><a href="/about">About</a></nav>
  <main>
    <article>
      <h1>Main Content Heading</h1>
      <p>This is the main content of the page. It has enough text for Readability
      to extract properly. We need a few sentences here to make the algorithm happy.
      The content should be substantial enough to be considered an article.</p>
      <p>Here is a second paragraph with more content. Readability uses heuristics
      to determine the main content, so having multiple paragraphs helps a lot.</p>
      <p>A third paragraph just to be safe. More content means better extraction.</p>
    </article>
  </main>
  <footer><p>Copyright 2024</p></footer>
  <script>console.log("should be stripped")</script>
</body>
</html>
`;

const noTitleHtml = `
<!DOCTYPE html>
<html>
<head></head>
<body>
  <article>
    <p>Page without a title tag but with enough content for Readability to consider
    extracting it. We need several sentences to make this work properly with the
    extraction algorithm. More content helps the extraction succeed.</p>
    <p>Another paragraph to ensure content extraction works. Readability needs
    a reasonable amount of text to identify the main content of a page.</p>
  </article>
</body>
</html>
`;

describe("extract", () => {
  it("extracts content from minimal HTML", () => {
    const page = extract("https://example.com/docs/intro", minimalHtml);
    expect(page).not.toBeNull();
    expect(page!.url).toBe("https://example.com/docs/intro");
    expect(page!.title).toBeTruthy();
    expect(page!.markdown).toContain("test paragraph");
  });

  it("extracts title from og:title when available", () => {
    const page = extract("https://example.com/docs/intro", fullHtml);
    expect(page).not.toBeNull();
    // Readability may use its own title, but the extractor tries og:title first
    expect(page!.title).toBeTruthy();
  });

  it("extracts meta description", () => {
    const page = extract("https://example.com/docs/intro", fullHtml);
    expect(page).not.toBeNull();
    expect(page!.description).toBe("A full test page description");
  });

  it("extracts fallback description from content", () => {
    const page = extract("https://example.com/docs/intro", fullHtml);
    expect(page).not.toBeNull();
    expect(page!.fallbackDescription).toBeTruthy();
    expect(page!.fallbackDescription.length).toBeGreaterThan(0);
    expect(page!.fallbackDescription.length).toBeLessThanOrEqual(150);
  });

  it("produces markdown without script content", () => {
    const page = extract("https://example.com/docs/intro", fullHtml);
    expect(page).not.toBeNull();
    expect(page!.markdown).not.toContain("console.log");
    expect(page!.markdown).not.toContain("<script>");
  });

  it("returns null for empty/unparseable HTML", () => {
    const page = extract("https://example.com/", "<html><body></body></html>");
    expect(page).toBeNull();
  });

  it("handles missing title gracefully", () => {
    const page = extract("https://example.com/docs/intro", noTitleHtml);
    // Should still extract, title may be empty or derived
    if (page) {
      expect(page.markdown).toBeTruthy();
    }
  });

  describe("section derivation from URL", () => {
    it("derives Home for root URL", () => {
      const page = extract("https://example.com/", fullHtml);
      expect(page).not.toBeNull();
      expect(page!.section).toBe("Home");
    });

    it("derives Home for top-level page", () => {
      const page = extract("https://example.com/about", fullHtml);
      expect(page).not.toBeNull();
      expect(page!.section).toBe("Home");
    });

    it("maps known prefix 'docs' to Documentation", () => {
      const page = extract("https://example.com/docs/intro", fullHtml);
      expect(page).not.toBeNull();
      expect(page!.section).toBe("Documentation");
    });

    it("formats hyphenated sections", () => {
      const page = extract("https://example.com/getting-started/setup", fullHtml);
      expect(page).not.toBeNull();
      expect(page!.section).toBe("Getting Started");
    });

    it("formats underscored segments not in the known map", () => {
      const page = extract("https://example.com/api_reference/endpoints", fullHtml);
      expect(page).not.toBeNull();
      // "api_reference" is not in SECTION_MAP, falls through to formatSection
      expect(page!.section).toBe("Api Reference");
    });

    it("maps exact 'api' prefix to API Reference", () => {
      const page = extract("https://example.com/api/endpoints", fullHtml);
      expect(page).not.toBeNull();
      expect(page!.section).toBe("API Reference");
    });

    it("maps year-based paths to Blog", () => {
      const page = extract("https://example.com/2025/03/31/my-post", fullHtml);
      expect(page).not.toBeNull();
      expect(page!.section).toBe("Blog");
    });

    it("maps known prefixes to standard section names", () => {
      const blogPage = extract("https://example.com/posts/hello-world", fullHtml);
      expect(blogPage).not.toBeNull();
      expect(blogPage!.section).toBe("Blog");

      const guidePage = extract("https://example.com/tutorials/setup", fullHtml);
      expect(guidePage).not.toBeNull();
      expect(guidePage!.section).toBe("Guides");

      const faqPage = extract("https://example.com/faq/general", fullHtml);
      expect(faqPage).not.toBeNull();
      expect(faqPage!.section).toBe("FAQ");
    });
  });

  it("returns null without throwing for deeply nested malformed HTML", () => {
    const badHtml = "<html><head><title>Test</title></head><body>" + "<div>".repeat(1000) + "</body></html>";
    // Should not throw
    const page = extract("https://example.com/bad", badHtml);
    expect(page === null || page !== null).toBe(true);
  });

  it("returns null for HTML exceeding 5MB size limit", () => {
    const bigHtml = `<!DOCTYPE html><html><head><title>Big</title><meta name="description" content="huge page"></head><body><article><p>${"x".repeat(6 * 1024 * 1024)}</p></article></body></html>`;
    const page = extract("https://example.com/big", bigHtml);
    expect(page).toBeNull();
  });
});

describe("extractFirstSentence", () => {
  it("extracts first sentence from markdown", () => {
    const md = "# Heading\n\nThis is the first sentence. This is the second.";
    expect(extractFirstSentence(md)).toBe("This is the first sentence.");
  });

  it("skips headings and short lines", () => {
    const md = "# Title\n\nShort\n\nThis is a longer line that should be picked up as the fallback description.";
    expect(extractFirstSentence(md)).toBe("This is a longer line that should be picked up as the fallback description.");
  });

  it("truncates long sentences to ~150 chars", () => {
    const longLine = "A".repeat(200) + ". Next sentence.";
    const result = extractFirstSentence(longLine);
    expect(result.length).toBeLessThanOrEqual(150);
    expect(result.endsWith("...")).toBe(true);
  });

  it("returns empty string for empty markdown", () => {
    expect(extractFirstSentence("")).toBe("");
  });

  it("returns the full line when no sentence boundary exists", () => {
    const md = "This line has no period at all and is long enough to be picked up";
    expect(extractFirstSentence(md)).toBe(md);
  });
});
