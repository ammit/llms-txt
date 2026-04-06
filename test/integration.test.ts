import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer, type Server } from "node:http";
import { extract } from "../src/core/extractor.js";
import {
  generateLlmsTxt,
  generateLlmsFullTxt,
  generateJson,
} from "../src/core/generator.js";
import type { Page, SiteData } from "../src/types.js";

const pages: Record<string, string> = {
  "/": `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Test Site</title>
      <meta name="description" content="A site for testing llms-txt">
    </head>
    <body>
      <main>
        <article>
          <h1>Welcome to Test Site</h1>
          <p>This is the homepage of our test site. It has enough content for
          Readability to extract properly. We need several sentences here.</p>
          <p>Second paragraph on the homepage with additional content to help
          the extraction algorithm identify this as main content.</p>
          <a href="/docs/getting-started">Getting Started</a>
          <a href="/blog/first-post">Blog</a>
        </article>
      </main>
    </body>
    </html>
  `,
  "/docs/getting-started": `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Getting Started - Test Site</title>
      <meta name="description" content="How to get started with Test Site">
    </head>
    <body>
      <nav><a href="/">Home</a></nav>
      <main>
        <article>
          <h1>Getting Started</h1>
          <p>Follow these steps to get started with our tool. First, install the
          package. Then configure it. Finally, run the commands you need.</p>
          <p>Step 1: Install the package using npm or yarn. Both package managers
          are supported and will work equally well.</p>
          <p>Step 2: Configure your settings in the config file. You can customize
          many different options to suit your needs.</p>
        </article>
      </main>
      <footer>Copyright 2024</footer>
    </body>
    </html>
  `,
  "/blog/first-post": `
    <!DOCTYPE html>
    <html>
    <head>
      <title>First Post - Test Site</title>
      <meta name="description" content="Our very first blog post">
    </head>
    <body>
      <main>
        <article>
          <h1>First Post</h1>
          <p>Welcome to our blog. This is the first post and it covers some
          exciting topics about our project and where we are heading.</p>
          <p>We have been working hard on building something useful for the
          community. Stay tuned for more updates and announcements.</p>
          <p>In the meantime, check out our documentation to learn more about
          what you can do with the tool right now.</p>
        </article>
      </main>
    </body>
    </html>
  `,
};

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  server = createServer((req, res) => {
    const html = pages[req.url || "/"];
    if (html) {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(html);
    } else {
      res.writeHead(404);
      res.end("Not found");
    }
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const addr = server.address();
  if (typeof addr === "object" && addr) {
    baseUrl = `http://127.0.0.1:${addr.port}`;
  }
});

afterAll(() => {
  server.close();
});

describe("integration: extract + generate pipeline", () => {
  it("extracts pages and generates valid llms.txt", async () => {
    // Fetch and extract all pages
    const extractedPages: Page[] = [];

    for (const path of Object.keys(pages)) {
      const url = `${baseUrl}${path}`;
      const res = await fetch(url);
      const html = await res.text();
      const page = extract(url, html);
      if (page) extractedPages.push(page);
    }

    expect(extractedPages.length).toBeGreaterThan(0);

    // Build site data
    const site: SiteData = {
      url: baseUrl,
      name: "Test Site",
      description: "A site for testing llms-txt",
      pages: extractedPages.sort((a, b) => a.url.localeCompare(b.url)),
    };

    // Generate llms.txt
    const llmsTxt = generateLlmsTxt(site);
    expect(llmsTxt).toContain("# Test Site");
    expect(llmsTxt).toContain("> A site for testing llms-txt");
    // Should have section headers
    expect(llmsTxt).toMatch(/^## /m);
    // Should have links
    expect(llmsTxt).toMatch(/- \[.+\]\(http/m);

    // Generate llms-full.txt
    const fullTxt = generateLlmsFullTxt(site);
    expect(fullTxt).toContain("# Test Site");
    expect(fullTxt).toContain("---");
    // Should contain actual page content
    expect(fullTxt).toContain("Source:");

    // Generate JSON
    const json = generateJson(site);
    const parsed = JSON.parse(json);
    expect(parsed.name).toBe("Test Site");
    expect(parsed.pages.length).toBe(extractedPages.length);
    for (const p of parsed.pages) {
      expect(p).toHaveProperty("url");
      expect(p).toHaveProperty("title");
      expect(p).toHaveProperty("section");
      expect(p).not.toHaveProperty("markdown");
    }
  });

  it("handles 404 pages gracefully", async () => {
    const res = await fetch(`${baseUrl}/nonexistent`);
    expect(res.status).toBe(404);
    const html = await res.text();
    const page = extract(`${baseUrl}/nonexistent`, html);
    // A 404 with minimal body should return null or a very sparse page
    // The extractor handles this gracefully either way
    expect(page === null || page.markdown.length < 100).toBe(true);
  });
});
