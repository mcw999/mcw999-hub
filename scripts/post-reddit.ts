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

// サブレディット別のプロンプト追加指示
const SUBREDDIT_PROMPTS: Record<string, string> = {
  cryptocurrency: `Focus on market analysis findings and data-driven insights. Share specific patterns or anomalies you discovered. The tool is mentioned only as "the analysis method I used" — never as a product recommendation.`,
  CryptoTechnology: `Focus on the technical implementation of crypto-related analysis. Discuss algorithms, data processing approaches, and architecture decisions. This is a technical audience.`,
  algotrading: `Focus purely on the algorithm and methodology. Share specific technical decisions (indicators used, thresholds, backtesting results). The audience cares about methodology, not products.`,
  sideproject: `Write in honest "Show HN" style. Share what you built, what challenges you faced, what metrics you have so far, and what you'd do differently. Be candid about both successes and failures.`,
  webdev: `Focus on the web development aspects — architecture decisions, framework choices, performance optimizations. Share code snippets and technical insights relevant to web developers.`,
  SaaS: `Discuss the business and technical aspects of building a SaaS product. Share metrics, user feedback, technical architecture decisions, and lessons from the journey.`,
};

async function generateRedditPost(
  client: Anthropic,
  project: ProjectDefinition,
  targetSubreddit: string
): Promise<{ title: string; body: string }> {
  const context = projectContextFull(project);
  const subredditContext = SUBREDDIT_PROMPTS[targetSubreddit] || SUBREDDIT_PROMPTS.sideproject;

  const system = `You are a member of the r/${targetSubreddit} community. Write a post sharing your genuine experience — something that contributes to the community, not promotes a product.

Subreddit-specific guidance:
${subredditContext}

Absolute rules:
- You are a community member, NOT a marketer
- NO promotional language ("check it out", "try it", "download", "sign up")
- The post must be valuable to readers even if they never use your tool
- English only
- First line: "TITLE: post title"
- Second line: empty
- Third line onward: post body
- 500-1000 words

Structure your post as:
1. A problem or question relevant to this community
2. What you've experienced or discovered
3. What worked and what didn't (be honest)
4. Questions for the community (invite genuine discussion)

Your tool/project may appear naturally as part of your experience, but it is NOT the focus.
Do NOT include links in the post body.`;

  const prompt = `Think about what would be a genuinely interesting discussion topic for r/${targetSubreddit}. Write a post that contributes to the community based on the experience of building/using the project described below.

${context}

First line must be "TITLE: post title".`;

  const model = "claude-sonnet-4-6-20250620";
  const raw = await client.messages.create({
    model,
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
    system,
  });

  await logUsage("reddit", `Reddit投稿生成 (r/${targetSubreddit})`, model, raw.usage);

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

  // 投稿済みログ読み込み
  const redditDir = path.join(CONTENT_DIR, "sns", "reddit");
  await fs.mkdir(redditDir, { recursive: true });
  const postedLogPath = path.join(redditDir, ".posted.json");
  let posted: PostedEntry[] = [];
  try {
    posted = JSON.parse(await fs.readFile(postedLogPath, "utf-8"));
  } catch {
    posted = [];
  }

  // サブレディット選定（カテゴリに基づくリストからローテーション）
  const subreddits = SUBREDDIT_MAP[targetProject.category] || SUBREDDIT_MAP.other;
  const projectPosts = posted.filter((e) => e.slug === targetProject.slug);
  const targetSubreddit = subreddits[projectPosts.length % subreddits.length];

  // 投稿間隔チェック: 同一サブレディットへの最低14日間隔
  const lastPostToSubreddit = posted
    .filter((e) => e.subreddit === targetSubreddit)
    .sort((a, b) => b.postedAt.localeCompare(a.postedAt))[0];

  if (lastPostToSubreddit) {
    const daysSinceLast = (Date.now() - new Date(lastPostToSubreddit.postedAt).getTime()) / (24 * 60 * 60 * 1000);
    if (daysSinceLast < 14) {
      console.log(`r/${targetSubreddit} への最終投稿から${Math.floor(daysSinceLast)}日経過（最低14日必要）。スキップします。`);
      return;
    }
  }

  // Reddit投稿を生成（サブレディット別プロンプト使用）
  console.log(`Generating Reddit post for r/${targetSubreddit}...`);
  const post = await generateRedditPost(client, targetProject, targetSubreddit);

  // 投稿を保存
  const contentFilename = `${TODAY}-${targetProject.slug}.json`;
  await fs.writeFile(
    path.join(redditDir, contentFilename),
    JSON.stringify({ ...post, subreddit: targetSubreddit }, null, 2),
    "utf-8"
  );
  console.log(`Saved: content/sns/reddit/${contentFilename}`);

  // Redditに投稿
  const accessToken = await getRedditAccessToken(config);

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
