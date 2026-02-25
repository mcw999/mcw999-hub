/**
 * fetch-analytics.ts
 * 各プラットフォームの投稿実績（閲覧数・いいね等）を取得し、
 * content/meta/analytics.json に保存する。
 */
import fs from "fs/promises";
import path from "path";
import { loadConfig, CONTENT_DIR } from "./lib/config";

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

// --- Hashnode ---
async function fetchHashnodeMetrics(pat: string): Promise<PostMetrics[]> {
  if (!pat) return [];

  try {
    const meRes = await fetch("https://gql.hashnode.com", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: pat,
      },
      body: JSON.stringify({
        query: `query {
          me {
            publications(first: 1) {
              edges {
                node {
                  id
                  posts(first: 50) {
                    edges {
                      node {
                        id
                        title
                        url
                        slug
                        publishedAt
                        views
                        reactionCount
                        responseCount
                      }
                    }
                  }
                }
              }
            }
          }
        }`,
      }),
    });

    if (!meRes.ok) {
      console.error(`Hashnode API error: ${meRes.status}`);
      return [];
    }

    const data = await meRes.json();
    if (data.errors) {
      console.error(`Hashnode GraphQL errors: ${JSON.stringify(data.errors)}`);
    }
    const posts = data?.data?.me?.publications?.edges?.[0]?.node?.posts?.edges || [];
    if (posts.length === 0) {
      // デバッグ: レスポンス構造を表示
      const pubCount = data?.data?.me?.publications?.edges?.length || 0;
      console.error(`Hashnode debug: ${pubCount} publications found, 0 posts`);
    }

    return posts.map((edge: any) => {
      const p = edge.node;
      return {
        platform: "hashnode",
        title: p.title,
        url: p.url,
        postId: p.id,
        slug: p.slug || "",
        postedAt: p.publishedAt?.split("T")[0] || "",
        views: p.views ?? null,
        likes: p.reactionCount || 0,
        comments: p.responseCount || 0,
        stocks: null,
        upvoteRatio: null,
      };
    });
  } catch (err: any) {
    console.error(`Hashnode fetch error: ${err.message}`);
    return [];
  }
}

// --- Bluesky ---
async function fetchBlueskyMetrics(
  handle: string,
  appPassword: string
): Promise<PostMetrics[]> {
  if (!handle || !appPassword) return [];

  try {
    // セッション作成
    const sessionRes = await fetch(
      "https://bsky.social/xrpc/com.atproto.server.createSession",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: handle,
          password: appPassword,
        }),
      }
    );

    if (!sessionRes.ok) {
      console.error(`Bluesky session error: ${sessionRes.status}`);
      return [];
    }

    const session = await sessionRes.json();

    // 自分のフィードを取得
    const feedRes = await fetch(
      `https://bsky.social/xrpc/app.bsky.feed.getAuthorFeed?actor=${session.did}&limit=50`,
      {
        headers: { Authorization: `Bearer ${session.accessJwt}` },
      }
    );

    if (!feedRes.ok) {
      console.error(`Bluesky feed error: ${feedRes.status}`);
      return [];
    }

    const feedData = await feedRes.json();
    const feed = feedData?.feed || [];

    return feed.map((item: any) => {
      const post = item.post;
      const text = post.record?.text || "";
      return {
        platform: "bluesky",
        title: text.substring(0, 80) + (text.length > 80 ? "..." : ""),
        url: `https://bsky.app/profile/${handle}/post/${post.uri.split("/").pop()}`,
        postId: post.uri,
        slug: "",
        postedAt: post.record?.createdAt?.split("T")[0] || "",
        views: null,
        likes: post.likeCount || 0,
        comments: post.replyCount || 0,
        stocks: null,
        upvoteRatio: null,
      };
    });
  } catch (err: any) {
    console.error(`Bluesky fetch error: ${err.message}`);
    return [];
  }
}

