import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import type { Page } from "../types.js";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});

turndown.use(gfm);

// Remove images to keep markdown lean
turndown.addRule("images", {
  filter: "img",
  replacement: () => "",
});

export function extract(
  url: string,
  html: string,
  minContentLength: number = 50,
): Page | null {
  const dom = new JSDOM(html, { url });
  const doc = dom.window.document;

  // Skip pages with meta http-equiv="refresh" (redirect pages)
  const metaRefresh = doc.querySelector('meta[http-equiv="refresh" i]');
  if (metaRefresh) return null;

  // Get metadata before Readability mutates the DOM
  const title = getTitle(doc);
  const description = getDescription(doc);

  // Skip if title indicates a redirect
  if (title && /redirect/i.test(title)) return null;

  // Skip if both title and description are empty
  if (!title && !description) return null;

  // Skip pages with very little body text (e.g. "Loading..." or "Redirecting...")
  const bodyText = doc.body?.textContent?.trim() || "";
  if (bodyText.length < minContentLength) return null;

  const section = deriveSection(url);

  // Extract main content with Readability
  const reader = new Readability(doc);
  const article = reader.parse();

  if (!article || !article.content) return null;

  // Convert to markdown
  const markdown = turndown
    .turndown(article.content)
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!markdown) return null;

  // Skip pages with too little extracted content
  if (markdown.length < minContentLength) return null;

  const fallbackDescription = extractFirstSentence(markdown);

  return {
    url,
    title: article.title || title,
    description,
    fallbackDescription,
    markdown,
    section,
  };
}

export function extractFirstSentence(markdown: string): string {
  const lines = markdown.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines, headings, and very short lines
    if (!trimmed) continue;
    if (trimmed.startsWith("#")) continue;
    if (trimmed.length < 20) continue;

    // Take the first sentence (up to first period followed by space or end)
    const sentenceMatch = trimmed.match(/^(.+?\.)\s/);
    const sentence = sentenceMatch ? sentenceMatch[1] : trimmed;

    // Truncate to ~150 chars
    if (sentence.length > 150) {
      return sentence.slice(0, 147) + "...";
    }

    return sentence;
  }

  return "";
}

function getTitle(doc: Document): string {
  const ogTitle = doc
    .querySelector('meta[property="og:title"]')
    ?.getAttribute("content");
  if (ogTitle) return ogTitle.trim();

  const h1 = doc.querySelector("h1");
  if (h1?.textContent) return h1.textContent.trim();

  const title = doc.querySelector("title");
  if (title?.textContent) return title.textContent.trim();

  return "";
}

function getDescription(doc: Document): string {
  const metaDesc = doc
    .querySelector('meta[name="description"]')
    ?.getAttribute("content");
  if (metaDesc) return metaDesc.trim();

  const ogDesc = doc
    .querySelector('meta[property="og:description"]')
    ?.getAttribute("content");
  if (ogDesc) return ogDesc.trim();

  return "";
}

// Well-known path prefix -> section name mappings
const SECTION_MAP: Record<string, string> = {
  docs: "Documentation",
  documentation: "Documentation",
  doc: "Documentation",
  blog: "Blog",
  posts: "Blog",
  articles: "Blog",
  news: "Blog",
  api: "API Reference",
  reference: "API Reference",
  guide: "Guides",
  guides: "Guides",
  tutorial: "Guides",
  tutorials: "Guides",
  changelog: "Changelog",
  releases: "Changelog",
  faq: "FAQ",
  about: "About",
  team: "About",
  contact: "About",
};

function isYearSegment(segment: string): boolean {
  return /^20\d{2}$/.test(segment);
}

export function deriveSection(url: string): string {
  const pathname = new URL(url).pathname;
  // Strip common file extensions before splitting
  const cleanPath = pathname.replace(/\.(html|htm|php)$/, "");
  const parts = cleanPath.split("/").filter(Boolean);

  if (parts.length === 0) return "Home";

  // Top-level pages (single segment like /about) go to Home
  if (parts.length === 1) return "Home";

  const first = parts[0].toLowerCase();

  // Date-based paths (e.g. /2025/03/31/post-title) -> Blog
  if (isYearSegment(first)) return "Blog";

  // Known prefix mapping
  if (SECTION_MAP[first]) return SECTION_MAP[first];

  // Default: capitalize first segment
  return formatSection(parts[0]);
}

/**
 * If all non-homepage pages ended up in "Home", try regrouping using
 * the second path segment. If still all "Home", return pages with
 * empty section so the generator can list them without a header.
 */
export function regroupFlatSections(pages: Page[]): Page[] {
  const nonHome = pages.filter((p) => {
    const pathname = new URL(p.url).pathname;
    const cleanPath = pathname.replace(/\.(html|htm|php)$/, "");
    const parts = cleanPath.split("/").filter(Boolean);
    return parts.length > 0;
  });

  // Check if all non-homepage pages are in "Home"
  const allHome =
    nonHome.length > 0 && nonHome.every((p) => p.section === "Home");
  if (!allHome) return pages;

  // Try second segment grouping
  const regrouped = pages.map((p) => {
    const pathname = new URL(p.url).pathname;
    const cleanPath = pathname.replace(/\.(html|htm|php)$/, "");
    const parts = cleanPath.split("/").filter(Boolean);

    if (parts.length < 2) return p;

    const second = parts[1].toLowerCase();
    if (isYearSegment(second)) return { ...p, section: "Blog" };
    if (SECTION_MAP[second]) return { ...p, section: SECTION_MAP[second] };
    return { ...p, section: formatSection(parts[1]) };
  });

  // If still all Home after regrouping, remove section headers
  const regroupedNonHome = regrouped.filter((p) => {
    const pathname = new URL(p.url).pathname;
    const parts = pathname.split("/").filter(Boolean);
    return parts.length > 0;
  });
  const stillAllHome = regroupedNonHome.every((p) => p.section === "Home");
  if (stillAllHome) {
    return regrouped.map((p) =>
      p.section === "Home" ? { ...p, section: "" } : p,
    );
  }

  return regrouped;
}

function formatSection(segment: string): string {
  return segment
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
