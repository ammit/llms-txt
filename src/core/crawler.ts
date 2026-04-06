import { JSDOM } from "jsdom";
import { fetchRobotsTxt, getSitemapUrls } from "./robots.js";
import type { CrawlOptions, CrawlProgress } from "../types.js";

interface CrawlResult {
  url: string;
  html: string;
}

const MAX_CONTENT_LENGTH = 10 * 1024 * 1024; // 10MB

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const MAX_RETRIES = 2; // 3 total attempts
const BACKOFF_BASE_MS = 1000;

/**
 * Fetch with retry logic for transient network errors.
 * Retries up to MAX_RETRIES times with exponential backoff.
 */
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  verbose: boolean,
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      const res = await fetch(url, init);

      if (RETRYABLE_STATUS_CODES.has(res.status) && attempt <= MAX_RETRIES) {
        if (verbose) console.error(`[retry] attempt ${attempt + 1}/${MAX_RETRIES + 1}: ${url}`);
        await new Promise((resolve) => setTimeout(resolve, BACKOFF_BASE_MS * Math.pow(2, attempt - 1)));
        continue;
      }

      return res;
    } catch (err) {
      lastError = err;

      // Don't retry timeout aborts (user-initiated or AbortSignal.timeout)
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      if (err instanceof DOMException && err.name === "TimeoutError") throw err;

      if (attempt <= MAX_RETRIES) {
        if (verbose) console.error(`[retry] attempt ${attempt + 1}/${MAX_RETRIES + 1}: ${url}`);
        await new Promise((resolve) => setTimeout(resolve, BACKOFF_BASE_MS * Math.pow(2, attempt - 1)));
        continue;
      }
    }
  }

  throw lastError;
}

// Regex matching common locale path prefixes like /en/, /de, /zh-cn/, /pt-br etc.
const LOCALE_PREFIX_RE = /^\/([a-z]{2}(?:-[a-z]{2,4})?)(?:\/|$)/i;

/**
 * Extract locale code from a URL path, if present.
 * Returns lowercase locale string or null.
 */
