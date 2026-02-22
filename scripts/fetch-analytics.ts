/**
 * fetch-analytics.ts
 * 各プラットフォームのAPIからアナリティクスデータを取得し、
 * content/meta/analytics.json に保存する。
 * GitHub Actionsで定期実行される想定。
 */
import fs from "fs/promises";
import path from "path";
import { loadConfig, CONTENT_DIR } from "./lib/config";

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

interface PostedEntry {
  filename: string;
  postId: string;
  url: string;
  postedAt: string;
  slug: string;
  subreddit?: string;
}

// --- Qiita API ---

async function fetchQiita(token: string): Promise<PostMetrics[]> {
  if (!token) return [];

  const response = await fetch(
    "https://qiita.com/api/v2/authenticated_user/items?per_page=100",
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!response.ok) {
    console.warn(`Qiita API error: ${response.status}`);
    return [];
  }

  const items: any[] = await response.json();
  return items.map((item) => ({
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

// --- Dev.to API ---

async function fetchDevto(apiKey: string): Promise<PostMetrics[]> {
  if (!apiKey) return [];

  const response = await fetch(
    "https://dev.to/api/articles/me?per_page=100",
    { headers: { "api-key": apiKey } }
  );

  if (!response.ok) {
    console.warn(`Dev.to API error: ${response.status}`);
    return [];
  }

  const articles: any[] = await response.json();
  return articles.map((a) => ({
    platform: "devto",
    title: a.title,
    url: a.url,
    postId: String(a.id),
    slug: "",
    postedAt: a.published_at?.split("T")[0] || "",
    views: a.page_views_count ?? null,
    likes: a.positive_reactions_count || 0,
    comments: a.comments_count || 0,
    stocks: null,
    upvoteRatio: null,
  }));
}

// --- Reddit API ---

async function fetchReddit(postedEntries: PostedEntry[]): Promise<PostMetrics[]> {
  const ids = postedEntries
    .filter((e) => e.postId)
    .map((e) => e.postId);

  if (ids.length === 0) return [];

  const response = await fetch(
    `https://www.reddit.com/api/info.json?id=${ids.join(",")}`,
    { headers: { "User-Agent": "mcw999-hub/1.0" } }
  );

  if (!response.ok) {
    console.warn(`Reddit API error: ${response.status}`);
    return [];
  }

  const data = await response.json();
  const children = data?.data?.children || [];

  const slugMap = new Map(
    postedEntries
      .filter((e) => e.postId)
      .map((e) => [e.postId, e.slug])
  );

  return children.map((child: any) => {
    const d = child.data;
    const createdDate = new Date(d.created_utc * 1000)
      .toISOString()
      .split("T")[0];
    return {
      platform: "reddit",
      title: d.title,
      url: `https://www.reddit.com${d.permalink}`,
      postId: d.name,
      slug: slugMap.get(d.name) || "",
      postedAt: createdDate,
      views: null,
      likes: Math.max(0, d.score || 0),
      comments: d.num_comments || 0,
      stocks: null,
      upvoteRatio: d.upvote_ratio ?? null,
    };
  });
}

// --- サマリー計算 ---

function computeSummary(platform: string, posts: PostMetrics[]): PlatformSummary {
  const filtered = posts.filter((p) => p.platform === platform);
  return {
    platform,
    totalPosts: filtered.length,
    totalViews: filtered.reduce((s, p) => s + (p.views ?? 0), 0),
    totalLikes: filtered.reduce((s, p) => s + p.likes, 0),
    totalComments: filtered.reduce((s, p) => s + p.comments, 0),
  };
}

// --- メイン ---

async function main() {
  const config = loadConfig();

  // Reddit posted log 読み込み
  const redditLogPath = path.join(CONTENT_DIR, "sns", "reddit", ".posted.json");
  let redditEntries: PostedEntry[] = [];
  try {
    redditEntries = JSON.parse(await fs.readFile(redditLogPath, "utf-8"));
  } catch {
    // ファイルがなければ空
  }

  console.log("Fetching analytics...");

  const [qiitaPosts, devtoPosts, redditPosts] = await Promise.all([
    fetchQiita(config.qiitaApiToken),
    fetchDevto(config.devtoApiKey),
    fetchReddit(redditEntries),
  ]);

  console.log(`  Qiita: ${qiitaPosts.length} posts`);
  console.log(`  Dev.to: ${devtoPosts.length} posts`);
  console.log(`  Reddit: ${redditPosts.length} posts`);

  const allPosts = [...qiitaPosts, ...devtoPosts, ...redditPosts];
  allPosts.sort((a, b) => b.postedAt.localeCompare(a.postedAt));

  const analytics: AnalyticsData = {
    fetchedAt: new Date().toISOString(),
    posts: allPosts,
    summaries: [
      computeSummary("qiita", allPosts),
      computeSummary("devto", allPosts),
      computeSummary("reddit", allPosts),
    ],
  };

  const metaDir = path.join(CONTENT_DIR, "meta");
  await fs.mkdir(metaDir, { recursive: true });

  const outputPath = path.join(metaDir, "analytics.json");
  await fs.writeFile(outputPath, JSON.stringify(analytics, null, 2), "utf-8");
  console.log(`Analytics saved to content/meta/analytics.json (${allPosts.length} posts)`);
}

main().catch((err) => {
  console.error("Analytics fetch error:", err.message);
  process.exit(1);
});
