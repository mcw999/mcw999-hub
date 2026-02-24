/**
 * post-hashnode.ts
 * 生成済みJSON記事をHashnode GraphQL APIで自動投稿する。
 * content/sns/hashnode/ から未投稿の最古のJSONファイルを1件投稿。
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
const HASHNODE_API = "https://gql.hashnode.com";

interface PostedEntry {
  filename: string;
  postId: string;
  url: string;
  postedAt: string;
  slug: string;
}

interface HashnodeArticle {
  title: string;
  body: string;
  tags: string[];
}

function extractSlugFromFilename(filename: string): string {
  const match = filename.match(/^\d{4}-\d{2}-\d{2}-(.+?)\.json$/);
  return match ? match[1] : filename.replace(/\.json$/, "");
}

async function graphqlRequest(pat: string, query: string, variables?: any): Promise<any> {
  const response = await fetch(HASHNODE_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: pat,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Hashnode API error: ${response.status} ${errBody}`);
  }

  const result = await response.json();
  if (result.errors) {
    throw new Error(`Hashnode GraphQL errors: ${JSON.stringify(result.errors)}`);
  }

  return result.data;
}

async function getPublicationId(pat: string): Promise<string> {
  const data = await graphqlRequest(
    pat,
    `query {
      me {
        publications(first: 1) {
          edges {
            node {
              id
            }
          }
        }
      }
    }`
  );

  const pubId = data?.me?.publications?.edges?.[0]?.node?.id;
  if (!pubId) {
    throw new Error("No Hashnode publication found. Create one at hashnode.com first.");
  }
  return pubId;
}

async function createPost(
  pat: string,
  publicationId: string,
  article: HashnodeArticle
): Promise<{ postId: string; url: string }> {
  const tags = article.tags.map((t) => ({
    slug: t.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name: t,
  }));

  const data = await graphqlRequest(
    pat,
    `mutation CreatePost($input: PublishPostInput!) {
      publishPost(input: $input) {
        post {
          id
          url
        }
      }
    }`,
    {
      input: {
        publicationId,
        title: article.title,
        contentMarkdown: article.body,
        tags,
      },
    }
  );

  const post = data?.publishPost?.post;
  if (!post) {
    throw new Error("Hashnode createPost returned no post data");
  }

  return { postId: post.id, url: post.url };
}

async function main() {
  // プラットフォーム指定チェック
  const envPlatforms = process.env.TARGET_PLATFORMS?.trim() || "";
  if (envPlatforms) {
    const platforms = envPlatforms.split(",").map((s) => s.trim());
    if (!platforms.includes("hashnode")) {
      console.log("TARGET_PLATFORMS に hashnode が含まれていません。スキップします。");
      return;
    }
  }

  const config = loadConfig();

  if (!config.hashnodePat) {
    console.log("Hashnode PAT not configured. Skipping.");
    return;
  }

  const hashnodeDir = path.join(CONTENT_DIR, "sns", "hashnode");
  const postedLogPath = path.join(hashnodeDir, ".posted.json");

  let posted: PostedEntry[] = [];
  try {
    posted = JSON.parse(await fs.readFile(postedLogPath, "utf-8"));
  } catch {
    posted = [];
  }
  const postedFiles = new Set(posted.map((e) => e.filename));

  let files: string[];
  try {
    files = (await fs.readdir(hashnodeDir))
      .filter((f) => f.endsWith(".json") && !f.startsWith("."))
      .sort(); // 古い順
  } catch {
    console.log("No Hashnode article files found.");
    return;
  }

  const envSlug = process.env.TARGET_SLUG?.trim() || "";
  const unposted = files.filter((f) => !postedFiles.has(f));

  const targetFile = envSlug
    ? unposted.find((f) => f.includes(envSlug)) || unposted[0]
    : unposted[0];

  if (!targetFile) {
    console.log("No new Hashnode articles to publish.");
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
      "qiita", "zenn", "devto", "hashnode", "bluesky", "mastodon", "github_releases", "blog",
    ];
    if (!platforms.includes("hashnode")) {
      console.log(`Hashnode: ${project.name} のスケジュール対象外のためスキップ`);
      return;
    }
  }

  // JSON記事を読み込み
  const articleRaw = await fs.readFile(
    path.join(hashnodeDir, targetFile),
    "utf-8"
  );
  const article: HashnodeArticle = JSON.parse(articleRaw);

  if (!article.title || !article.body) {
    console.error(`Invalid article file: ${targetFile} (missing title or body)`);
    process.exit(1);
  }

  console.log(`Publishing to Hashnode from: ${targetFile}`);
  console.log(`Title: ${article.title}`);
  console.log(`Body length: ${article.body.length} chars`);
  console.log(`Tags: ${(article.tags || []).join(", ")}`);

  // Publication ID 取得
  const publicationId = await getPublicationId(config.hashnodePat);
  console.log(`Publication ID: ${publicationId}`);

  // 記事を投稿
  const result = await createPost(config.hashnodePat, publicationId, article);
  console.log(`Hashnode article published! ID: ${result.postId}`);
  console.log(`URL: ${result.url}`);

  posted.push({
    filename: targetFile,
    postId: result.postId,
    url: result.url,
    postedAt: TODAY,
    slug,
  });

  await fs.writeFile(postedLogPath, JSON.stringify(posted, null, 2), "utf-8");
}

main().catch((err) => {
  console.error("Hashnode post error:", err.message);
  process.exit(1);
});
