/**
 * post-mastodon.ts
 * 生成済みテキストをMastodon APIで自動投稿する。
 * content/sns/mastodon/ から未投稿の最古のファイルを1件投稿。
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
  statusId: string;
  url: string;
  postedAt: string;
  slug: string;
}

function extractSlugFromFilename(filename: string): string {
  const match = filename.match(/^\d{4}-\d{2}-\d{2}-(.+?)(?:-v\d+)?\.txt$/);
  return match ? match[1] : filename.replace(/\.txt$/, "");
}

async function main() {
  // プラットフォーム指定チェック
  const envPlatforms = process.env.TARGET_PLATFORMS?.trim() || "";
  if (envPlatforms) {
    const platforms = envPlatforms.split(",").map((s) => s.trim());
    if (!platforms.includes("mastodon")) {
      console.log("TARGET_PLATFORMS に mastodon が含まれていません。スキップします。");
      return;
    }
  }

  const config = loadConfig();

  if (!config.mastodonInstance || !config.mastodonAccessToken) {
    console.log("Mastodon credentials not configured. Skipping.");
    return;
  }

  const mastodonDir = path.join(CONTENT_DIR, "sns", "mastodon");
  const postedLogPath = path.join(mastodonDir, ".posted.json");

  let posted: PostedEntry[] = [];
  try {
    posted = JSON.parse(await fs.readFile(postedLogPath, "utf-8"));
  } catch {
    posted = [];
  }
  const postedFiles = new Set(posted.map((e) => e.filename));

  let files: string[];
  try {
    files = (await fs.readdir(mastodonDir))
      .filter((f) => f.endsWith(".txt") && !f.startsWith("."))
      .sort(); // 古い順
  } catch {
    console.log("No Mastodon post files found.");
    return;
  }

  const envSlug = process.env.TARGET_SLUG?.trim() || "";
  const unposted = files.filter((f) => !postedFiles.has(f));

  const targetFile = envSlug
    ? unposted.find((f) => f.includes(envSlug)) || unposted[0]
    : unposted[0];

  if (!targetFile) {
    console.log("No new Mastodon posts to publish.");
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
    if (!platforms.includes("mastodon")) {
      console.log(`Mastodon: ${project.name} のスケジュール対象外のためスキップ`);
      return;
    }
  }

  const postText = (
    await fs.readFile(path.join(mastodonDir, targetFile), "utf-8")
  ).trim();

  // 文字数チェック (500文字)
  if (postText.length > 500) {
    console.error(`Mastodon post too long: ${postText.length} chars (max 500)`);
    process.exit(1);
  }

  console.log(`Posting to Mastodon from: ${targetFile}`);
  console.log(`Content (${postText.length} chars):`);
  console.log(postText.substring(0, 100) + (postText.length > 100 ? "..." : ""));

  const instance = config.mastodonInstance.replace(/^https?:\/\//, "").replace(/\/$/, "");

  const response = await fetch(
    `https://${instance}/api/v1/statuses`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.mastodonAccessToken}`,
      },
      body: JSON.stringify({
        status: postText,
      }),
    }
  );

  if (!response.ok) {
    const errBody = await response.text();
    console.error(`Mastodon post error: ${response.status} ${errBody}`);
    process.exit(1);
  }

  const result = await response.json();
  console.log(`Mastodon post published! ID: ${result.id}`);
  console.log(`URL: ${result.url}`);

  posted.push({
    filename: targetFile,
    statusId: result.id,
    url: result.url,
    postedAt: TODAY,
    slug,
  });

  await fs.writeFile(postedLogPath, JSON.stringify(posted, null, 2), "utf-8");
}

main().catch((err) => {
  console.error("Mastodon post error:", err.message);
  process.exit(1);
});
