/**
 * auto-generate.ts
 * Claude APIを使ってブログ記事・SNS投稿を自動生成する。
 * GitHub Actionsから週次で呼ばれる。
 */
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs/promises";
import path from "path";
import {
  requireEnv,
  CONTENT_DIR,
  ARTICLES_DIR,
  readProjectFiles,
  getPublishedLog,
  savePublishedLog,
} from "./lib/config";
import type { ProjectDefinition } from "../src/lib/types";

const TODAY = new Date().toISOString().split("T")[0];

async function generateWithClaude(
  client: Anthropic,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [{ role: "user", content: userPrompt }],
    system: systemPrompt,
  });
  const block = response.content[0];
  if (block.type === "text") return block.text;
  throw new Error("Unexpected response type");
}

// --- Zenn記事生成 ---
async function generateZennArticle(
  client: Anthropic,
  project: ProjectDefinition
): Promise<string> {
  const system = `あなたは日本語の技術ブログライターです。Zennに投稿する技術記事を書いてください。
以下のルールを守ること:
- Zennのフロントマター形式で始める
- 実用的で読者の役に立つ内容にする
- 1500〜3000字程度
- コードブロックを適宜含める
- 自然な日本語で書く`;

  const prompt = `以下のプロジェクト情報をもとに、技術記事を1本書いてください。

プロジェクト名: ${project.nameJa || project.name}
説明: ${project.descriptionJa || project.description}
技術スタック: ${project.techStack.join(", ")}
機能:
${project.features.map((f) => `- ${f.titleJa || f.title}: ${f.descriptionJa || f.description}`).join("\n")}

記事は以下のZennフロントマター形式で始めてください:
---
title: "記事タイトル"
emoji: "適切な絵文字"
type: "tech"
topics: [${project.techStack.slice(0, 5).map((t) => `"${t}"`).join(", ")}]
published: true
---

技術選定の理由、実装のポイント、工夫した点を中心に書いてください。`;

  return generateWithClaude(client, system, prompt);
}

// --- Qiita記事生成 ---
async function generateQiitaArticle(
  client: Anthropic,
  project: ProjectDefinition
): Promise<{ title: string; body: string; tags: string[] }> {
  const system = `あなたは日本語の技術ブログライターです。Qiitaに投稿する技術記事を書いてください。
以下のルールを守ること:
- タイトルは1行目に「# タイトル」として書く
- 実用的で読者の役に立つ内容にする
- 1500〜3000字程度
- コードブロックを適宜含める
- 最初の行は必ず「TITLE: 記事のタイトル」とする
- 2行目は空行、3行目から本文`;

  const prompt = `以下のプロジェクト情報をもとに、Qiita向け技術記事を1本書いてください。

プロジェクト名: ${project.nameJa || project.name}
説明: ${project.descriptionJa || project.description}
技術スタック: ${project.techStack.join(", ")}
機能:
${project.features.map((f) => `- ${f.titleJa || f.title}: ${f.descriptionJa || f.description}`).join("\n")}

最初の行は必ず「TITLE: 記事のタイトル」としてください。2行目は空行。3行目から記事本文を書いてください。`;

  const raw = await generateWithClaude(client, system, prompt);
  const lines = raw.split("\n");
  const titleLine = lines[0];
  const title = titleLine.replace(/^TITLE:\s*/, "").trim();
  const body = lines.slice(2).join("\n");
  const tags = project.techStack.slice(0, 5);

  return { title, body, tags };
}

// --- Twitter投稿生成 ---
async function generateTweet(
  client: Anthropic,
  project: ProjectDefinition
): Promise<string> {
  const system = `あなたはSNSマーケターです。Twitter/Xに投稿するツイートを生成してください。
ルール:
- 日本語で書く
- 280文字以内（厳守）
- ハッシュタグを2〜3個含める
- 読者の興味を引く内容にする
- ツイート本文のみを出力する（説明や注釈は不要）`;

  const prompt = `以下のプロジェクトを紹介するツイートを1つ書いてください。

プロジェクト名: ${project.nameJa || project.name}
説明: ${project.taglineJa || project.tagline}
技術スタック: ${project.techStack.join(", ")}
主な機能:
${project.features.slice(0, 3).map((f) => `- ${f.titleJa || f.title}`).join("\n")}

ツイート本文のみを出力してください。`;

  return generateWithClaude(client, system, prompt);
}

