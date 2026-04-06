# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Conventional Commits](https://www.conventionalcommits.org/).

## [0.1.0] - 2026-04-06

### Added

- CLI tool to generate llms.txt and llms-full.txt from any website
- Sitemap.xml discovery with recursive link following as fallback
- Content extraction using Mozilla Readability + Turndown for clean markdown
- Depth-limited crawling with --depth flag
- Include/exclude URL patterns with glob matching
- Rate limiting and concurrency control
- Live progress spinner showing fetched/queued/skipped counts
- --verbose flag for detailed skip/fetch logging
- --timeout flag for fetch abort signals (default 10s)
- --full flag to generate llms-full.txt bundle
- --json flag for JSON output
- robots.txt respect
- Homepage URL deduplication (index.html normalization)
- Smart section grouping by URL path structure
- Makefile for common tasks
- GitHub Actions CI workflow
- CONTRIBUTING.md with setup and PR guidelines
- Issue templates for bugs and feature requests
- 28 unit and integration tests (vitest)
