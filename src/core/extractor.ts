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

export function extract(url: string, html: string): Page | null {
  const dom = new JSDOM(html, { url });
  const doc = dom.window.document;

  // Get metadata before Readability mutates the DOM
  const title = getTitle(doc);
  const description = getDescription(doc);
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

  return {
    url,
    title: article.title || title,
    description,
    markdown,
    section,
  };
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

function deriveSection(url: string): string {
  const pathname = new URL(url).pathname;
  const parts = pathname.split("/").filter(Boolean);

  if (parts.length === 0) return "Home";

  // Use first path segment as section, strip file extensions
  const segment = parts[0].replace(/\.[^.]+$/, "");
  if (parts.length === 1 && pathname === `/${parts[0]}`) {
    // Top-level page (e.g., /about.html) goes to Home
    return "Home";
  }

  return formatSection(segment);
}

function formatSection(segment: string): string {
  return segment
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
