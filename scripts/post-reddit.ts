/**
 * post-reddit.ts
 * 生成済みコンテンツをRedditに投稿する。
 * 宣伝色を排除した「開発ログ」「分析結果共有」形式。
 */
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs/promises";
import path from "path";
import {
  requireEnv,
  loadConfig,
  CONTENT_DIR,
  readProjectFiles,
  getPublishedLog,
  projectContextFull,
} from "./lib/config";
import { logUsage } from "./lib/usage-logger";
import type { ProjectDefinition } from "../src/lib/types";

const TODAY = new Date().toISOString().split("T")[0];

// サブレディットの設定（カテゴリ別）
const SUBREDDIT_MAP: Record<string, string[]> = {
  crypto: ["cryptocurrency", "CryptoTechnology", "algotrading"],
  tool: ["sideproject", "webdev"],
  saas: ["sideproject", "SaaS"],
  platform: ["sideproject", "webdev"],
  other: ["sideproject"],
};

async function getRedditAccessToken(config: ReturnType<typeof loadConfig>): Promise<string> {
  const auth = Buffer.from(
    `${config.redditClientId}:${config.redditClientSecret}`
  ).toString("base64");

  const response = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "mcw999-hub/1.0",
    },
    body: new URLSearchParams({
      grant_type: "password",
      username: config.redditUsername,
      password: config.redditPassword,
    }),
  });

  if (!response.ok) {
    throw new Error(`Reddit auth error: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

interface PostedEntry {
  filename: string;
  postId: string;
  url: string;
  postedAt: string;
  slug: string;
  subreddit: string;
}

async function postToReddit(
  accessToken: string,
  subreddit: string,
  title: string,
  text: string
): Promise<{ postId: string; url: string }> {
  const response = await fetch("https://oauth.reddit.com/api/submit", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "mcw999-hub/1.0",
    },
    body: new URLSearchParams({
      sr: subreddit,
      kind: "self",
      title,
      text,
      resubmit: "true",
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Reddit post error ${response.status}: ${errorBody}`);
  }

  const result = await response.json();
  if (result.json?.errors?.length > 0) {
    throw new Error(`Reddit error: ${JSON.stringify(result.json.errors)}`);
  }

  const postId = result.json?.data?.name || "";
  const url = result.json?.data?.url || `https://www.reddit.com/r/${subreddit}/`;
  return { postId, url };
}

async function generateRedditPost(
  client: Anthropic,
  project: ProjectDefinition
): Promise<{ title: string; body: string }> {
  const context = projectContextFull(project);

  const system = `あなたはRedditに投稿する開発者です。開発ログ・分析結果共有の形式で投稿を書きます。

絶対ルール:
- 宣伝色を完全に排除する（「使ってください」「ダウンロードしてください」は禁止）
- 「こういうものを作った/分析した」という共有・報告の形式にする
- 技術的な話は開発者コミュニティ向けなのでOK
- 英語で書く（Redditは英語がメイン）
- 最初の行は「TITLE: 投稿タイトル」
- 2行目は空行、3行目から本文
- 本文は500〜1000語
- 末尾にGitHub/サイトリンクを自然に含める（「Source code is available at:」等）`;

  const prompt = `以下のプロジェクトについて、Reddit向けの開発ログ・成果共有の投稿を英語で書いてください。
宣伝ではなく、技術的な知見共有やプロジェクト報告の形式にしてください。

${context}

最初の行は「TITLE: 投稿タイトル」としてください。`;

  const model = "claude-sonnet-4-20250514";
  const raw = await client.messages.create({
    model,
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
    system,
  });

  await logUsage("reddit", "Reddit投稿生成", model, raw.usage);

  const text = raw.content[0].type === "text" ? raw.content[0].text : "";
  const lines = text.split("\n");
  const title = lines[0].replace(/^TITLE:\s*/, "").trim();
  const body = lines.slice(2).join("\n");

  return { title, body };
}

async function main() {
  const config = loadConfig();

  if (!config.redditClientId || !config.redditUsername) {
    console.log("Reddit credentials not configured. Skipping.");
    return;
  }

  const apiKey = requireEnv("ANTHROPIC_API_KEY");
  const client = new Anthropic({ apiKey });

  const projects = await readProjectFiles();
  const publishedLog = await getPublishedLog();

  const promotable = projects.filter(
    (p: ProjectDefinition) => p.autoPromote === true
  );

  if (promotable.length === 0) {
    console.log("No projects with autoPromote: true.");
    return;
  }

  // 公開回数が最も少ないプロジェクトを選定
  const sorted = [...promotable].sort((a: ProjectDefinition, b: ProjectDefinition) => {
    const aCount = (publishedLog[a.slug] || []).length;
    const bCount = (publishedLog[b.slug] || []).length;
    return aCount - bCount;
  });
  const targetProject = sorted[0] as ProjectDefinition;

  console.log(`Target project: ${targetProject.nameJa || targetProject.name}`);

  // スケジュールチェック: reddit が対象か
  const schedulePlatforms = targetProject.schedule?.platforms || [
    "twitter", "zenn", "qiita", "blog", "devto", "reddit",
  ];
  if (!schedulePlatforms.includes("reddit")) {
    console.log("Reddit: スケジュール対象外のためスキップ");
    return;
  }

  // Reddit投稿を生成
  console.log("Generating Reddit post...");
  const post = await generateRedditPost(client, targetProject);

  // 投稿を保存
  const redditDir = path.join(CONTENT_DIR, "sns", "reddit");
  await fs.mkdir(redditDir, { recursive: true });
  const contentFilename = `${TODAY}-${targetProject.slug}.json`;
  await fs.writeFile(
    path.join(redditDir, contentFilename),
    JSON.stringify(post, null, 2),
    "utf-8"
  );
  console.log(`Saved: content/sns/reddit/${contentFilename}`);

  // 投稿済みログ読み込み
  const postedLogPath = path.join(redditDir, ".posted.json");
  let posted: PostedEntry[] = [];
  try {
    posted = JSON.parse(await fs.readFile(postedLogPath, "utf-8"));
  } catch {
    posted = [];
  }

  // Redditに投稿
  const accessToken = await getRedditAccessToken(config);
  const subreddits = SUBREDDIT_MAP[targetProject.category] || SUBREDDIT_MAP.other;
  const targetSubreddit = subreddits[0];

  console.log(`Posting to r/${targetSubreddit}...`);
  const result = await postToReddit(accessToken, targetSubreddit, post.title, post.body);
  console.log(`Reddit post successful! ID: ${result.postId}, URL: ${result.url}`);

  // 投稿ログ保存
  posted.push({
    filename: contentFilename,
    postId: result.postId,
    url: result.url,
    postedAt: TODAY,
    slug: targetProject.slug,
    subreddit: targetSubreddit,
  });
  await fs.writeFile(postedLogPath, JSON.stringify(posted, null, 2), "utf-8");
}

main().catch((err) => {
  console.error("Reddit post error:", err.message);
  process.exit(1);
});
