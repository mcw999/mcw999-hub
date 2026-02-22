/**
 * fetch-analytics.ts
 * 各プラットフォームの投稿実績（閲覧数・いいね等）を取得し、
 * content/meta/analytics.json に保存する。
 */
import fs from "fs/promises";
import path from "path";
import { loadConfig, CONTENT_DIR } from "./lib/config";

const TODAY = new Date().toISOString().split("T")[0];
const ANALYTICS_PATH = path.join(CONTENT_DIR, "meta", "analytics.json");

interface PostMetrics {
  platform: string;
  title: string;
  url: string;
  postId: string;
  slug: string;
  postedAt: string;
  views: number | null;
  likes: number;
  comments: number;
  stocks: number | null;
  upvoteRatio: number | null;
}

interface PlatformSummary {
  platform: string;
  totalPosts: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
}

interface AnalyticsData {
  fetchedAt: string;
  posts: PostMetrics[];
  summaries: PlatformSummary[];
}

// --- Qiita ---
async function fetchQiitaMetrics(token: string): Promise<PostMetrics[]> {
  if (!token) return [];

  const response = await fetch(
    "https://qiita.com/api/v2/authenticated_user/items?per_page=100",
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!response.ok) {
    console.error(`Qiita API error: ${response.status}`);
    return [];
  }

  const items = await response.json();
  return items.map((item: any) => ({
    platform: "qiita",
    title: item.title,
    url: item.url,
    postId: item.id,
    slug: "",
    postedAt: item.created_at?.split("T")[0] || "",
    views: item.page_views_count ?? null,
    likes: item.likes_count || 0,
    comments: item.comments_count || 0,
    stocks: item.stocks_count ?? null,
    upvoteRatio: null,
  }));
}

// --- Dev.to ---
async function fetchDevtoMetrics(apiKey: string): Promise<PostMetrics[]> {
  if (!apiKey) return [];

  const response = await fetch(
    "https://dev.to/api/articles/me/published?per_page=100",
    { headers: { "api-key": apiKey } }
  );
  if (!response.ok) {
    console.error(`Dev.to API error: ${response.status}`);
    return [];
  }

  const articles = await response.json();
  return articles.map((a: any) => ({
    platform: "devto",
    title: a.title,
    url: a.url,
    postId: String(a.id),
    slug: a.slug || "",
    postedAt: a.published_at?.split("T")[0] || "",
    views: a.page_views_count ?? null,
    likes: a.positive_reactions_count || 0,
    comments: a.comments_count || 0,
    stocks: null,
    upvoteRatio: null,
  }));
}

// --- Reddit ---
async function fetchRedditMetrics(
  config: ReturnType<typeof loadConfig>
): Promise<PostMetrics[]> {
  if (!config.redditClientId || !config.redditUsername) return [];

  const auth = Buffer.from(
    `${config.redditClientId}:${config.redditClientSecret}`
  ).toString("base64");

  const tokenResponse = await fetch(
    "https://www.reddit.com/api/v1/access_token",
    {
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
    }
  );

  if (!tokenResponse.ok) {
    console.error(`Reddit auth error: ${tokenResponse.status}`);
    return [];
  }

  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.access_token;

  const postsResponse = await fetch(
    `https://oauth.reddit.com/user/${config.redditUsername}/submitted?limit=100&sort=new`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "mcw999-hub/1.0",
      },
    }
  );

  if (!postsResponse.ok) {
    console.error(`Reddit posts error: ${postsResponse.status}`);
    return [];
  }

  const postsData = await postsResponse.json();
  const posts = postsData?.data?.children || [];

  return posts.map((child: any) => {
    const p = child.data;
    return {
      platform: "reddit",
      title: p.title,
      url: `https://www.reddit.com${p.permalink}`,
      postId: p.name,
      slug: "",
      postedAt: new Date(p.created_utc * 1000).toISOString().split("T")[0],
      views: null,
      likes: p.ups || 0,
      comments: p.num_comments || 0,
      stocks: null,
      upvoteRatio: p.upvote_ratio ?? null,
    };
  });
}

// --- Twitter (ログベース。API読み取りは有料のためスキップ) ---
async function fetchTwitterMetrics(): Promise<PostMetrics[]> {
  const postedLogPath = path.join(
    CONTENT_DIR,
    "sns",
    "twitter",
    ".posted.json"
  );
  try {
    const raw = await fs.readFile(postedLogPath, "utf-8");
    const posted = JSON.parse(raw);
    return posted.map((entry: any) => ({
      platform: "twitter",
      title: entry.filename,
      url: `https://x.com/i/status/${entry.tweetId}`,
      postId: entry.tweetId || "",
      slug: entry.slug || "",
      postedAt: entry.postedAt || "",
      views: null,
      likes: 0,
      comments: 0,
      stocks: null,
      upvoteRatio: null,
    }));
  } catch {
    return [];
  }
}

function buildSummaries(posts: PostMetrics[]): PlatformSummary[] {
  const map = new Map<string, PlatformSummary>();

  for (const p of posts) {
    let summary = map.get(p.platform);
    if (!summary) {
      summary = {
        platform: p.platform,
        totalPosts: 0,
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0,
      };
      map.set(p.platform, summary);
    }
    summary.totalPosts++;
    summary.totalViews += p.views || 0;
    summary.totalLikes += p.likes;
    summary.totalComments += p.comments;
  }

  return Array.from(map.values());
}

async function main() {
  const config = loadConfig();

  console.log("Fetching analytics from all platforms...\n");

  const [qiita, devto, reddit, twitter] = await Promise.all([
    fetchQiitaMetrics(config.qiitaApiToken).then((r) => {
      console.log(`Qiita: ${r.length} articles`);
      return r;
    }),
    fetchDevtoMetrics(config.devtoApiKey).then((r) => {
      console.log(`Dev.to: ${r.length} articles`);
      return r;
    }),
    fetchRedditMetrics(config).then((r) => {
      console.log(`Reddit: ${r.length} posts`);
      return r;
    }),
    fetchTwitterMetrics().then((r) => {
      console.log(`Twitter: ${r.length} tweets (from log)`);
      return r;
    }),
  ]);

  const allPosts = [...qiita, ...devto, ...reddit, ...twitter];
  const summaries = buildSummaries(allPosts);

  const data: AnalyticsData = {
    fetchedAt: TODAY,
    posts: allPosts,
    summaries,
  };

  await fs.mkdir(path.dirname(ANALYTICS_PATH), { recursive: true });
  await fs.writeFile(ANALYTICS_PATH, JSON.stringify(data, null, 2), "utf-8");

  console.log(`\nSaved analytics: ${allPosts.length} posts total`);
  for (const s of summaries) {
    console.log(
      `  ${s.platform}: ${s.totalPosts} posts, ${s.totalViews} views, ${s.totalLikes} likes`
    );
  }
}

main().catch((err) => {
  console.error("Analytics fetch error:", err.message);
  process.exit(1);
});
