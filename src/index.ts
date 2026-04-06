import { program } from "commander";
import { generate } from "./commands/generate.js";

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
  .option("--timeout <ms>", "fetch timeout in milliseconds", "10000")
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
      timeout: parseInt(opts.timeout, 10),
    });
  });

program.parse();
