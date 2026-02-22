/**
 * post-qiita.ts
 * 生成済み記事をQiita APIで投稿する。
 */
import fs from "fs/promises";
import path from "path";
import { loadConfig, CONTENT_DIR } from "./lib/config";

interface QiitaArticle {
  title: string;
  body: string;
  tags: string[];
}

interface PostedEntry {
  filename: string;
  postId: string;
  url: string;
  postedAt: string;
  slug: string;
}

async function postToQiita(token: string, article: QiitaArticle) {
  const response = await fetch("https://qiita.com/api/v2/items", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: article.title,
      body: article.body,
      tags: article.tags.map((name) => ({ name, versions: [] })),
      private: false,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Qiita API error ${response.status}: ${errorBody}`);
  }

  return response.json();
}

function extractSlugFromFilename(filename: string): string {
  // "2026-02-21-crypto-overheat-analyze.json" → "crypto-overheat-analyze"
  const match = filename.match(/^\d{4}-\d{2}-\d{2}-(.+)\.\w+$/);
  return match ? match[1] : filename.replace(/\.\w+$/, "");
}

async function loadPostedLog(logPath: string): Promise<PostedEntry[]> {
  try {
    const raw = await fs.readFile(logPath, "utf-8");
    const data = JSON.parse(raw);
    // 旧形式（string[]）との互換性
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === "string") {
      return data.map((filename: string) => ({
        filename,
        postId: "",
        url: "",
        postedAt: "",
        slug: extractSlugFromFilename(filename),
      }));
    }
    return data;
  } catch {
    return [];
  }
}

async function main() {
  const config = loadConfig();

  const qiitaDir = path.join(CONTENT_DIR, "sns", "qiita");
  const postedLogPath = path.join(qiitaDir, ".posted.json");

  const posted = await loadPostedLog(postedLogPath);
  const postedFilenames = new Set(posted.map((e) => e.filename));

  const files = (await fs.readdir(qiitaDir))
    .filter((f) => f.endsWith(".json") && !f.startsWith(".") && !postedFilenames.has(f))
    .sort()
    .reverse();

  if (files.length === 0) {
    console.log("No new Qiita articles to post.");
    return;
  }

  const file = files[0];
  const raw = await fs.readFile(path.join(qiitaDir, file), "utf-8");
  const article: QiitaArticle = JSON.parse(raw);

  console.log(`Posting to Qiita: ${article.title}`);
  console.log(`Tags: ${article.tags.join(", ")}`);

  const result = await postToQiita(config.qiitaApiToken, article);
  console.log(`Qiita article posted! ID: ${result.id}, URL: ${result.url}`);

  const today = new Date().toISOString().split("T")[0];
  posted.push({
    filename: file,
    postId: result.id,
    url: result.url,
    postedAt: today,
    slug: extractSlugFromFilename(file),
  });
  await fs.writeFile(postedLogPath, JSON.stringify(posted, null, 2), "utf-8");
}

main().catch((err) => {
  console.error("Qiita post error:", err.message);
  process.exit(1);
});