function extractLocale(urlPath: string): string | null {
  const match = urlPath.match(LOCALE_PREFIX_RE);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Strip locale prefix from a URL path to get the "canonical" path.
 * e.g. /de/guides/routing -> /guides/routing
 */
function stripLocale(urlPath: string): string {
  return urlPath.replace(LOCALE_PREFIX_RE, "/");
}

/**
 * Auto-detect the default language from the homepage HTML by reading <html lang="...">.
 */
async function detectLanguage(baseUrl: string, timeout: number): Promise<string | null> {
  try {
    const html = await fetchPage(baseUrl, timeout, false);
    if (!html) return null;
    const match = html.match(/<html[^>]*\slang=["']([^"']+)["']/i);
    if (match) {
      // Normalize: "en-US" -> "en"
      return match[1].split("-")[0].toLowerCase();
    }
  } catch {
    // Ignore errors
  }
  return null;
}

export async function crawl(
  baseUrl: string,
  options: CrawlOptions,
  onProgress?: (progress: CrawlProgress) => void,
  signal?: AbortSignal,
): Promise<CrawlResult[]> {
  const robots = await fetchRobotsTxt(baseUrl);
  const visited = new Set<string>();
  const results: CrawlResult[] = [];
  let skipped = 0;
  let queue: { url: string; depth: number }[] = [];

  // Resolve language filter: explicit --lang, auto-detect, or none
  let langFilter = options.lang?.toLowerCase() ?? null;
  if (!langFilter) {
    const detected = await detectLanguage(baseUrl, options.timeout);
    if (detected) {
      langFilter = detected;
      if (options.verbose) console.error(`[lang] auto-detected language: ${detected}`);
    }
  } else if (options.verbose) {
    console.error(`[lang] using explicit language filter: ${langFilter}`);
  }

  // Track canonical paths we've already seen (after stripping locale) for dedup
  const seenCanonicalPaths = new Set<string>();

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

    let filtered = sitemapPages.filter((url) => {
      const normalized = normalizeUrl(url);
      if (normalized === normalizeUrl(baseUrl)) return false; // already in queue
      const path = new URL(url).pathname;
      const segments = path.split("/").filter(Boolean).length;
      if (segments - baseSegments > options.depth) return false;

      // Locale filtering for sitemap URLs
      if (langFilter) {
        const locale = extractLocale(path);
        if (locale && locale !== langFilter) return false;
      }

      return true;
    });

    skipped += sitemapPages.length - filtered.length;

    // Cap sitemap URLs to avoid crawling enormous sitemaps
    if (filtered.length > MAX_SITEMAP_URLS) {
      console.error(`[warn] sitemap returned ${filtered.length} URLs after filtering, truncating to ${MAX_SITEMAP_URLS}`);
      skipped += filtered.length - MAX_SITEMAP_URLS;
      filtered = filtered.slice(0, MAX_SITEMAP_URLS);
    }

    // Also respect --max-pages for sitemap URLs (reserve 1 slot for base URL)
    if (options.maxPages > 0 && filtered.length > options.maxPages - 1) {
      skipped += filtered.length - (options.maxPages - 1);
      filtered = filtered.slice(0, options.maxPages - 1);
    }

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
    if (signal?.aborted) {
      break;
    }

    if (options.maxPages > 0 && results.length >= options.maxPages) {
      if (options.verbose) console.error(`[info] max pages limit reached (${options.maxPages})`);
      break;
    }

    const batch = queue.splice(0, options.concurrency);

    const fetches = batch.map(async ({ url, depth }) => {
      const normalized = normalizeUrl(url);
      if (visited.has(normalized)) {
        skipped++;
        if (options.verbose) console.error(`[skip] duplicate: ${normalized}`);
        return;
      }

      const skipReason = getSkipReason(normalized, robots, baseUrl, options);
      if (skipReason) {
        skipped++;
        if (options.verbose) console.error(`[skip] ${skipReason}: ${normalized}`);
        return;
      }

      // Locale filtering
      const urlPath = new URL(normalized).pathname;
      const locale = extractLocale(urlPath);
      if (langFilter) {
        // If URL has a locale prefix that doesn't match the filter, skip it
        if (locale && locale !== langFilter) {
          skipped++;
          if (options.verbose) console.error(`[skip] locale ${locale} (want ${langFilter}): ${normalized}`);
          return;
        }
        // Deduplicate: if we've already seen this canonical path, skip
        const canonical = stripLocale(urlPath);
        if (seenCanonicalPaths.has(canonical)) {
          skipped++;
          if (options.verbose) console.error(`[skip] locale duplicate: ${normalized}`);
          return;
        }
        seenCanonicalPaths.add(canonical);
      }

      visited.add(normalized);

      try {
        await rateLimitDelay(options.rate);
        const html = await fetchPage(normalized, options.timeout, options.verbose, signal);
        if (!html) {
          skipped++;
          if (options.verbose) console.error(`[skip] non-HTML or failed: ${normalized}`);
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

        // Check maxPages limit within concurrent batch
        if (options.maxPages > 0 && results.length >= options.maxPages) {
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

/**
 * Decode common XML/HTML entities found in sitemap URLs.
 * Sitemaps often contain &amp; instead of & in <loc> tags.
 */
function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/** Common binary file signatures (magic bytes as string prefixes). */
const BINARY_SIGNATURES = ["%PDF", "\x89PNG", "GIF8", "\xFF\xD8\xFF", "PK"];

/**
 * Check if content looks like binary data by inspecting the first few bytes.
 */
function isBinaryContent(text: string): boolean {
  const head = text.slice(0, 8);
  return BINARY_SIGNATURES.some((sig) => head.startsWith(sig));
}

/** Maximum HTML size (5MB) before skipping extraction to avoid OOM in JSDOM. */
export const MAX_HTML_SIZE = 5 * 1024 * 1024;

/** Maximum number of URLs to keep from sitemap discovery after filtering. */
const MAX_SITEMAP_URLS = 1000;

async function discoverFromSitemaps(
  sitemapUrls: string[],
  visited: Set<string> = new Set(),
): Promise<string[]> {
  const urls: string[] = [];

  for (const sitemapUrl of sitemapUrls) {
    // Cycle detection: skip sitemaps we've already visited
    if (visited.has(sitemapUrl)) continue;
    visited.add(sitemapUrl);

    try {
      const res = await fetch(sitemapUrl, {
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) continue;
      const text = await res.text();

      // Extract URLs from sitemap XML
      const locMatches = text.matchAll(/<loc>(.*?)<\/loc>/g);
      for (const match of locMatches) {
        const url = decodeXmlEntities(match[1].trim());
        // Check if it's a nested sitemap
        if (url.endsWith(".xml") || url.endsWith(".xml.gz")) {
          const nested = await discoverFromSitemaps([url], visited);
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

async function fetchPage(url: string, timeout: number, verbose: boolean, abortSignal?: AbortSignal): Promise<string | null> {
  try {
    // Combine timeout and abort signals
    const timeoutSignal = AbortSignal.timeout(timeout);
    const signal = abortSignal
      ? AbortSignal.any([timeoutSignal, abortSignal])
      : timeoutSignal;

    const res = await fetchWithRetry(
      url,
      {
        headers: {
          "User-Agent": "llms-txt/0.1 (+https://github.com/ammit/llms-txt)",
          Accept: "text/html",
        },
        signal,
      },
      verbose,
    );

    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return null;

    // Skip pages larger than 10MB (likely binary files misserved as text/html)
    const contentLength = res.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_CONTENT_LENGTH) {
      if (verbose) console.error(`[skip] content too large (${contentLength} bytes): ${url}`);
      return null;
    }

    // Read body with a size cap to avoid OOM on massive pages
    const reader = res.body?.getReader();
    if (!reader) return await res.text();

    const chunks: Uint8Array[] = [];
    let totalSize = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalSize += value.byteLength;
      if (totalSize > MAX_CONTENT_LENGTH) {
        reader.cancel();
        if (verbose) console.error(`[skip] body exceeded 10MB while reading: ${url}`);
        return null;
      }
      chunks.push(value);
    }

    const decoder = new TextDecoder();
    const text = chunks.map((c) => decoder.decode(c, { stream: true })).join("") + decoder.decode();

    // Skip binary content misserved as text/html (e.g. PDFs, PNGs, ZIPs)
    if (isBinaryContent(text)) {
      if (verbose) console.error(`[skip] binary content detected: ${url}`);
      return null;
    }

    return text;
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      if (verbose) console.error(`[skip] timeout: ${url}`);
    }
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
      resolved.search = "";
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
  u.search = "";
  // Remove trailing slash for consistency (except root)
  if (u.pathname !== "/" && u.pathname.endsWith("/")) {
    u.pathname = u.pathname.slice(0, -1);
  }
  // Strip index files (index.html, index.htm, index.php) to parent path
  u.pathname = u.pathname.replace(/\/index\.(html|htm|php)$/, "/");
  // Normalize trailing slash again after index strip
  if (u.pathname !== "/" && u.pathname.endsWith("/")) {
    u.pathname = u.pathname.slice(0, -1);
  }
  // Strip common extensions for dedup (.html, .htm, .php)
  u.pathname = u.pathname.replace(/\.(html|htm|php)$/, "");
  return u.href;
}

function isAllowed(
  url: string,
  robots: { isAllowed: (url: string) => boolean | undefined },
  baseUrl: string,
  options: CrawlOptions,
): boolean {
  return getSkipReason(url, robots, baseUrl, options) === null;
}

function getSkipReason(
  url: string,
  robots: { isAllowed: (url: string) => boolean | undefined },
  baseUrl: string,
  options: CrawlOptions,
): string | null {
  // Check robots.txt
  if (robots.isAllowed(url) === false) return "robots.txt blocked";

  // Check include/exclude patterns
  const path = new URL(url).pathname;
  const base = new URL(baseUrl).hostname;
  const urlHost = new URL(url).hostname;

  if (urlHost !== base) return "excluded";

  if (options.include.length > 0) {
    if (!options.include.some((pattern) => matchGlob(path, pattern)))
      return "excluded";
  }

  if (options.exclude.length > 0) {
    if (options.exclude.some((pattern) => matchGlob(path, pattern)))
      return "excluded";
  }

  return null;
}

function matchGlob(path: string, pattern: string): boolean {
  const regex = pattern
    .replace(/\*\*/g, "{{DOUBLE}}")
    .replace(/\*/g, "[^/]*")
    .replace(/{{DOUBLE}}/g, ".*");
  return new RegExp(`^${regex}$`).test(path);
}

/**
 * Promise-based rate limiter that is safe with concurrent requests.
 * Ensures at most `rate` requests per second by chaining through a single promise.
 */
let rateLimitChain: Promise<void> = Promise.resolve();

async function rateLimitDelay(rate: number): Promise<void> {
  const minInterval = 1000 / rate;

  const waitForSlot = rateLimitChain.then(
    () => new Promise<void>((resolve) => setTimeout(resolve, minInterval)),
  );

  rateLimitChain = waitForSlot;
  await waitForSlot;
}
