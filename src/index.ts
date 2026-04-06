import { program } from "commander";
import { generate } from "./commands/generate.js";

// Graceful shutdown on Ctrl+C
process.on("SIGINT", () => {
  console.error("\nInterrupted. Exiting...");
  process.exit(130); // Standard SIGINT exit code
});

process.on("unhandledRejection", (err) => {
  console.error("Unexpected error:", err instanceof Error ? err.message : err);
  process.exit(1);
});

program
  .name("llms-txt")
  .description("Generate llms.txt files for any website")
  .version("0.1.0")
  .argument("<url>", "URL to generate llms.txt for")
  .option("-d, --depth <number>", "max crawl depth", "3")
  .option("-o, --output <path>", "output file path (default: stdout)")
  .option("--full", "also generate llms-full.txt", false)
  .option("--include <patterns...>", "URL patterns to include")
  .option("--exclude <patterns...>", "URL patterns to exclude")
  .option("--rate <number>", "requests per second", "2")
  .option("-c, --concurrency <number>", "parallel requests", "5")
  .option("--json", "output as JSON", false)
  .option("-v, --verbose", "show detailed skip/fetch logging", false)
  .option("-q, --quiet", "suppress spinner and summary, only raw output", false)
  .option("--timeout <ms>", "fetch timeout in milliseconds", "10000")
  .option("--lang <code>", "language filter (e.g. en, de). auto-detects from homepage if not set")
  .option("--max-pages <number>", "max pages to crawl (0 = unlimited)", "0")
  .option("--min-content-length <chars>", "skip pages with less extracted markdown than this", "50")
  .action(async (url: string, opts) => {
    await generate(url, {
      depth: parseInt(opts.depth, 10),
      rate: parseInt(opts.rate, 10),
      concurrency: parseInt(opts.concurrency, 10),
      include: opts.include || [],
      exclude: opts.exclude || [],
      output: opts.output,
      full: opts.full,
      json: opts.json,
      verbose: opts.verbose,
      quiet: opts.quiet,
      timeout: parseInt(opts.timeout, 10),
      lang: opts.lang,
      maxPages: parseInt(opts.maxPages, 10),
      minContentLength: parseInt(opts.minContentLength, 10),
    });
  });

program.parse();
