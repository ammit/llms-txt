import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { mkdirSync } from "node:fs";
import ora from "ora";
import { crawl } from "../core/crawler.js";
import { extract } from "../core/extractor.js";
import {
  generateLlmsTxt,
  generateLlmsFullTxt,
  generateJson,
} from "../core/generator.js";
import type { GenerateOptions, Page, SiteData, CrawlProgress } from "../types.js";

export async function generate(
  url: string,
  options: GenerateOptions,
): Promise<void> {
  const baseUrl = ensureProtocol(url);

  // Validate URL before crawling
  try {
    const parsed = new URL(baseUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      console.error(`Invalid URL: ${url}. Please provide a valid http/https URL.`);
      process.exit(2);
    }
  } catch {
    console.error(`Invalid URL: ${url}. Please provide a valid http/https URL.`);
    process.exit(2);
  }

  const startTime = Date.now();

  // Set up abort controller for graceful shutdown
  const abortController = new AbortController();
  let interrupted = false;

  const onSigint = () => {
    interrupted = true;
    abortController.abort();
  };
  process.on("SIGINT", onSigint);

  // Crawl
  const spinner = options.quiet
    ? null
    : ora(`Discovering pages on ${baseUrl}`).start();

  let lastSkipped = 0;
  const crawlResults = await crawl(
    baseUrl,
    options,
    (progress: CrawlProgress) => {
      lastSkipped = progress.skipped;
      if (!spinner) return;
      if (progress.phase === "discovery") {
        if (progress.queued > 0) {
          spinner.text = `Found ${progress.queued} pages in sitemap (${progress.skipped} filtered by depth)`;
        } else {
          spinner.text = `Discovering pages on ${baseUrl}`;
        }
      } else {
        const path = new URL(progress.url).pathname;
        spinner.text = `Crawling [${progress.fetched} done, ${progress.queued} queued, ${progress.skipped} skipped] ${path}`;
      }
    },
    abortController.signal,
  );

  // Clean up the SIGINT listener so the top-level handler takes over again
  process.removeListener("SIGINT", onSigint);

  if (interrupted) {
    spinner?.warn(`Interrupted after crawling ${crawlResults.length} pages`);
  } else {
    spinner?.succeed(`Crawled ${crawlResults.length} pages`);
  }

  // Extract
  const extractSpinner = options.quiet
    ? null
    : ora("Extracting content").start();
  const pages: Page[] = [];

  for (const result of crawlResults) {
    const page = extract(result.url, result.html, options.minContentLength, options.verbose);
    if (page) pages.push(page);
  }

  extractSpinner?.succeed(`Extracted ${pages.length} pages`);

  if (options.verbose) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`\nVerbose summary:`);
    console.error(`  Fetched:   ${crawlResults.length}`);
    console.error(`  Skipped:   ${lastSkipped}`);
    console.error(`  Extracted: ${pages.length}`);
    console.error(`  Time:      ${elapsed}s\n`);
  }

  if (pages.length === 0) {
    if (interrupted) {
      console.error("Interrupted before any pages could be extracted.");
      process.exit(130);
    }
    console.error("No pages could be extracted. Check the URL and try again.");
    process.exit(1);
  }

  if (interrupted) {
    console.error(`Interrupted. Generated partial output from ${pages.length} pages.`);
  }

  // Build site data
  const site = buildSiteData(baseUrl, pages);

  // Generate output
  if (options.json) {
    const json = generateJson(site);
    output(json, options.output ? withExtension(options.output, ".json") : undefined);
    if (!options.quiet) printSummary(site, json);
    return;
  }

  const llmsTxt = generateLlmsTxt(site);
  output(llmsTxt, options.output);

  if (options.full) {
    const fullTxt = generateLlmsFullTxt(site);
    const fullPath = options.output
      ? withSuffix(options.output, "-full")
      : undefined;
    output(fullTxt, fullPath);
  }

  if (!options.quiet) printSummary(site, llmsTxt);
}

function printSummary(site: SiteData, content: string): void {
  const pageCount = site.pages.length;
  const sections = new Set(site.pages.map((p) => p.section));
  const sectionCount = sections.size;
  const sizeKB = (Buffer.byteLength(content, "utf-8") / 1024).toFixed(1);
  console.error(`Generated: ${pageCount} pages, ${sectionCount} sections, ${sizeKB} KB`);
}

function ensureProtocol(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://${url}`;
}

function buildSiteData(baseUrl: string, pages: Page[]): SiteData {
  const hostname = new URL(baseUrl).hostname.replace(/^www\./, "");

  // Try to get site name from homepage
  const homepage = pages.find((p) => {
    const path = new URL(p.url).pathname;
    return path === "/" || path === "";
  });

  return {
    url: baseUrl,
    name: homepage?.title || formatHostname(hostname),
    description: homepage?.description || "",
    pages: pages.sort((a, b) => a.url.localeCompare(b.url)),
  };
}

function formatHostname(hostname: string): string {
  const parts = hostname.split(".");
  const name = parts[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function output(content: string, filePath?: string): void {
  if (filePath) {
    const resolved = resolve(filePath);
    mkdirSync(dirname(resolved), { recursive: true });
    writeFileSync(resolved, content, "utf-8");
    console.log(`  Written to ${resolved}`);
  } else {
    process.stdout.write(content);
  }
}

function withSuffix(filePath: string, suffix: string): string {
  const dot = filePath.lastIndexOf(".");
  if (dot === -1) return filePath + suffix;
  return filePath.slice(0, dot) + suffix + filePath.slice(dot);
}

function withExtension(filePath: string, ext: string): string {
  const dot = filePath.lastIndexOf(".");
  if (dot === -1) return filePath + ext;
  return filePath.slice(0, dot) + ext;
}
