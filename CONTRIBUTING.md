# Contributing

Thanks for your interest in contributing to llms-txt!

## Development Setup

```bash
git clone https://github.com/ammit/llms-txt
cd llms-txt
npm install
```

## Commands

| Command | What it does |
|---------|-------------|
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run dev` | Watch mode |
| `npm run lint` | Type-check with tsc |
| `npm run test` | Run all tests |
| `make run URL=https://example.com` | Run the CLI locally |

## Architecture

The pipeline is: **crawler → extractor → generator**

- `src/core/crawler.ts` -- discovers and fetches pages (sitemap + link following)
- `src/core/extractor.ts` -- cleans HTML with Readability, converts to markdown via Turndown
- `src/core/generator.ts` -- assembles the llms.txt output
- `src/commands/generate.ts` -- orchestrates the pipeline, handles CLI I/O
- `src/index.ts` -- CLI entry point via commander.js

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` new feature (bumps minor version)
- `fix:` bug fix (bumps patch version)
- `test:` test changes only
- `ci:` CI/CD changes
- `docs:` documentation only
- `chore:` maintenance, deps, config
- `refactor:` code change with no behavior change

Breaking changes: add `!` after the type (e.g. `feat!:`) or add `BREAKING CHANGE:` in the commit body.

## Pull Requests

- Add tests for new behavior
- Keep changes focused -- one thing per PR
- No speculative features. Only build what's needed (YAGNI)
- Run `npm run lint && npm run test` before pushing
- PRs that touch `src/core/crawler.ts` should include integration test coverage

## Running Integration Tests

The integration tests spin up a local HTTP server:

```bash
npm run test
```

All tests (unit + integration) are in the `test/` directory.
