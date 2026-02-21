/**
 * post-twitter.ts
 * 生成済みツイートをTwitter/Xに投稿する。
 */
import { TwitterApi } from "twitter-api-v2";
import fs from "fs/promises";
import path from "path";
import { loadConfig, CONTENT_DIR } from "./lib/config";

async function main() {
  const config = loadConfig();

  const client = new TwitterApi({
    appKey: config.twitterApiKey,
    appSecret: config.twitterApiSecret,
    accessToken: config.twitterAccessToken,
    accessSecret: config.twitterAccessSecret,
  });

  // 最新の未投稿ツイートファイルを探す
  const twitterDir = path.join(CONTENT_DIR, "sns", "twitter");
  const postedLog = path.join(twitterDir, ".posted.json");

  let posted: string[] = [];
  try {
    posted = JSON.parse(await fs.readFile(postedLog, "utf-8"));
  } catch {
    posted = [];
  }

  const files = (await fs.readdir(twitterDir))
    .filter((f) => f.endsWith(".txt") && !posted.includes(f))
    .sort()
    .reverse();

  if (files.length === 0) {
    console.log("No new tweets to post.");
    return;
  }

  const file = files[0];
  const text = (await fs.readFile(path.join(twitterDir, file), "utf-8")).trim();

  console.log(`Posting tweet from: ${file}`);
  console.log(`Text (${text.length} chars):\n${text}\n`);

  const { data } = await client.v2.tweet(text);
  console.log(`Tweet posted! ID: ${data.id}`);

  posted.push(file);
  await fs.writeFile(postedLog, JSON.stringify(posted, null, 2), "utf-8");
}

main().catch((err) => {
  console.error("Twitter post error:", err.message);
  process.exit(1);
});
