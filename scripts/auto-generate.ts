/**
 * auto-generate.ts
 * ユーザー獲得に特化したコンテンツを自動生成する。
 *
 * 各プラットフォームの役割:
 * - Twitter/X: ターゲットユーザーの悩みに刺さる短文投稿（アプリへの誘導）
 * - Zenn: ターゲットユーザーの課題解決記事（記事内でアプリを自然に紹介）
 * - Qiita: 同上（Zennとは異なる切り口）
 * - ブログ: アプリの使い方・活用事例（ランディングページ的役割）
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

function projectContext(project: ProjectDefinition): string {
  return `
アプリ名: ${project.nameJa || project.name}
一言説明: ${project.taglineJa || project.tagline}
詳細: ${project.descriptionJa || project.description}
ターゲットユーザー: ${project.targetAudience.join(", ")}
ユーザーの課題: ${project.userProblemJa || project.userProblem || "未設定"}
解決策: ${project.solutionJa || project.solution || "未設定"}
主な機能:
${project.features.map((f) => `- ${f.titleJa || f.title}: ${f.descriptionJa || f.description}`).join("\n")}
CTA: ${project.callToAction || "詳しくはこちら"}
URL: ${project.callToActionUrl || project.liveUrl || project.repositoryUrl || ""}
SNSキーワード: ${(project.promotionKeywords || project.tags).join(", ")}
`.trim();
}

// --- Twitter: ユーザーの悩みに刺さるツイート ---
async function generateTweets(
  client: Anthropic,
  project: ProjectDefinition
): Promise<string[]> {
  const system = `あなたはアプリのマーケターです。ターゲットユーザーに刺さるツイートを生成します。

絶対ルール:
- 技術スタックには一切触れない（React、TypeScript等は禁止）
- ユーザーの「悩み」「不便」「あるある」から入る
- アプリがその悩みをどう解決するか伝える
- 280文字以内（厳守）
- ハッシュタグはターゲットユーザーが検索するワードを使う（技術タグ禁止）
- ツイート本文のみを出力（説明不要）
- 3パターン生成し、---で区切る`;

  const prompt = `以下のアプリのターゲットユーザーに刺さるツイートを3パターン書いてください。
パターン: (1)課題提起型 (2)メリット訴求型 (3)体験談風

${projectContext(project)}

3つのツイートを---で区切って出力してください。`;

  const raw = await generateWithClaude(client, system, prompt);
  return raw.split("---").map((t) => t.trim()).filter(Boolean);
}

// --- Zenn: ターゲットユーザーの課題解決記事 ---
async function generateZennArticle(
  client: Anthropic,
  project: ProjectDefinition
): Promise<string> {
  const keywords = (project.promotionKeywords || project.tags).slice(0, 5);
  const system = `あなたはコンテンツマーケターです。ターゲットユーザーが検索しそうなテーマで記事を書きます。

絶対ルール:
- 記事のメインテーマはユーザーの「課題」と「解決方法」
- 技術的な実装の話はしない
- 記事の後半で自然にアプリを紹介する（宣伝臭を出さない）
- 読者が「役に立った」と思える実用的な内容にする
- Zennフロントマター形式で始める
- 1500〜3000字`;

  const prompt = `以下のアプリのターゲットユーザーが抱える課題をテーマに、解決策を紹介する記事を書いてください。
記事の流れ: 課題の共感 → 一般的な解決策 → より良い方法としてアプリを紹介

${projectContext(project)}

Zennフロントマター形式で始めてください:
---
title: "ユーザーの課題に関するタイトル（アプリ名を入れない）"
emoji: "適切な絵文字"
type: "idea"
topics: [${keywords.map((k) => `"${k}"`).join(", ")}]
published: true
---`;

  return generateWithClaude(client, system, prompt);
}

// --- Qiita: Zennとは異なる切り口の課題解決記事 ---
async function generateQiitaArticle(
  client: Anthropic,
  project: ProjectDefinition
): Promise<{ title: string; body: string; tags: string[] }> {
  const keywords = (project.promotionKeywords || project.tags).slice(0, 5);
  const system = `あなたはコンテンツマーケターです。ターゲットユーザー向けのハウツー記事を書きます。

絶対ルール:
- 「○○する方法」「○○の選び方」のような実用的なタイトル
- 技術的な実装の話はしない
- 記事の中で自然にアプリを紹介する（宣伝臭を出さない）
- 具体的なステップや比較を含める
- 最初の行は「TITLE: 記事タイトル」
- 2行目は空行、3行目から本文
- 1500〜3000字`;

  const prompt = `以下のアプリのターゲットユーザー向けに、実用的なハウツー記事を書いてください。
Zennには別の記事を書くので、こちらは「具体的な手順・比較・ランキング」形式にしてください。

${projectContext(project)}

最初の行は「TITLE: 記事タイトル」としてください。`;

  const raw = await generateWithClaude(client, system, prompt);
  const lines = raw.split("\n");
  const title = lines[0].replace(/^TITLE:\s*/, "").trim();
  const body = lines.slice(2).join("\n");

  return { title, body, tags: keywords };
}

