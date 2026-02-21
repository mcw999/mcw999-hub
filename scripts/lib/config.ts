import fs from "fs/promises";
import path from "path";

export interface Config {
  anthropicApiKey: string;
  twitterApiKey: string;
  twitterApiSecret: string;
  twitterAccessToken: string;
  twitterAccessSecret: string;
  qiitaApiToken: string;
  siteUrl: string;
}

export function loadConfig(): Config {
  return {
    anthropicApiKey: optEnv("ANTHROPIC_API_KEY"),
    twitterApiKey: optEnv("TWITTER_API_KEY"),
    twitterApiSecret: optEnv("TWITTER_API_SECRET"),
    twitterAccessToken: optEnv("TWITTER_ACCESS_TOKEN"),
    twitterAccessSecret: optEnv("TWITTER_ACCESS_SECRET"),
    qiitaApiToken: optEnv("QIITA_API_TOKEN"),
    siteUrl: process.env.SITE_URL || "https://mcw999.github.io",
  };
}

export function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing environment variable: ${key}`);
  return val;
}

function optEnv(key: string): string {
  return process.env[key] || "";
}

export const CONTENT_DIR = path.join(process.cwd(), "content");
export const ARTICLES_DIR = path.join(process.cwd(), "articles");

export async function readProjectFiles() {
  const dir = path.join(CONTENT_DIR, "projects");
  const files = await fs.readdir(dir);
  return Promise.all(
    files
      .filter((f) => f.endsWith(".json"))
      .map(async (f) => {
        const raw = await fs.readFile(path.join(dir, f), "utf-8");
        return JSON.parse(raw);
      })
  );
}

export async function getPublishedLog(): Promise<Record<string, string[]>> {
  const logPath = path.join(CONTENT_DIR, "meta", "published-log.json");
  try {
    const raw = await fs.readFile(logPath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function savePublishedLog(log: Record<string, string[]>) {
  const logPath = path.join(CONTENT_DIR, "meta", "published-log.json");
  await fs.writeFile(logPath, JSON.stringify(log, null, 2), "utf-8");
}
