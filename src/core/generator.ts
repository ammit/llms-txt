import type { Page, SiteData } from "../types.js";
import { regroupFlatSections } from "./extractor.js";

// Section sort priority (lower = earlier). Unlisted sections get 500.
const SECTION_ORDER: Record<string, number> = {
  Home: 100,
  Documentation: 200,
  Guides: 210,
  "API Reference": 300,
  Blog: 400,
  Changelog: 450,
  FAQ: 460,
  About: 900,
};

function sectionSortKey(name: string): number {
  return SECTION_ORDER[name] ?? 500;
}

export function generateLlmsTxt(site: SiteData): string {
  const lines: string[] = [];

  // H1 with site name
  lines.push(`# ${site.name}`);
  lines.push("");

  // Blockquote summary
  if (site.description) {
    lines.push(`> ${site.description}`);
    lines.push("");
  }

  // Regroup flat sites that would all land in "Home"
  const pages = regroupFlatSections(site.pages);

  // Detect generic descriptions (appearing on >30% of pages)
  const genericDescriptions = findGenericDescriptions(pages);

  // Group pages by section, then sort sections
  const sections = groupBySection(pages);
  const sortedSections = sortSections(sections);

  for (const [section, sectionPages] of sortedSections) {
    // Empty section name means flat site, skip header
    if (section) {
      lines.push(`## ${section}`);
      lines.push("");
    }

    for (const page of sectionPages) {
      const desc = pickDescription(page, genericDescriptions);
      const suffix = desc ? `: ${desc}` : "";
      lines.push(`- [${page.title}](${page.url})${suffix}`);
    }

    lines.push("");
  }

  return lines.join("\n").trim() + "\n";
}

export function generateLlmsFullTxt(site: SiteData): string {
  const lines: string[] = [];

  // H1 with site name
  lines.push(`# ${site.name}`);
  lines.push("");

  if (site.description) {
    lines.push(`> ${site.description}`);
    lines.push("");
  }

  // Concatenate all page content
  for (const page of site.pages) {
    lines.push("---");
    lines.push("");
    lines.push(`## ${page.title}`);
    lines.push("");
    lines.push(`Source: ${page.url}`);
    lines.push("");
    lines.push(page.markdown);
    lines.push("");
  }

  return lines.join("\n").trim() + "\n";
}

export function generateJson(site: SiteData): string {
  return JSON.stringify(
    {
      name: site.name,
      description: site.description,
      url: site.url,
      pages: site.pages.map((p) => ({
        url: p.url,
        title: p.title,
        description: p.description,
        section: p.section,
      })),
    },
    null,
    2,
  );
}

function groupBySection(pages: Page[]): Map<string, Page[]> {
  const sections = new Map<string, Page[]>();

  for (const page of pages) {
    const existing = sections.get(page.section) || [];
    existing.push(page);
    sections.set(page.section, existing);
  }

  return sections;
}

function sortSections(
  sections: Map<string, Page[]>,
): [string, Page[]][] {
  return [...sections.entries()].sort(([a], [b]) => {
    const orderA = sectionSortKey(a);
    const orderB = sectionSortKey(b);
    if (orderA !== orderB) return orderA - orderB;
    return a.localeCompare(b);
  });
}


/**
 * Find descriptions that appear on more than 30% of pages.
 * These are likely site-wide generic meta descriptions.
 */
function findGenericDescriptions(pages: Page[]): Set<string> {
  if (pages.length === 0) return new Set();

  const counts = new Map<string, number>();
  for (const page of pages) {
    if (!page.description) continue;
    const count = counts.get(page.description) || 0;
    counts.set(page.description, count + 1);
  }

  const threshold = Math.max(2, pages.length * 0.3);
  const generic = new Set<string>();
  for (const [desc, count] of counts) {
    if (count >= threshold) {
      generic.add(desc);
    }
  }

  return generic;
}

/**
 * Pick the best description for a page.
 * If the meta description is generic (site-wide), use the fallback instead.
 */
function pickDescription(page: Page, genericDescriptions: Set<string>): string {
  const metaDesc = page.description;

  // If meta description is missing or generic, use fallback
  if (!metaDesc || genericDescriptions.has(metaDesc)) {
    return page.fallbackDescription || "";
  }

  return metaDesc;
}
