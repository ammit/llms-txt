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

const BASH_COMPLETION = `_llms_txt_completions() {
  local cur="\${COMP_WORDS[COMP_CWORD]}"
  local opts="--depth --output --full --include --exclude --rate --concurrency --json --verbose --quiet --timeout --lang --max-pages --min-content-length --version --help"
  COMPREPLY=(\$(compgen -W "\${opts}" -- "\${cur}"))
}
complete -F _llms_txt_completions llms-txt`;

const ZSH_COMPLETION = `#compdef llms-txt

_llms_txt() {
  _arguments \\
    '1:url:_urls' \\
    '--depth[Max crawl depth]:depth' \\
    '--output[Output file path]:file:_files' \\
    '--full[Generate llms-full.txt]' \\
    '--include[Include URL patterns]:pattern' \\
    '--exclude[Exclude URL patterns]:pattern' \\
    '--rate[Requests per second]:rate' \\
    '--concurrency[Concurrent requests]:concurrency' \\
    '--json[Output JSON]' \\
    '--verbose[Verbose output]' \\
    '--quiet[Suppress output]' \\
    '--timeout[Request timeout ms]:timeout' \\
    '--lang[Filter by language]:lang' \\
    '--max-pages[Maximum pages]:pages' \\
    '--min-content-length[Min content length]:length' \\
    '--version[Show version]' \\
    '--help[Show help]'
}

_llms_txt`;

const FISH_COMPLETION = `complete -c llms-txt -l depth -d 'Max crawl depth'
complete -c llms-txt -l output -d 'Output file path' -r
complete -c llms-txt -l full -d 'Generate llms-full.txt'
complete -c llms-txt -l include -d 'Include URL patterns' -r
complete -c llms-txt -l exclude -d 'Exclude URL patterns' -r
complete -c llms-txt -l rate -d 'Requests per second' -r
complete -c llms-txt -l concurrency -d 'Concurrent requests' -r
complete -c llms-txt -l json -d 'Output JSON'
complete -c llms-txt -l verbose -d 'Verbose output'
complete -c llms-txt -l quiet -d 'Suppress output'
complete -c llms-txt -l timeout -d 'Request timeout ms' -r
complete -c llms-txt -l lang -d 'Filter by language' -r
complete -c llms-txt -l max-pages -d 'Maximum pages' -r
complete -c llms-txt -l min-content-length -d 'Min content length' -r`;

program
  .command("completion <shell>", { hidden: true })
  .description("Print shell completion script")
  .action((shell: string) => {
    switch (shell) {
      case "bash":
        console.log(BASH_COMPLETION);
        break;
      case "zsh":
        console.log(ZSH_COMPLETION);
        break;
      case "fish":
        console.log(FISH_COMPLETION);
        break;
      default:
        console.error(`Unknown shell: ${shell}. Supported: bash, zsh, fish`);
        process.exit(1);
    }
    process.exit(0);
  });

program.parse();
