# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Conventional Commits](https://www.conventionalcommits.org/).

## 1.0.0 (2026-04-06)


### Features

* add --verbose flag and fetch timeouts ([a0fa2ed](https://github.com/ammit/llms-txt/commit/a0fa2edf654e65a6f4bef4f02982c7b59c52b13e))
* add detailed crawl progress output ([829b1ea](https://github.com/ammit/llms-txt/commit/829b1ea9cbccb92b74a38f2843a075c63b77682e))
* add graceful shutdown, proper exit codes, and partial output on interrupt ([00574f6](https://github.com/ammit/llms-txt/commit/00574f63eefe91d925cc8ea294a516307aac4af7))
* initial CLI with crawl, extract, and generate ([9253b70](https://github.com/ammit/llms-txt/commit/9253b704b08f5bbf741e82913868a8557a188866))
* skip redirect pages and low-content pages ([8cf4ba6](https://github.com/ammit/llms-txt/commit/8cf4ba643de66e50ef887aea38da0a6d49c3b106))


### Bug Fixes

* add missing type declaration for turndown-plugin-gfm ([28303d5](https://github.com/ammit/llms-txt/commit/28303d57792833997fb717747fa96cbf2a2cd621))
* add retry logic, input validation, and network resilience ([c0315ac](https://github.com/ammit/llms-txt/commit/c0315acf5f78c87dd76475ec633204bfd72c9e60))
* deduplicate homepage URLs and clean section grouping ([69ab940](https://github.com/ammit/llms-txt/commit/69ab940628efc3d665ebb8adfa61d089d4c09fa4))
* handle edge cases in sitemap parsing, extraction, and malformed input ([a63948e](https://github.com/ammit/llms-txt/commit/a63948e285c10eceb57ce95c7f0dd4035762e7bf))
* limit crawl depth when sitemap is present ([19e7296](https://github.com/ammit/llms-txt/commit/19e72962bff459e93f73cb475fc493d56e62fdc2))
* strip query parameters from URLs for better deduplication ([640e544](https://github.com/ammit/llms-txt/commit/640e54481b899ba8a364002b2d780cbe808f1dbb))
* update tests for section mapping and description dedup threshold ([b4a606e](https://github.com/ammit/llms-txt/commit/b4a606e5201854097850400e5dd66c173452240f))

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