// --- Mastodon ---
async function fetchMastodonMetrics(
  instance: string,
  token: string
): Promise<PostMetrics[]> {
  if (!instance || !token) return [];

  const host = instance.replace(/^https?:\/\//, "").replace(/\/$/, "");

  try {
    // 自分のアカウント情報を取得
    const meRes = await fetch(`https://${host}/api/v1/accounts/verify_credentials`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!meRes.ok) {
      console.error(`Mastodon verify error: ${meRes.status}`);
      return [];
    }

    const me = await meRes.json();
    console.error(`Mastodon debug: account @${me.username}, statuses_count=${me.statuses_count}`);

    // 自分のステータスを取得
    const statusesRes = await fetch(
      `https://${host}/api/v1/accounts/${me.id}/statuses?limit=40&exclude_replies=true&exclude_reblogs=true`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!statusesRes.ok) {
      console.error(`Mastodon statuses error: ${statusesRes.status}`);
      return [];
    }

    const statuses = await statusesRes.json();

    return statuses.map((s: any) => {
      const text = s.content?.replace(/<[^>]*>/g, "") || "";
      return {
        platform: "mastodon",
        title: text.substring(0, 80) + (text.length > 80 ? "..." : ""),
        url: s.url,
        postId: s.id,
        slug: "",
        postedAt: s.created_at?.split("T")[0] || "",
        views: null,
        likes: s.favourites_count || 0,
        comments: s.replies_count || 0,
        stocks: null,
        upvoteRatio: null,
      };
    });
  } catch (err: any) {
    console.error(`Mastodon fetch error: ${err.message}`);
    return [];
  }
}

// --- Blog (PVログベース: GitHub Traffic API形式) ---
async function fetchBlogMetrics(): Promise<PostMetrics[]> {
  const trafficPath = path.join(CONTENT_DIR, "meta", "traffic-history.json");
  try {
    const raw = await fs.readFile(trafficPath, "utf-8");
    const traffic = JSON.parse(raw);

    // traffic-history.json 形式: { fetchedAt, daily: [{date, count, uniques}], totalViews, totalUniques }
    if (traffic.daily && Array.isArray(traffic.daily)) {
      // 日次PVデータをサマリーとして1エントリにまとめる
      const totalViews = traffic.totalViews || 0;
      const totalUniques = traffic.totalUniques || 0;
      const pvDays = traffic.daily.filter((d: any) => d.count > 0);

      return [{
        platform: "blog",
        title: "GitHub Pages (Total)",
        url: "https://mcw999.github.io/mcw999-hub/",
        postId: "blog-total",
        slug: "",
        postedAt: traffic.fetchedAt?.split("T")[0] || "",
        views: totalViews,
        likes: totalUniques, // uniques を likes フィールドで代用
        comments: pvDays.length, // PVがあった日数
        stocks: null,
        upvoteRatio: null,
      }];
    }

    return [];
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

  const [qiita, devto, hashnode, bluesky, mastodon, blog] = await Promise.all([
    fetchQiitaMetrics(config.qiitaApiToken).then((r) => {
      console.log(`Qiita: ${r.length} articles`);
      return r;
    }),
    fetchDevtoMetrics(config.devtoApiKey).then((r) => {
      console.log(`Dev.to: ${r.length} articles`);
      return r;
    }),
    fetchHashnodeMetrics(config.hashnodePat).then((r) => {
      console.log(`Hashnode: ${r.length} articles`);
      return r;
    }),
    fetchBlueskyMetrics(config.blueskyHandle, config.blueskyAppPassword).then((r) => {
      console.log(`Bluesky: ${r.length} posts`);
      return r;
    }),
    fetchMastodonMetrics(config.mastodonInstance, config.mastodonAccessToken).then((r) => {
      console.log(`Mastodon: ${r.length} posts`);
      return r;
    }),
    fetchBlogMetrics().then((r) => {
      console.log(`Blog: ${r.length} pages`);
      return r;
    }),
  ]);

  const allPosts = [...qiita, ...devto, ...hashnode, ...bluesky, ...mastodon, ...blog];
  const summaries = buildSummaries(allPosts);

  const data: AnalyticsData = {
    fetchedAt: new Date().toISOString(),
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
