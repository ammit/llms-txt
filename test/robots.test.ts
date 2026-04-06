import { describe, it, expect } from "vitest";
import robotsParser from "robots-parser";
import { getSitemapUrls } from "../src/core/robots.js";

describe("getSitemapUrls", () => {
  it("returns sitemaps from robots.txt when present", () => {
    const robots = robotsParser(
      "https://example.com/robots.txt",
      "User-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml\nSitemap: https://example.com/sitemap-blog.xml"
    );
    const urls = getSitemapUrls(robots, "https://example.com");
    expect(urls).toEqual([
      "https://example.com/sitemap.xml",
      "https://example.com/sitemap-blog.xml",
    ]);
  });

  it("falls back to /sitemap.xml when robots has no sitemaps", () => {
    const robots = robotsParser(
      "https://example.com/robots.txt",
      "User-agent: *\nAllow: /"
    );
    const urls = getSitemapUrls(robots, "https://example.com");
    expect(urls).toEqual(["https://example.com/sitemap.xml"]);
  });

  it("falls back to /sitemap.xml when robots.txt is empty", () => {
    const robots = robotsParser("https://example.com/robots.txt", "");
    const urls = getSitemapUrls(robots, "https://example.com");
    expect(urls).toEqual(["https://example.com/sitemap.xml"]);
  });

  it("resolves relative sitemap paths against the base URL", () => {
    const robots = robotsParser(
      "https://example.com/robots.txt",
      "User-agent: *\nAllow: /\nSitemap: /sitemaps/main.xml"
    );
    const urls = getSitemapUrls(robots, "https://example.com");
    expect(urls).toEqual(["https://example.com/sitemaps/main.xml"]);
  });
});
