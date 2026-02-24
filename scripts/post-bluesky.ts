/**
 * post-bluesky.ts
 * 生成済みテキストをBluesky (AT Protocol) で自動投稿する。
 * content/sns/bluesky/ から未投稿の最古のファイルを1件投稿。
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
  uri: string;
  cid: string;
  postedAt: string;
  slug: string;
}

function extractSlugFromFilename(filename: string): string {
  const match = filename.match(/^\d{4}-\d{2}-\d{2}-(.+?)(?:-v\d+)?\.txt$/);
  return match ? match[1] : filename.replace(/\.txt$/, "");
}

/** URL を検出して Bluesky facets (リッチテキスト) を生成する */
function detectFacets(text: string): any[] {
  const facets: any[] = [];
  const urlRegex = /https?:\/\/[^\s)>\]]+/g;
  let match;

  while ((match = urlRegex.exec(text)) !== null) {
    const url = match[0];
    // Bluesky は UTF-8 バイト位置を使用する
    const beforeBytes = Buffer.byteLength(text.slice(0, match.index), "utf-8");
    const urlBytes = Buffer.byteLength(url, "utf-8");

    facets.push({
      index: {
        byteStart: beforeBytes,
        byteEnd: beforeBytes + urlBytes,
      },
      features: [
        {
          $type: "app.bsky.richtext.facet#link",
          uri: url,
        },
      ],
    });
  }

  return facets;
}

/** grapheme 単位での文字数カウント */
function graphemeLength(text: string): number {
  // Intl.Segmenter が利用可能な環境では正確なgrapheme計算
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter("ja", { granularity: "grapheme" });
    return [...segmenter.segment(text)].length;
  }
  // フォールバック: Array.from で概算
  return Array.from(text).length;
}

async function main() {
  // プラットフォーム指定チェック
  const envPlatforms = process.env.TARGET_PLATFORMS?.trim() || "";
  if (envPlatforms) {
    const platforms = envPlatforms.split(",").map((s) => s.trim());
    if (!platforms.includes("bluesky")) {
      console.log("TARGET_PLATFORMS に bluesky が含まれていません。スキップします。");
      return;
    }
  }

  const config = loadConfig();

  if (!config.blueskyHandle || !config.blueskyAppPassword) {
    console.log("Bluesky credentials not configured. Skipping.");
    return;
  }

  // セッション作成 (AT Protocol)
  const sessionRes = await fetch(
    "https://bsky.social/xrpc/com.atproto.server.createSession",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: config.blueskyHandle,
        password: config.blueskyAppPassword,
      }),
    }
  );

  if (!sessionRes.ok) {
    const errBody = await sessionRes.text();
    console.error(`Bluesky session error: ${sessionRes.status} ${errBody}`);
    process.exit(1);
  }

  const session = await sessionRes.json();
  const { did, accessJwt } = session;

  const blueskyDir = path.join(CONTENT_DIR, "sns", "bluesky");
  const postedLogPath = path.join(blueskyDir, ".posted.json");

  let posted: PostedEntry[] = [];
  try {
    posted = JSON.parse(await fs.readFile(postedLogPath, "utf-8"));
  } catch {
    posted = [];
  }
  const postedFiles = new Set(posted.map((e) => e.filename));

  let files: string[];
  try {
    files = (await fs.readdir(blueskyDir))
      .filter((f) => f.endsWith(".txt") && !f.startsWith("."))
      .sort(); // 古い順
  } catch {
    console.log("No Bluesky post files found.");
    return;
  }

  const envSlug = process.env.TARGET_SLUG?.trim() || "";
  const unposted = files.filter((f) => !postedFiles.has(f));

  const targetFile = envSlug
    ? unposted.find((f) => f.includes(envSlug)) || unposted[0]
    : unposted[0];

  if (!targetFile) {
    console.log("No new Bluesky posts to publish.");
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
    if (!platforms.includes("bluesky")) {
      console.log(`Bluesky: ${project.name} のスケジュール対象外のためスキップ`);
      return;
    }
  }

  const postText = (
    await fs.readFile(path.join(blueskyDir, targetFile), "utf-8")
  ).trim();

  // 文字数チェック (300 grapheme)
  const charCount = graphemeLength(postText);
  if (charCount > 300) {
    console.error(`Bluesky post too long: ${charCount} graphemes (max 300)`);
    process.exit(1);
  }

  console.log(`Posting to Bluesky from: ${targetFile}`);
  console.log(`Content (${charCount} graphemes):`);
  console.log(postText.substring(0, 100) + (postText.length > 100 ? "..." : ""));

  // facets 生成 (URL リンク化)
  const facets = detectFacets(postText);

  const record: any = {
    $type: "app.bsky.feed.post",
    text: postText,
    createdAt: new Date().toISOString(),
  };
  if (facets.length > 0) {
    record.facets = facets;
  }

  const createRes = await fetch(
    "https://bsky.social/xrpc/com.atproto.repo.createRecord",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessJwt}`,
      },
      body: JSON.stringify({
        repo: did,
        collection: "app.bsky.feed.post",
        record,
      }),
    }
  );

  if (!createRes.ok) {
    const errBody = await createRes.text();
    console.error(`Bluesky post error: ${createRes.status} ${errBody}`);
    process.exit(1);
  }

  const result = await createRes.json();
  console.log(`Bluesky post published! URI: ${result.uri}`);

  posted.push({
    filename: targetFile,
    uri: result.uri,
    cid: result.cid,
    postedAt: TODAY,
    slug,
  });

  await fs.writeFile(postedLogPath, JSON.stringify(posted, null, 2), "utf-8");
}

main().catch((err) => {
  console.error("Bluesky post error:", err.message);
  process.exit(1);
});
