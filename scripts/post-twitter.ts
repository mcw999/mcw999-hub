/**
 * post-twitter.ts
 * 生成済みツイートをTwitter/X APIで自動投稿する。
 * 週5本生成 → ワークフロー実行時に未投稿の最古のツイートを1本投稿。
 */
import { TwitterApi } from "twitter-api-v2";
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
  tweetId: string;
  postedAt: string;
  slug: string;
}

function extractSlugFromFilename(filename: string): string {
  // "2026-02-22-easytrade.txt" or "2026-02-22-easytrade-v2.txt"
  const match = filename.match(/^\d{4}-\d{2}-\d{2}-(.+?)(?:-v\d+)?\.txt$/);
  return match ? match[1] : filename.replace(/\.txt$/, "");
}

async function main() {
  const config = loadConfig();

  if (!config.twitterApiKey || !config.twitterAccessToken) {
    console.log("Twitter API credentials not configured. Skipping.");
    return;
  }

  const client = new TwitterApi({
    appKey: config.twitterApiKey,
    appSecret: config.twitterApiSecret,
    accessToken: config.twitterAccessToken,
    accessSecret: config.twitterAccessSecret,
  });

  const twitterDir = path.join(CONTENT_DIR, "sns", "twitter");
  const postedLogPath = path.join(twitterDir, ".posted.json");

  let posted: PostedEntry[] = [];
  try {
    posted = JSON.parse(await fs.readFile(postedLogPath, "utf-8"));
  } catch {
    posted = [];
  }
  const postedFiles = new Set(posted.map((e) => e.filename));

  let files: string[];
  try {
    files = (await fs.readdir(twitterDir))
      .filter((f) => f.endsWith(".txt") && !f.startsWith("."))
      .sort(); // 古い順
  } catch {
    console.log("No tweet files found.");
    return;
  }

  const targetFile = files.find((f) => !postedFiles.has(f));
  if (!targetFile) {
    console.log("No new tweets to post.");
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
    if (!platforms.includes("twitter")) {
      console.log(`Twitter: ${project.name} のスケジュール対象外のためスキップ`);
      return;
    }
  }

  const tweetText = (
    await fs.readFile(path.join(twitterDir, targetFile), "utf-8")
  ).trim();

  console.log(`Posting tweet from: ${targetFile}`);
  console.log(`Content (${tweetText.length} chars):`);
  console.log(tweetText.substring(0, 100) + (tweetText.length > 100 ? "..." : ""));

  let result;
  try {
    result = await client.v2.tweet(tweetText);
  } catch (e: any) {
    if (e?.code === 402 || e?.message?.includes("402")) {
      console.error("X API クレジット不足 (HTTP 402)。");
      console.error("→ https://developer.x.com でクレジットを購入してください。");
      console.error("  X APIは従量課金制に移行しました。");
      process.exit(1);
    }
    throw e;
  }
  const tweetId = result.data.id;

  console.log(`Tweet posted! ID: ${tweetId}`);
  console.log(`URL: https://x.com/i/status/${tweetId}`);

  posted.push({
    filename: targetFile,
    tweetId,
    postedAt: TODAY,
    slug,
  });
  await fs.writeFile(postedLogPath, JSON.stringify(posted, null, 2), "utf-8");
}

main().catch((err) => {
  console.error("Twitter post error:", err.message);
  process.exit(1);
});
