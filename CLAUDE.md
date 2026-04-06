# llms-txt

CLI tool that generates llms.txt files for any website. TypeScript, Node.js 20+.

## Quick Start

```bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"
make install
make build
make generate URL=https://example.com
```

## Commands

- `make install` -- install dependencies
- `make build` -- build CLI to dist/
- `make dev` -- watch mode rebuild
- `make test` -- run all tests
- `make lint` -- type check (tsc --noEmit)
- `make clean` -- remove dist/ and node_modules/
- `make generate URL=<url>` -- run the CLI against a URL
- `make run ARGS="<url> --depth 2 --full"` -- run with custom flags

## Architecture

```
src/
  index.ts             -- CLI entry point (commander.js)
  types.ts             -- shared TypeScript types
  commands/
    generate.ts        -- orchestrates crawl -> extract -> generate pipeline
  core/
    crawler.ts         -- URL discovery via sitemap.xml + recursive link following
    extractor.ts       -- HTML to markdown using Readability + Turndown
    generator.ts       -- assembles llms.txt and llms-full.txt output
    robots.ts          -- robots.txt parsing and sitemap URL extraction
test/
  generator.test.ts    -- unit tests for output generation
  extractor.test.ts    -- unit tests for HTML extraction
  robots.test.ts       -- unit tests for robots.txt parsing
  integration.test.ts  -- end-to-end test with local HTTP server
```

### How the pipeline works

1. **Discovery** -- check sitemap.xml first, fall back to recursive link following
2. **Crawl** -- fetch pages respecting robots.txt, depth limits, rate limits
3. **Extract** -- Readability strips nav/ads/scripts, Turndown converts to markdown
4. **Generate** -- group pages by URL path into sections, output llms.txt format

## Code Style

- TypeScript strict mode, ESM modules
- Semicolons required
- Imports use `.js` extensions (ESM compatibility)
- No unnecessary abstractions. Keep functions small and focused.
- Error handling: skip and log, don't crash. The CLI should always produce output.

## Commit Convention

[Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` new features
- `fix:` bug fixes
- `test:` adding or updating tests
- `ci:` CI/CD changes
- `docs:` documentation only
- `chore:` maintenance, dependencies, config
- `refactor:` code changes that neither fix bugs nor add features

Subject under 72 chars. Imperative mood ("add", not "added").
Update CHANGELOG.md before committing.

## Testing

- vitest for all tests
- Unit tests for pure functions (generator, extractor, robots)
- Integration tests spin up a local HTTP server with inline HTML fixtures
- All tests must pass before pushing: `make test`

## Git

- Author: `Amit Kosti <akosti92@gmail.com>`
- Do not add co-author lines to commits
- Branch: main
- Force push is OK while pre-1.0 with no external contributors

## Changelog

CHANGELOG.md is append-only. Update it with every meaningful change using
[Keep a Changelog](https://keepachangelog.com/) format. Group under Added,
Changed, Fixed, or Removed within the current version section.

## Key Dependencies

- `commander` -- CLI argument parsing
- `@mozilla/readability` -- content extraction (same as Firefox Reader View)
- `turndown` + `turndown-plugin-gfm` -- HTML to GitHub Flavored Markdown
- `jsdom` -- DOM parsing for Node.js
- `robots-parser` -- robots.txt parsing
- `ora` -- terminal spinner for progress output

## Release Checklist

Not yet published to npm. When ready:

1. Update version in package.json
2. Update CHANGELOG.md with release date
3. `make test` -- all green
4. `make build` -- clean build
5. `npm publish`
6. `git tag v<version>` and push tag
