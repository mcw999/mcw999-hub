/**
 * post-devto.ts
 * Qiita/Zenn記事の英訳版をDev.toにクロスポストする。
 * 海外ユーザー獲得チャネル。
 */
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs/promises";
import path from "path";
import {
  requireEnv,
  loadConfig,
  CONTENT_DIR,
  ARTICLES_DIR,
  readProjectFiles,
} from "./lib/config";
import { logUsage } from "./lib/usage-logger";
import type { ProjectDefinition } from "../src/lib/types";

const TODAY = new Date().toISOString().split("T")[0];

interface PostedEntry {
  filename: string;
  postId: string;
  url: string;
  postedAt: string;
  slug: string;
}

async function postToDevto(
  apiKey: string,
  title: string,
  body: string,
  tags: string[]
): Promise<{ id: number; url: string }> {
  const response = await fetch("https://dev.to/api/articles", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      article: {
        title,
        body_markdown: body,
        published: true,
        tags: tags.slice(0, 4),
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Dev.to API error ${response.status}: ${errorBody}`);
  }

  return response.json();
}

async function translateArticle(
  client: Anthropic,
  jaTitle: string,
  jaBody: string
): Promise<{ title: string; body: string }> {
  const system = `あなたは技術記事の翻訳者です。日本語の技術記事を自然な英語に翻訳します。

ルール:
- 技術用語はそのまま英語表記にする
- Zenn/Qiitaのフロントマターは除去し、純粋な本文のみ出力する
- 翻訳はネイティブが読んで違和感のない英語にする
- 最初の行は「TITLE: 英語タイトル」
- 2行目は空行、3行目から本文`;

  const prompt = `以下の日本語記事を英語に翻訳してください。

タイトル: ${jaTitle}

本文:
${jaBody}

最初の行は「TITLE: 英語タイトル」としてください。`;

  const model = "claude-sonnet-4-20250514";
  const raw = await client.messages.create({
    model,
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
    system,
  });

  await logUsage("devto", "英訳翻訳", model, raw.usage);

  const text = raw.content[0].type === "text" ? raw.content[0].text : "";
  const lines = text.split("\n");
  const title = lines[0].replace(/^TITLE:\s*/, "").trim();
  const body = lines.slice(2).join("\n");

  return { title, body };
}

function extractSlugFromSource(source: string): string {
  // "qiita/2026-02-21-crypto-overheat-analyze.json" → "crypto-overheat-analyze"
  const filename = source.split("/").pop() || source;
  const match = filename.match(/^\d{4}-?\d{2}-?\d{2}-?(.+)\.\w+$/);
  return match ? match[1] : filename.replace(/\.\w+$/, "");
}

async function findUnpostedArticle(
  postedSources: Set<string>
): Promise<{
  title: string;
  body: string;
  tags: string[];
  source: string;
} | null> {
  // Qiita記事を探す（JSON形式で扱いやすい）
  const qiitaDir = path.join(CONTENT_DIR, "sns", "qiita");
  try {
    const files = (await fs.readdir(qiitaDir))
      .filter((f) => f.endsWith(".json") && !f.startsWith("."))
      .sort()
      .reverse();

    for (const file of files) {
      const source = `qiita/${file}`;
      if (postedSources.has(source)) continue;
      const raw = await fs.readFile(path.join(qiitaDir, file), "utf-8");
      const article = JSON.parse(raw);
      return {
        title: article.title,
        body: article.body,
        tags: article.tags || [],
        source,
      };
    }
  } catch {
    // skip
  }

  // Zenn記事を探す（Markdown形式）
  try {
    const files = (await fs.readdir(ARTICLES_DIR))
      .filter((f) => f.endsWith(".md"))
      .sort()
      .reverse();

    for (const file of files) {
      const source = `zenn/${file}`;
      if (postedSources.has(source)) continue;
      const raw = await fs.readFile(path.join(ARTICLES_DIR, file), "utf-8");
      const frontmatterMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
      if (frontmatterMatch) {
        const fm = frontmatterMatch[1];
        const body = frontmatterMatch[2];
        const titleMatch = fm.match(/title:\s*"(.+?)"/);
        const topicsMatch = fm.match(/topics:\s*\[(.+?)\]/);
        const title = titleMatch ? titleMatch[1] : file.replace(".md", "");
        const tags = topicsMatch
          ? topicsMatch[1].split(",").map((t) => t.trim().replace(/"/g, ""))
          : [];
        return { title, body, tags, source };
      }
    }
  } catch {
    // skip
  }

  return null;
}

async function loadPostedLog(logPath: string): Promise<PostedEntry[]> {
  try {
    const raw = await fs.readFile(logPath, "utf-8");
    const data = JSON.parse(raw);
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === "string") {
      return data.map((source: string) => ({
        filename: source,
        postId: "",
        url: "",
        postedAt: "",
        slug: extractSlugFromSource(source),
      }));
    }
    return data;
  } catch {
    return [];
  }
}

async function main() {
  const config = loadConfig();

  if (!config.devtoApiKey) {
    console.log("Dev.to API key not configured. Skipping.");
    return;
  }

  const apiKey = requireEnv("ANTHROPIC_API_KEY");
  const client = new Anthropic({ apiKey });

  const devtoDir = path.join(CONTENT_DIR, "sns", "devto");
  await fs.mkdir(devtoDir, { recursive: true });
  const postedLogPath = path.join(devtoDir, ".posted.json");

  const posted = await loadPostedLog(postedLogPath);
  const postedSources = new Set(posted.map((e) => e.filename));

  const article = await findUnpostedArticle(postedSources);
  if (!article) {
    console.log("No new articles to cross-post.");
    return;
  }

  // スケジュールチェック: 元記事のプロジェクトがdevtoを含むか
  const articleSlug = extractSlugFromSource(article.source);
  const allProjects = await readProjectFiles();
  const sourceProject = allProjects.find(
    (p: ProjectDefinition) => p.slug === articleSlug
  );
  if (sourceProject) {
    const platforms = sourceProject.schedule?.platforms || [
      "twitter", "zenn", "qiita", "blog", "devto", "reddit",
    ];
    if (!platforms.includes("devto")) {
      console.log(`Dev.to: ${sourceProject.name} のスケジュール対象外のためスキップ`);
      return;
    }
  }

  console.log(`Cross-posting from: ${article.source}`);
  console.log(`Original title: ${article.title}`);

  console.log("Translating to English...");
  const translated = await translateArticle(client, article.title, article.body);
  console.log(`Translated title: ${translated.title}`);

  // 翻訳結果を保存
  await fs.writeFile(
    path.join(devtoDir, `${TODAY}-translated.json`),
    JSON.stringify(
      {
        originalSource: article.source,
        title: translated.title,
        body: translated.body,
        tags: article.tags,
      },
      null,
      2
    ),
    "utf-8"
  );

  console.log("Posting to Dev.to...");
  const result = await postToDevto(
    config.devtoApiKey,
    translated.title,
    translated.body,
    article.tags
  );
  console.log(`Dev.to article posted! ID: ${result.id}, URL: ${result.url}`);

  posted.push({
    filename: article.source,
    postId: String(result.id),
    url: result.url,
    postedAt: TODAY,
    slug: extractSlugFromSource(article.source),
  });
  await fs.writeFile(postedLogPath, JSON.stringify(posted, null, 2), "utf-8");
}

main().catch((err) => {
  console.error("Dev.to post error:", err.message);
  process.exit(1);
});
