# Getting Started

## Install

**Global install** (recommended if you use it often):

```bash
npm install -g @ammit/llms-txt
```

**Run without installing** via npx:

```bash
npx @ammit/llms-txt <url>
```

Requires Node.js 20 or later.

## Your first run

Point it at any site:

```bash
llms-txt https://docs.anthropic.com
```

The tool will:

1. Fetch and parse `sitemap.xml` (or follow links if no sitemap exists)
2. Crawl pages up to the default depth of 3
3. Extract readable content from each page
4. Print the finished `llms.txt` to stdout

You'll see a spinner and a summary of pages crawled. Pipe or redirect stdout to capture the output.

## Understanding the output

The output follows the [llms.txt standard](https://llmstxt.org/). It looks like this:

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

Pages are grouped into sections based on their URL path. Each entry includes the page title and a short description extracted from the content.

## Save to a file

Use `-o` to write the output to a file instead of stdout:

```bash
llms-txt https://example.com -o ./llms.txt
```

## Common options

**Control crawl depth** (default is 3):

```bash
llms-txt https://example.com --depth 2
```

**Generate `llms-full.txt`** alongside the index. This bundles the full markdown content of every page into one file:

```bash
llms-txt https://example.com --full -o ./llms.txt
```

**Filter URLs** to keep the output focused:

```bash
llms-txt https://example.com --include "/docs/**" --exclude "/blog/**"
```

**Output as JSON** for programmatic use:

```bash
llms-txt https://example.com --json
```

See the [CLI Reference](cli-reference.md) for the full list of flags.
