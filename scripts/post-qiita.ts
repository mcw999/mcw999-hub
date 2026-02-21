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

async function main() {
  const config = loadConfig();

  const qiitaDir = path.join(CONTENT_DIR, "sns", "qiita");
  const postedLog = path.join(qiitaDir, ".posted.json");

  let posted: string[] = [];
  try {
    posted = JSON.parse(await fs.readFile(postedLog, "utf-8"));
  } catch {
    posted = [];
  }

  const files = (await fs.readdir(qiitaDir))
    .filter((f) => f.endsWith(".json") && !f.startsWith(".") && !posted.includes(f))
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
  console.log(`Qiita article posted! URL: ${result.url}`);

  posted.push(file);
  await fs.writeFile(postedLog, JSON.stringify(posted, null, 2), "utf-8");
}

main().catch((err) => {
  console.error("Qiita post error:", err.message);
  process.exit(1);
});
