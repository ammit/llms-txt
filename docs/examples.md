# Examples

## Crawl a documentation site

Generate `llms.txt` for a public docs site and save it to a file:

```bash
llms-txt https://docs.anthropic.com -o ./llms.txt
```

This crawls up to depth 3, follows all links under the domain, extracts clean markdown, and writes the index to `./llms.txt`.

To also generate the full content bundle:

```bash
llms-txt https://docs.anthropic.com --full -o ./llms.txt
# produces ./llms.txt and ./llms-full.txt
```

## Filter URLs with include/exclude patterns

Crawl only the API reference section of a site, and skip the changelog:

```bash
llms-txt https://example.com \
  --include "/docs/**" "/api/**" \
  --exclude "/docs/changelog/**" \
  -o ./llms.txt
```

Patterns use glob syntax. `**` matches any number of path segments.

Narrow it further to just two depth levels under `/docs`:

```bash
llms-txt https://example.com --include "/docs/**" --depth 2
```

## Generate JSON output

Output crawl results as JSON for use in a pipeline or custom script:

```bash
llms-txt https://example.com --json -o ./pages.json
```

Then process with `jq` or pipe into another tool:

```bash
llms-txt https://example.com --json --quiet | jq '.[].url'
```

Use `--quiet` to suppress the spinner and summary so only the raw JSON is printed, making it safe to pipe directly.

## Pipe output into another command

Print to stdout (default) and pipe into any tool:

```bash
# Count pages crawled
llms-txt https://example.com --quiet | grep -c "^-"

# Feed directly into pbcopy (macOS clipboard)
llms-txt https://example.com --quiet | pbcopy

# Preview the first 40 lines
llms-txt https://example.com --quiet | head -40
```

`--quiet` removes the spinner and summary so only the `llms.txt` content is on stdout.

## Tune performance for large or slow sites

Crawl a large site more aggressively:

```bash
llms-txt https://large-docs-site.com \
  --depth 5 \
  --concurrency 10 \
  --rate 5 \
  --max-pages 500 \
  -o ./llms.txt
```

Crawl a slow or rate-limited server more gently:

```bash
llms-txt https://small-site.com \
  --rate 1 \
  --concurrency 2 \
  --timeout 30000
```
