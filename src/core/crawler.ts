import { JSDOM } from "jsdom";
import { fetchRobotsTxt, getSitemapUrls } from "./robots.js";
import type { CrawlOptions, CrawlProgress } from "../types.js";

interface CrawlResult {
  url: string;
  html: string;
}

export async function crawl(
  baseUrl: string,
  options: CrawlOptions,
  onProgress?: (progress: CrawlProgress) => void,
): Promise<CrawlResult[]> {
  const robots = await fetchRobotsTxt(baseUrl);
  const visited = new Set<string>();
  const results: CrawlResult[] = [];
  let skipped = 0;
  let queue: { url: string; depth: number }[] = [];

  // Try sitemap first
  onProgress?.({ phase: "discovery", url: baseUrl, fetched: 0, queued: 0, skipped: 0, depth: 0 });

  const sitemapUrls = getSitemapUrls(robots, baseUrl);
  const sitemapPages = await discoverFromSitemaps(sitemapUrls);

  // Always start with the base URL
  queue = [{ url: baseUrl, depth: 0 }];

  if (sitemapPages.length > 0) {
    // Filter sitemap URLs by path depth relative to base URL
    const basePath = new URL(baseUrl).pathname;
    const baseSegments = basePath.split("/").filter(Boolean).length;

    const filtered = sitemapPages.filter((url) => {
      const normalized = normalizeUrl(url);
      if (normalized === normalizeUrl(baseUrl)) return false; // already in queue
      const path = new URL(url).pathname;
      const segments = path.split("/").filter(Boolean).length;
      return segments - baseSegments <= options.depth;
    });

    skipped += sitemapPages.length - filtered.length;

    // Sitemap pages are pre-discovered, don't follow links from them
    queue.push(...filtered.map((url) => ({ url, depth: options.depth })));

    onProgress?.({
      phase: "discovery",
      url: baseUrl,
      fetched: 0,
      queued: queue.length,
      skipped,
      depth: 0,
    });
  }

  while (queue.length > 0) {
    const batch = queue.splice(0, options.concurrency);

    const fetches = batch.map(async ({ url, depth }) => {
      const normalized = normalizeUrl(url);
      if (visited.has(normalized)) {
        skipped++;
        return;
      }
      if (!isAllowed(normalized, robots, baseUrl, options)) {
        skipped++;
        return;
      }
      visited.add(normalized);

      try {
        await rateLimitDelay(options.rate);
        const html = await fetchPage(normalized);
        if (!html) {
          skipped++;
          onProgress?.({
            phase: "crawling",
            url: normalized,
            fetched: results.length,
            queued: queue.length,
            skipped,
            depth,
          });
          return;
        }

        results.push({ url: normalized, html });

        onProgress?.({
          phase: "crawling",
          url: normalized,
          fetched: results.length,
          queued: queue.length,
          skipped,
          depth,
        });

        if (depth < options.depth) {
          const links = extractLinks(html, normalized, baseUrl);
          for (const link of links) {
            if (!visited.has(normalizeUrl(link))) {
              queue.push({ url: link, depth: depth + 1 });
            }
          }
        }
      } catch {
        skipped++;
      }
    });

    await Promise.all(fetches);
  }

  return results;
}

async function discoverFromSitemaps(sitemapUrls: string[]): Promise<string[]> {
  const urls: string[] = [];

  for (const sitemapUrl of sitemapUrls) {
    try {
      const res = await fetch(sitemapUrl);
      if (!res.ok) continue;
      const text = await res.text();

      // Extract URLs from sitemap XML
      const locMatches = text.matchAll(/<loc>(.*?)<\/loc>/g);
      for (const match of locMatches) {
        const url = match[1].trim();
        // Check if it's a nested sitemap
        if (url.endsWith(".xml") || url.endsWith(".xml.gz")) {
          const nested = await discoverFromSitemaps([url]);
          urls.push(...nested);
        } else {
          urls.push(url);
        }
      }
    } catch {
      // Skip inaccessible sitemaps
    }
  }

  return urls;
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "llms-txt/0.1 (+https://github.com/ammit/llms-txt)",
        Accept: "text/html",
      },
    });

    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return null;

    return await res.text();
  } catch {
    return null;
  }
}

function extractLinks(
  html: string,
  pageUrl: string,
  baseUrl: string,
): string[] {
  const dom = new JSDOM(html, { url: pageUrl });
  const anchors = dom.window.document.querySelectorAll("a[href]");
  const links: string[] = [];
  const base = new URL(baseUrl);

  for (const anchor of anchors) {
    try {
      const href = anchor.getAttribute("href");
      if (!href) continue;
      const resolved = new URL(href, pageUrl);

      // Same origin only, no fragments, no query params for dedup
      if (resolved.hostname !== base.hostname) continue;
      if (resolved.protocol !== "http:" && resolved.protocol !== "https:")
        continue;

      resolved.hash = "";
      links.push(resolved.href);
    } catch {
      // Skip invalid URLs
    }
  }

  return links;
}

function normalizeUrl(url: string): string {
  const u = new URL(url);
  u.hash = "";
  // Remove trailing slash for consistency (except root)
  if (u.pathname !== "/" && u.pathname.endsWith("/")) {
    u.pathname = u.pathname.slice(0, -1);
  }
  return u.href;
}

function isAllowed(
  url: string,
  robots: { isAllowed: (url: string) => boolean | undefined },
  baseUrl: string,
  options: CrawlOptions,
): boolean {
  // Check robots.txt
  if (robots.isAllowed(url) === false) return false;

  // Check include/exclude patterns
  const path = new URL(url).pathname;
  const base = new URL(baseUrl).hostname;
  const urlHost = new URL(url).hostname;

  if (urlHost !== base) return false;

  if (options.include.length > 0) {
    if (!options.include.some((pattern) => matchGlob(path, pattern)))
      return false;
  }

  if (options.exclude.length > 0) {
    if (options.exclude.some((pattern) => matchGlob(path, pattern)))
      return false;
  }

  return true;
}

function matchGlob(path: string, pattern: string): boolean {
  const regex = pattern
    .replace(/\*\*/g, "{{DOUBLE}}")
    .replace(/\*/g, "[^/]*")
    .replace(/{{DOUBLE}}/g, ".*");
  return new RegExp(`^${regex}$`).test(path);
}

let lastRequestTime = 0;

async function rateLimitDelay(rate: number): Promise<void> {
  const minInterval = 1000 / rate;
  const now = Date.now();
  const elapsed = now - lastRequestTime;

  if (elapsed < minInterval) {
    await new Promise((resolve) => setTimeout(resolve, minInterval - elapsed));
  }

  lastRequestTime = Date.now();
}
