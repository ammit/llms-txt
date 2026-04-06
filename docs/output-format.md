# Output Format

## The llms.txt standard

`llms.txt` is a plain markdown file placed at the root of a website (e.g. `https://example.com/llms.txt`). It follows a simple structure:

- **Title** (`# H1`): the site or product name
- **Description** (`> blockquote`): a short summary of what the site is
- **Sections** (`## H2`): logical groupings of pages, derived from URL paths
- **Entries** (list items): one line per page, with a link and a short description

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

The full spec is at [llmstxt.org](https://llmstxt.org/).

## llms-full.txt

When you pass `--full`, a second file is generated alongside `llms.txt`. It contains the complete markdown content of every crawled page, separated by headings.

This is useful when you want to give an LLM the entire site in a single context window, rather than having it look up individual pages from the index.

`llms-full.txt` can be large. For big sites, the index (`llms.txt`) is usually the better starting point.

## Section grouping logic

Pages are grouped into sections based on their URL path segments. For example:

- `/docs/quickstart` and `/docs/install` both end up under a `## Docs` section
- `/api/auth` and `/api/endpoints` end up under `## Api`
- Pages at the root (e.g. `/about`, `/pricing`) are grouped under a `## Pages` fallback section

Section names are title-cased from the path segment. The tool picks the first meaningful path segment after the domain as the section key.

## JSON output

Pass `--json` to get a JSON array instead of the markdown format. Each object represents a crawled page:

```json
[
  {
    "url": "https://example.com/docs/quickstart",
    "title": "Quick Start",
    "description": "Set up your first project in 5 minutes",
    "content": "## Quick Start\n\nInstall the package...",
    "section": "Docs"
  },
  {
    "url": "https://example.com/docs/install",
    "title": "Installation",
    "description": "System requirements and install steps",
    "content": "## Installation\n\nRequirements: Node.js 20+...",
    "section": "Docs"
  }
]
```

Fields:

| Field | Type | Description |
|-------|------|-------------|
| `url` | string | Full URL of the page |
| `title` | string | Page title extracted from the HTML |
| `description` | string | Short description extracted or inferred from content |
| `content` | string | Full markdown content of the page |
| `section` | string | Section name derived from the URL path |

JSON output is useful for building downstream pipelines: ingesting into a vector store, post-processing with another script, or feeding into a custom `llms.txt` template.
