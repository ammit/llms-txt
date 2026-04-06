# llms-txt

[![CI](https://github.com/ammit/llms-txt/actions/workflows/ci.yml/badge.svg)](https://github.com/ammit/llms-txt/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@ammit/llms-txt.svg)](https://www.npmjs.com/package/@ammit/llms-txt)
[![npm downloads](https://img.shields.io/npm/dm/@ammit/llms-txt.svg)](https://www.npmjs.com/package/@ammit/llms-txt)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js >=20](https://img.shields.io/node/v/@ammit/llms-txt.svg)](https://nodejs.org)

Generate `llms.txt` files for any website. Make your site AI-friendly.

[llms.txt](https://llmstxt.org/) is a standard that helps AI agents understand your website. It converts your pages into clean, token-efficient markdown that LLMs can consume directly, reducing token usage by ~90% compared to raw HTML.

Only 5-15% of websites have `llms.txt` today. This tool generates one for you automatically.

## Install

```bash
npm install -g @ammit/llms-txt
```

Or run directly:

```bash
npx @ammit/llms-txt https://example.com
```

## Usage

```bash
# Generate llms.txt for a site
llms-txt https://docs.anthropic.com

# Set crawl depth
llms-txt https://example.com --depth 3

# Output to files
llms-txt https://example.com -o ./llms.txt

# Include/exclude URL patterns
llms-txt https://example.com --include "/docs/**" --exclude "/blog/**"

# Generate llms-full.txt (all content bundled)
llms-txt https://example.com --full
```

## What it does

1. Discovers pages via `sitemap.xml` and link following
2. Extracts clean content using [Readability](https://github.com/mozilla/readability) (strips nav, ads, scripts)
3. Converts to markdown via [Turndown](https://github.com/mixmark-io/turndown)
4. Outputs a standard `llms.txt` index and optional `llms-full.txt` bundle

## Output format

The generated `llms.txt` follows the [llms.txt standard](https://llmstxt.org/):

```markdown
# Example Docs

> Documentation for the Example platform.

## Getting Started

- [Quick Start](https://example.com/docs/quickstart): Set up your first project in 5 minutes
- [Installation](https://example.com/docs/install): System requirements and install steps

## API Reference

- [Authentication](https://example.com/docs/api/auth): API keys and OAuth setup
- [Endpoints](https://example.com/docs/api/endpoints): Complete REST API reference
```

## Options

| Flag | Description | Default |
|------|-------------|---------|
| `--depth, -d` | Max crawl depth | `3` |
| `--output, -o` | Output file path | stdout |
| `--full` | Also generate `llms-full.txt` | `false` |
| `--include` | URL patterns to include (glob) | all |
| `--exclude` | URL patterns to exclude (glob) | none |
| `--rate` | Requests per second | `2` |
| `--concurrency, -c` | Parallel requests | `5` |
| `--json` | Output as JSON | `false` |
| `--verbose, -v` | Show detailed skip/fetch logging | `false` |
| `--quiet, -q` | Suppress spinner and summary, only raw output | `false` |
| `--timeout` | Fetch timeout in milliseconds | `10000` |
| `--lang` | Language filter (e.g. `en`, `de`). Auto-detects from homepage if not set | auto |
| `--max-pages` | Max pages to crawl (0 = unlimited) | `0` |

## How it works

```
URL --> Sitemap/Link Discovery --> Content Extraction --> Markdown Conversion --> llms.txt
```

- **Discovery**: Checks `sitemap.xml` first, falls back to recursive link following
- **Extraction**: Mozilla Readability isolates main content, removes chrome
- **Conversion**: Turndown produces clean GFM markdown
- **Assembly**: Groups pages by URL path into sections, generates descriptions

## Contributing

Contributions welcome. Please open an issue first to discuss what you'd like to change.

## License

[MIT](LICENSE)
