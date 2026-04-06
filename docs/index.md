# llms-txt

Generate `llms.txt` files for any website. Make your site AI-friendly.

[![CI](https://github.com/ammit/llms-txt/actions/workflows/ci.yml/badge.svg)](https://github.com/ammit/llms-txt/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@ammit/llms-txt.svg)](https://www.npmjs.com/package/@ammit/llms-txt)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## What is llms.txt?

[llms.txt](https://llmstxt.org/) is an emerging standard that helps AI agents understand your website. It works like `robots.txt`, but for LLMs: a simple index file that points to your site's key content in clean, readable markdown.

When an AI needs to understand your docs, product, or blog, it can consume `llms.txt` directly instead of scraping raw HTML. That means:

- ~90% fewer tokens compared to raw HTML
- No nav bars, ads, or boilerplate cluttering the context
- Structured, section-grouped content that's easy to navigate

**Only 5-15% of websites have `llms.txt` today.** This tool generates one for you automatically, no manual work required.

## Quick start

Install globally and run against any URL:

```bash
npm install -g @ammit/llms-txt
llms-txt https://docs.anthropic.com
```

Or skip the install entirely:

```bash
npx @ammit/llms-txt https://docs.anthropic.com
```

The output is printed to stdout by default. Save it to a file with `-o`:

```bash
llms-txt https://example.com -o ./llms.txt
```

## How it works

```
URL --> Sitemap/Link Discovery --> Content Extraction --> Markdown Conversion --> llms.txt
```

1. **Discovers pages** via `sitemap.xml` and recursive link following
2. **Extracts clean content** using [Mozilla Readability](https://github.com/mozilla/readability) (strips nav, ads, scripts)
3. **Converts to markdown** via [Turndown](https://github.com/mixmark-io/turndown)
4. **Assembles** a standard `llms.txt` index, grouped by URL path sections

[Get started](getting-started.md){ .md-button .md-button--primary }
[CLI Reference](cli-reference.md){ .md-button }