// --- ブログ記事生成 ---
async function generateBlogPost(
  client: Anthropic,
  project: ProjectDefinition
): Promise<string> {
  const system = `あなたは個人開発者のブログライターです。ポートフォリオサイトのブログ記事を書いてください。
ルール:
- MDXフロントマター形式で始める
- 日本語で書く
- 1000〜2000字程度
- 技術的な内容と開発ストーリーを含める`;

  const slug = `${project.slug}-dev-story`;
  const prompt = `以下のプロジェクトについてブログ記事を書いてください。

プロジェクト名: ${project.nameJa || project.name}
説明: ${project.descriptionJa || project.description}
技術スタック: ${project.techStack.join(", ")}
機能:
${project.features.map((f) => `- ${f.titleJa || f.title}: ${f.descriptionJa || f.description}`).join("\n")}

以下のフロントマター形式で始めてください:
---
title: "英語タイトル"
titleJa: "日本語タイトル"
slug: "${slug}"
date: "${TODAY}"
tags: [${project.tags.slice(0, 4).map((t) => `"${t}"`).join(", ")}]
description: "英語説明"
descriptionJa: "日本語説明"
project: "${project.slug}"
published: true
---

フロントマターの後に記事本文を書いてください。`;

  return generateWithClaude(client, system, prompt);
}

// --- メインオーケストレーション ---
async function main() {
  const apiKey = requireEnv("ANTHROPIC_API_KEY");
  const client = new Anthropic({ apiKey });

  const projects = await readProjectFiles();
  const publishedLog = await getPublishedLog();

  // autoPromote: true のプロジェクトのみ対象
  const promotable = projects
    .filter((p: ProjectDefinition) => p.autoPromote === true)
    .sort((a: ProjectDefinition, b: ProjectDefinition) => {
      const aCount = (publishedLog[a.slug] || []).length;
      const bCount = (publishedLog[b.slug] || []).length;
      return aCount - bCount;
    });

  if (promotable.length === 0) {
    console.log("No projects with autoPromote: true. Exiting.");
    console.log("Set \"autoPromote\": true in content/projects/<slug>.json to enable.");
    return;
  }

  const targetProject = promotable[0] as ProjectDefinition;

  console.log(`Target project: ${targetProject.nameJa || targetProject.name}\n`);

  // 1. Zenn記事生成
  console.log("Generating Zenn article...");
  const zennArticle = await generateZennArticle(client, targetProject);
  const zennSlug = `${TODAY.replace(/-/g, "")}-${targetProject.slug}`;
  await fs.mkdir(ARTICLES_DIR, { recursive: true });
  await fs.writeFile(path.join(ARTICLES_DIR, `${zennSlug}.md`), zennArticle, "utf-8");
  console.log(`  Saved: articles/${zennSlug}.md`);

  // 2. Qiita記事生成
  console.log("Generating Qiita article...");
  const qiitaArticle = await generateQiitaArticle(client, targetProject);
  const qiitaDir = path.join(CONTENT_DIR, "sns", "qiita");
  await fs.mkdir(qiitaDir, { recursive: true });
  await fs.writeFile(
    path.join(qiitaDir, `${TODAY}-${targetProject.slug}.json`),
    JSON.stringify(qiitaArticle, null, 2),
    "utf-8"
  );
  console.log(`  Saved: content/sns/qiita/${TODAY}-${targetProject.slug}.json`);

  // 3. Twitter投稿生成
  console.log("Generating tweet...");
  const tweet = await generateTweet(client, targetProject);
  const twitterDir = path.join(CONTENT_DIR, "sns", "twitter");
  await fs.mkdir(twitterDir, { recursive: true });
  await fs.writeFile(
    path.join(twitterDir, `${TODAY}-${targetProject.slug}.txt`),
    tweet,
    "utf-8"
  );
  console.log(`  Saved: content/sns/twitter/${TODAY}-${targetProject.slug}.txt`);

  // 4. ブログ記事生成
  console.log("Generating blog post...");
  const blogPost = await generateBlogPost(client, targetProject);
  const blogDir = path.join(CONTENT_DIR, "blog");
  await fs.mkdir(blogDir, { recursive: true });
  await fs.writeFile(
    path.join(blogDir, `${targetProject.slug}-dev-story.mdx`),
    blogPost,
    "utf-8"
  );
  console.log(`  Saved: content/blog/${targetProject.slug}-dev-story.mdx`);

  // 5. 公開ログ更新
  if (!publishedLog[targetProject.slug]) {
    publishedLog[targetProject.slug] = [];
  }
  publishedLog[targetProject.slug].push(TODAY);
  await savePublishedLog(publishedLog);

  console.log("\nAll content generated successfully!");
  console.log(`  Project: ${targetProject.nameJa || targetProject.name}`);
  console.log(`  Date: ${TODAY}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