// --- ブログ: アプリの使い方・活用事例 ---
async function generateBlogPost(
  client: Anthropic,
  project: ProjectDefinition
): Promise<string> {
  const slug = `${project.slug}-guide`;
  const system = `あなたはアプリの公式ブログライターです。アプリの活用ガイドを書きます。

絶対ルール:
- ユーザー目線で書く（開発者目線にしない）
- アプリの使い方、活用シーン、メリットを伝える
- 「このアプリを使えば○○ができる」という価値提案
- MDXフロントマター形式で始める
- 日本語で書く
- 1000〜2000字`;

  const prompt = `以下のアプリの活用ガイド記事を書いてください。
想定読者はアプリのターゲットユーザーです。

${projectContext(project)}

以下のフロントマター形式で始めてください:
---
title: "英語タイトル"
titleJa: "日本語タイトル"
slug: "${slug}"
date: "${TODAY}"
tags: [${(project.promotionKeywords || project.tags).slice(0, 4).map((t) => `"${t}"`).join(", ")}]
description: "英語説明"
descriptionJa: "日本語説明"
project: "${project.slug}"
published: true
---`;

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

  // 1. Twitter投稿生成（3パターン）
  console.log("Generating tweets...");
  const tweets = await generateTweets(client, targetProject);
  const twitterDir = path.join(CONTENT_DIR, "sns", "twitter");
  await fs.mkdir(twitterDir, { recursive: true });
  // 1つ目を今回投稿用、残りはストックとして保存
  for (let i = 0; i < tweets.length; i++) {
    const suffix = i === 0 ? "" : `-v${i + 1}`;
    await fs.writeFile(
      path.join(twitterDir, `${TODAY}-${targetProject.slug}${suffix}.txt`),
      tweets[i],
      "utf-8"
    );
  }
  console.log(`  Saved ${tweets.length} tweets`);

  // 2. Zenn記事生成
  console.log("Generating Zenn article...");
  const zennArticle = await generateZennArticle(client, targetProject);
  const zennSlug = `${TODAY.replace(/-/g, "")}-${targetProject.slug}`;
  await fs.mkdir(ARTICLES_DIR, { recursive: true });
  await fs.writeFile(path.join(ARTICLES_DIR, `${zennSlug}.md`), zennArticle, "utf-8");
  console.log(`  Saved: articles/${zennSlug}.md`);

  // 3. Qiita記事生成
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

  // 4. ブログ記事生成
  console.log("Generating blog post...");
  const blogPost = await generateBlogPost(client, targetProject);
  const blogDir = path.join(CONTENT_DIR, "blog");
  await fs.mkdir(blogDir, { recursive: true });
  await fs.writeFile(
    path.join(blogDir, `${targetProject.slug}-guide.mdx`),
    blogPost,
    "utf-8"
  );
  console.log(`  Saved: content/blog/${targetProject.slug}-guide.mdx`);

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
