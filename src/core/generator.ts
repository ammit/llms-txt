import type { Page, SiteData } from "../types.js";

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

  // Group pages by section
  const sections = groupBySection(site.pages);

  for (const [section, pages] of sections) {
    lines.push(`## ${section}`);
    lines.push("");

    for (const page of pages) {
      const desc = page.description ? `: ${page.description}` : "";
      lines.push(`- [${page.title}](${page.url})${desc}`);
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
