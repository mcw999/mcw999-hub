/**
 * post-qiita.ts
 * 生成済みQiita記事をQiita APIで自動投稿する。
 */
import fs from "fs/promises";
import path from "path";
import {
  loadConfig,
  CONTENT_DIR,
  readProjectFiles,
} from "./lib/config";
import type { ProjectDefinition } from "../src/lib/types";

const TODAY = new Date().toISOString().split("T")[0];

interface PostedEntry {
  filename: string;
  postId: string;
  url: string;
  postedAt: string;
  slug: string;
}

async function postToQiita(
  token: string,
  title: string,
  body: string,
  tags: string[]
): Promise<{ id: string; url: string }> {
  const response = await fetch("https://qiita.com/api/v2/items", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title,
      body,
      tags: tags.slice(0, 5).map((name) => ({ name })),
      private: false,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Qiita API error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  return { id: data.id, url: data.url };
}

function extractSlugFromFilename(filename: string): string {
  const match = filename.match(/^\d{4}-\d{2}-\d{2}-(.+)\.json$/);
  return match ? match[1] : filename.replace(/\.json$/, "");
}

async function main() {
  const config = loadConfig();

  if (!config.qiitaApiToken) {
    console.log("Qiita API token not configured. Skipping.");
    return;
  }

  const qiitaDir = path.join(CONTENT_DIR, "sns", "qiita");
  const postedLogPath = path.join(qiitaDir, ".posted.json");

  let posted: PostedEntry[] = [];
  try {
    posted = JSON.parse(await fs.readFile(postedLogPath, "utf-8"));
  } catch {
    posted = [];
  }
  const postedFiles = new Set(posted.map((e) => e.filename));

  let files: string[];
  try {
    files = (await fs.readdir(qiitaDir))
      .filter((f) => f.endsWith(".json") && !f.startsWith("."))
      .sort()
      .reverse();
  } catch {
    console.log("No Qiita articles found.");
    return;
  }

  const targetFile = files.find((f) => !postedFiles.has(f));
  if (!targetFile) {
    console.log("No new Qiita articles to post.");
    return;
  }

  // スケジュールチェック
  const slug = extractSlugFromFilename(targetFile);
  const allProjects = await readProjectFiles();
  const project = allProjects.find(
    (p: ProjectDefinition) => p.slug === slug
  );
  if (project) {
    const platforms = project.schedule?.platforms || [
      "twitter", "zenn", "qiita", "blog", "devto", "reddit",
    ];
    if (!platforms.includes("qiita")) {
      console.log(`Qiita: ${project.name} のスケジュール対象外のためスキップ`);
      return;
    }
  }

  const raw = await fs.readFile(path.join(qiitaDir, targetFile), "utf-8");
  const article = JSON.parse(raw);

  console.log(`Posting to Qiita: ${article.title}`);
  console.log(`Source: ${targetFile}`);

  const result = await postToQiita(
    config.qiitaApiToken,
    article.title,
    article.body,
    article.tags
  );

  console.log(`Qiita article posted! ID: ${result.id}`);
  console.log(`URL: ${result.url}`);

  posted.push({
    filename: targetFile,
    postId: result.id,
    url: result.url,
    postedAt: TODAY,
    slug,
  });
  await fs.writeFile(postedLogPath, JSON.stringify(posted, null, 2), "utf-8");
}

main().catch((err) => {
  console.error("Qiita post error:", err.message);
  process.exit(1);
});
