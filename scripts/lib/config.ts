import fs from "fs/promises";
import path from "path";

export interface Config {
  anthropicApiKey: string;
  twitterApiKey: string;
  twitterApiSecret: string;
  twitterAccessToken: string;
  twitterAccessSecret: string;
  qiitaApiToken: string;
  devtoApiKey: string;
  redditClientId: string;
  redditClientSecret: string;
  redditUsername: string;
  redditPassword: string;
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
    devtoApiKey: optEnv("DEVTO_API_KEY"),
    redditClientId: optEnv("REDDIT_CLIENT_ID"),
    redditClientSecret: optEnv("REDDIT_CLIENT_SECRET"),
    redditUsername: optEnv("REDDIT_USERNAME"),
    redditPassword: optEnv("REDDIT_PASSWORD"),
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

const SITE_BASE = "https://mcw999.github.io/mcw999-hub";

/** ブログ記事のURL（ハブ導線用） */
export function blogArticleUrl(projectSlug: string): string {
  return `${SITE_BASE}/blog/${projectSlug}-guide/`;
}

/** プロジェクト詳細ページのURL */
export function projectPageUrl(projectSlug: string): string {
  return `${SITE_BASE}/projects/${projectSlug}/`;
}

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

/**
 * 一次素材セクションの生成（体験ログ・実測データ・観察・失敗談）
 * これが空の場合、AIは一般論しか書けないため品質が下がる
 */
function formatSourceNotes(project: any): string {
  const notes = project.sourceNotes;
  if (!notes) return "";

  const sections: string[] = [];
  if (notes.experiences?.length) {
    sections.push(`【実体験】\n${notes.experiences.map((e: string) => `- ${e}`).join("\n")}`);
  }
  if (notes.observations?.length) {
    sections.push(`【観察・発見】\n${notes.observations.map((o: string) => `- ${o}`).join("\n")}`);
  }
  if (notes.metrics?.length) {
    sections.push(`【実測データ】\n${notes.metrics.map((m: string) => `- ${m}`).join("\n")}`);
  }
  if (notes.failures?.length) {
    sections.push(`【失敗・試行錯誤】\n${notes.failures.map((f: string) => `- ${f}`).join("\n")}`);
  }

  if (sections.length === 0) return "";
  return `\n\n--- 一次素材（実際のデータ・体験。記事の核にすること） ---\n${sections.join("\n\n")}`;
}

/**
 * Twitter投稿用のプロジェクトコンテキスト
 * techStackを除外し、ユーザー視点の情報のみ提供
 */
export function projectContextForTwitter(project: any): string {
  return `
アプリ名: ${project.nameJa || project.name}
一言説明: ${project.taglineJa || project.tagline}
ターゲットユーザー: ${(project.targetAudience || []).join(", ")}
ユーザーの課題: ${project.userProblemJa || project.userProblem || "未設定"}
解決策: ${project.solutionJa || project.solution || "未設定"}
主な機能:
${(project.features || []).map((f: any) => `- ${f.titleJa || f.title}`).join("\n")}
ハッシュタグ候補: ${(project.promotionKeywords || project.tags || []).join(", ")}
${formatSourceNotes(project)}
`.trim();
}

/**
 * 記事・ブログ用のフルコンテキスト
 */
export function projectContextFull(project: any): string {
  return `
アプリ名: ${project.nameJa || project.name}
一言説明: ${project.taglineJa || project.tagline}
詳細: ${project.descriptionJa || project.description}
ターゲットユーザー: ${(project.targetAudience || []).join(", ")}
ユーザーの課題: ${project.userProblemJa || project.userProblem || "未設定"}
解決策: ${project.solutionJa || project.solution || "未設定"}
主な機能:
${(project.features || []).map((f: any) => `- ${f.titleJa || f.title}: ${f.descriptionJa || f.description}`).join("\n")}
CTA: ${project.callToAction || "詳しくはこちら"}
URL: ${project.callToActionUrl || project.liveUrl || project.repositoryUrl || ""}
SNSキーワード: ${(project.promotionKeywords || project.tags || []).join(", ")}
${formatSourceNotes(project)}
`.trim();
}
