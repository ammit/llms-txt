export interface CrawlOptions {
  depth: number;
  rate: number;
  concurrency: number;
  include: string[];
  exclude: string[];
  timeout: number;
  verbose: boolean;
}

export interface Page {
  url: string;
  title: string;
  description: string;
  markdown: string;
  section: string;
}

export interface GenerateOptions extends CrawlOptions {
  output?: string;
  full: boolean;
  json: boolean;
}

export interface SiteData {
  url: string;
  name: string;
  description: string;
  pages: Page[];
}

export interface CrawlProgress {
  phase: "discovery" | "crawling";
  url: string;
  fetched: number;
  queued: number;
  skipped: number;
  depth: number;
}
