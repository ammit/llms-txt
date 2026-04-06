# llms-txt

## Project

CLI tool that generates llms.txt files for any website. TypeScript, Node.js 20+.

## Commands

- `make install` -- install dependencies
- `make build` -- build CLI
- `make test` -- run tests
- `make lint` -- type check
- `make generate URL=<url>` -- run the CLI

nvm must be sourced first: `export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"`

## Code Style

- TypeScript strict mode
- ESM modules (type: "module" in package.json)
- Semicolons required
- Imports use .js extensions for ESM compatibility

## Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` new features
- `fix:` bug fixes
- `test:` adding or updating tests
- `ci:` CI/CD changes
- `docs:` documentation only
- `chore:` maintenance, dependencies, config
- `refactor:` code changes that neither fix bugs nor add features

Keep subject under 72 chars. Use imperative mood ("add", not "added").
Body is optional but encouraged for non-trivial changes.

## Architecture

```
src/
  index.ts          -- CLI entry (commander.js)
  types.ts          -- shared types
  commands/
    generate.ts     -- main generate command, orchestrates crawl/extract/generate
  core/
    crawler.ts      -- URL discovery via sitemap + link following
    extractor.ts    -- HTML to markdown (Readability + Turndown)
    generator.ts    -- assembles llms.txt / llms-full.txt output
    robots.ts       -- robots.txt parsing
test/
  generator.test.ts
  extractor.test.ts
  robots.test.ts
  integration.test.ts
```

## Testing

- vitest for all tests
- Unit tests for pure functions (generator, extractor, robots)
- Integration tests use a local HTTP server with HTML fixtures
- Run: `npm run test` or `make test`

## Git

- Author: Amit Kosti <akosti92@gmail.com>
- Do not add co-author lines
- Branch: main
