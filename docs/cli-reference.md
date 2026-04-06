# CLI Reference

## Usage

```
llms-txt <url> [options]
```

`<url>` is required. It's the root URL to crawl.

## Flags

| Flag | Short | Type | Default | Description |
|------|-------|------|---------|-------------|
| `--depth` | `-d` | number | `3` | Max crawl depth from the starting URL. |
| `--output` | `-o` | path | stdout | Write output to a file instead of printing to stdout. |
| `--full` | | boolean | `false` | Also generate `llms-full.txt` alongside the index. Bundles full page content. |
| `--include` | | glob... | all | URL patterns to include. Accepts one or more glob patterns. |
| `--exclude` | | glob... | none | URL patterns to exclude. Accepts one or more glob patterns. |
| `--rate` | | number | `2` | Requests per second. Lower this to be polite to slow servers. |
| `--concurrency` | `-c` | number | `5` | Number of parallel requests. |
| `--json` | | boolean | `false` | Output crawl results as JSON instead of `llms.txt` format. |
| `--verbose` | `-v` | boolean | `false` | Show detailed logging for every fetch and skip. |
| `--quiet` | `-q` | boolean | `false` | Suppress spinner and summary. Only raw output is printed. |
| `--timeout` | | milliseconds | `10000` | Per-request fetch timeout. |
| `--lang` | | code | auto | Language filter (e.g. `en`, `de`). Auto-detects from the homepage if not set. |
| `--max-pages` | | number | `0` | Max pages to crawl. `0` means unlimited. |
| `--min-content-length` | | chars | `50` | Skip pages whose extracted markdown is shorter than this. |

## Flag details

### `--depth, -d`

Controls how many hops from the start URL the crawler will follow. Depth `1` means only the start page. Depth `3` (default) is usually enough for most doc sites.

```bash
llms-txt https://example.com --depth 5
```

### `--output, -o`

Write the `llms.txt` output to a file. When used with `--full`, the full bundle is written to a sibling file named `llms-full.txt` in the same directory.

```bash
llms-txt https://example.com -o ./public/llms.txt
```

### `--full`

Generates a second file, `llms-full.txt`, that contains the complete markdown content of every crawled page. Useful when you want to give an LLM the full site content in one shot.

### `--include / --exclude`

Filter which URLs are crawled using glob patterns. Both flags accept multiple space-separated patterns.

```bash
llms-txt https://example.com --include "/docs/**" "/api/**" --exclude "/docs/legacy/**"
```

### `--rate`

Requests per second cap. Default is `2`. Drop this to `1` if you're crawling a small or rate-limited server.

### `--concurrency, -c`

Number of pages fetched in parallel. Default is `5`. Higher values speed up large sites but increase load on the server.

### `--json`

Outputs a JSON array of crawled page objects instead of the standard `llms.txt` format. Useful for building pipelines or integrations on top of the crawler.

### `--verbose, -v`

Prints a log line for every URL fetched, skipped, or failed. Useful for debugging why certain pages are missing from the output.

### `--quiet, -q`

Hides the progress spinner and the summary line printed after crawling. Only the raw `llms.txt` (or JSON) output is printed. Useful for scripting.

### `--timeout`

Per-request timeout in milliseconds. Default is `10000` (10 seconds). Increase this for slow servers.

### `--lang`

Filter pages by language. If set, pages detected as a different language are skipped. If not set, the tool auto-detects the language from the homepage and uses that.

```bash
llms-txt https://example.com --lang en
```

### `--max-pages`

Hard cap on total pages crawled. `0` (default) means no limit. Useful for quick tests or when you only need a sample.

```bash
llms-txt https://example.com --max-pages 50
```

### `--min-content-length`

Skip pages whose extracted markdown content is shorter than this many characters. Default is `50`. Raises this to filter out stub pages or thin landing pages.
