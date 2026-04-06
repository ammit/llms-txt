import robotsParser from "robots-parser";

export async function fetchRobotsTxt(
  baseUrl: string,
): Promise<ReturnType<typeof robotsParser>> {
  const robotsUrl = new URL("/robots.txt", baseUrl).href;

  try {
    const res = await fetch(robotsUrl);
    if (!res.ok) {
      return robotsParser(robotsUrl, "");
    }
    const text = await res.text();
    return robotsParser(robotsUrl, text);
  } catch {
    return robotsParser(robotsUrl, "");
  }
}

export function getSitemapUrls(
  robots: ReturnType<typeof robotsParser>,
  baseUrl: string,
): string[] {
  const sitemaps = robots.getSitemaps();
  if (sitemaps.length > 0) {
    // Resolve relative sitemap paths against the base URL
    return sitemaps.map((s) => new URL(s, baseUrl).href);
  }
  return [new URL("/sitemap.xml", baseUrl).href];
}
