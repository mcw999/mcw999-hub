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
  projectContextForTwitter,
  projectContextFull,
} from "./lib/config";
import { logUsage } from "./lib/usage-logger";
import type { ProjectDefinition } from "../src/lib/types";

const TODAY = new Date().toISOString().split("T")[0];

// --- 記事の切り口定義 ---
const ZENN_ANGLES = [
  {
    id: "beginner-guide",
    label: "初心者向けガイド",
    instruction: "初心者が最初に知るべきことを段階的に解説する記事。専門用語は噛み砕いて説明し、読者が「自分にもできそう」と思える内容にする。",
  },
  {
    id: "comparison",
    label: "比較・選び方記事",
    instruction: "複数の方法やツールを比較し、読者が最適な選択をできるようにする記事。表や箇条書きで違いを明確にし、最終的にアプリを自然に推薦する。",
  },
  {
    id: "failure-lessons",
    label: "失敗談からの学び",
    instruction: "よくある失敗パターンを紹介し、そこから学べる教訓を伝える記事。「自分も同じミスをしていた」と共感を呼ぶ構成にし、解決策としてアプリを紹介する。",
  },
  {
    id: "trend-analysis",
    label: "トレンド解説",
    instruction: "最新のトレンドや市場動向を解説する記事。データや事例を交えて説得力を持たせ、トレンドに対応する手段としてアプリを紹介する。",
  },
  {
    id: "practical-tips",
    label: "実践Tips集",
    instruction: "すぐに使える実践的なTipsを5〜7個紹介する記事。各Tipは具体的で再現性があり、その中の1つとしてアプリの活用法を含める。",
  },
];

const QIITA_ANGLES = [
  {
    id: "howto-steps",
    label: "ステップバイステップ手順",
    instruction: "具体的な手順を1-2-3形式で解説する記事。読者がそのまま実行できるレベルの詳細さで、途中でアプリを活用するステップを含める。",
  },
  {
    id: "ranking",
    label: "ランキング・まとめ",
    instruction: "カテゴリ内のツールや手法をランキング形式でまとめる記事。客観的な評価基準を示し、アプリを上位に自然にランクインさせる。",
  },
  {
    id: "problem-solving",
    label: "課題解決フロー",
    instruction: "特定の課題を取り上げ、診断→分析→解決の流れで記事を構成する。課題の原因を深掘りし、根本的な解決策としてアプリを紹介する。",
  },
  {
    id: "case-study",
    label: "活用事例・ユースケース",
    instruction: "実際の利用シーンを想定したケーススタディ記事。具体的な数値や状況設定を含め、アプリがどう役立つかをストーリーで伝える。",
  },
  {
    id: "checklist",
    label: "チェックリスト形式",
    instruction: "「○○する前に確認すべき10項目」のようなチェックリスト記事。実用性を重視し、チェック項目の中でアプリの機能を自然に紹介する。",
  },
];

// --- Twitter 5パターン定義 ---
const TWEET_PATTERNS = [
  {
    id: "problem",
    label: "課題提起型",
    instruction: "ターゲットユーザーが「あるある！」と共感する悩みや不便から始め、解決策としてアプリを紹介する。「○○で困っていませんか？」「○○あるある」のような切り出し。",
  },
  {
    id: "benefit",
    label: "メリット訴求型",
    instruction: "アプリを使うことで得られるメリットや変化を前面に出す。「○○ができるようになった」「○○が不要になる」のようなポジティブな表現。",
  },
  {
    id: "experience",
    label: "体験談風",
    instruction: "実際に使った体験談の形式。「○○してみたら、想像以上に○○だった」「○○を始めて1週間、○○が変わった」のような一人称の語り口。",
  },
  {
    id: "data",
    label: "数字・データ型",
    instruction: "具体的な数字やデータを含めて説得力を高める。「○○%の人が○○」「○○銘柄を○○秒で分析」のような定量的な表現。数字は機能から推測して自然に使う。",
  },
  {
    id: "question",
    label: "質問型",
    instruction: "読者に問いかけて興味を引く。「○○って知ってた？」「まだ○○してるの？」のような疑問文から始まり、答えとしてアプリを紹介する。",
  },
];

const MODEL = "claude-sonnet-4-20250514";

async function generateWithClaude(
  client: Anthropic,
  systemPrompt: string,
  userPrompt: string
): Promise<{ text: string; usage: { input_tokens: number; output_tokens: number } }> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: "user", content: userPrompt }],
    system: systemPrompt,
  });
  const block = response.content[0];
  if (block.type === "text") return { text: block.text, usage: response.usage };
  throw new Error("Unexpected response type");
}

// --- プロジェクト選定: 週ごとローテーション ---
function selectProject(
  promotable: ProjectDefinition[],
  publishedLog: Record<string, string[]>
): ProjectDefinition {
  // 基本戦略: 公開回数が最も少ないプロジェクトを優先
  // 同数の場合は週番号でローテーション
  const weekNumber = Math.floor(
    (Date.now() - new Date("2026-01-01").getTime()) / (7 * 24 * 60 * 60 * 1000)
  );

  const sorted = [...promotable].sort((a, b) => {
    const aCount = (publishedLog[a.slug] || []).length;
    const bCount = (publishedLog[b.slug] || []).length;
    if (aCount !== bCount) return aCount - bCount;
    // 同数なら週番号でローテーション
    return 0;
  });

  // 最少公開数のプロジェクトが複数ある場合、週番号で選ぶ
  const minCount = (publishedLog[sorted[0].slug] || []).length;
  const candidates = sorted.filter(
    (p) => (publishedLog[p.slug] || []).length === minCount
  );

  return candidates[weekNumber % candidates.length];
}

// --- 記事切り口の選定（過去に使った切り口を避ける）---
function selectAngle(
  angles: typeof ZENN_ANGLES,
  projectSlug: string,
  platform: string,
  publishedLog: Record<string, string[]>
): (typeof ZENN_ANGLES)[number] {
  const publishCount = (publishedLog[projectSlug] || []).length;
  // 公開回数に基づいてローテーション
  return angles[publishCount % angles.length];
}

// --- Twitter: ユーザーの悩みに刺さるツイート（5パターン）---
async function generateTweets(
  client: Anthropic,
  project: ProjectDefinition
): Promise<string[]> {
  const context = projectContextForTwitter(project);
  const patternDescriptions = TWEET_PATTERNS.map(
    (p, i) => `(${i + 1})${p.label}: ${p.instruction}`
  ).join("\n");

  const system = `あなたはアプリのマーケターです。ターゲットユーザーに刺さるツイートを生成します。

絶対ルール:
- 技術スタックには一切触れない（React、TypeScript、Rust、Next.js等は禁止）
- 技術的な用語（API、アルゴリズム、データベース等）も禁止
- ユーザーの「悩み」「不便」「あるある」から入る
- アプリがその悩みをどう解決するか伝える
- 各ツイートは280文字以内（厳守）
- ハッシュタグはターゲットユーザーが検索するワードを使う（技術タグ禁止）
- ツイート本文のみを出力（説明不要）
- 5パターン生成し、---で区切る`;

  const prompt = `以下のアプリのターゲットユーザーに刺さるツイートを5パターン書いてください。

パターン:
${patternDescriptions}

${context}

5つのツイートを---で区切って出力してください。`;

  const result = await generateWithClaude(client, system, prompt);
  await logUsage("twitter", "ツイート5パターン生成", MODEL, result.usage);
  return result.text
    .split("---")
    .map((t) => t.trim())
    .filter(Boolean);
}

// --- Zenn: ターゲットユーザーの課題解決記事 ---
async function generateZennArticle(
  client: Anthropic,
  project: ProjectDefinition,
  angle: (typeof ZENN_ANGLES)[number]
): Promise<string> {
  const keywords = (project.promotionKeywords || project.tags).slice(0, 5);
  const context = projectContextFull(project);

  const system = `あなたはコンテンツマーケターです。ターゲットユーザーが検索しそうなテーマで記事を書きます。

今回の記事の切り口: ${angle.label}
${angle.instruction}

絶対ルール:
- 記事のメインテーマはユーザーの「課題」と「解決方法」
- 技術的な実装の話はしない（コードやアーキテクチャの説明禁止）
- 記事の後半で自然にアプリを紹介する（宣伝臭を出さない）
- 読者が「役に立った」と思える実用的な内容にする
- Zennフロントマター形式で始める
- フロントマターと完全な本文を含む、すぐに公開できる完成した記事を書く
- テンプレートやプレースホルダーは絶対に使わない
- 1500〜3000字
- published: true は必須`;

  const prompt = `以下のアプリのターゲットユーザーが抱える課題をテーマに、「${angle.label}」の切り口で記事を書いてください。
すぐにZennに公開できる完成した記事を出力してください。[ここに〜を書く]のようなプレースホルダーは禁止です。

${context}

Zennフロントマター形式で始めてください:
---
title: "ユーザーの課題に関するタイトル（アプリ名を入れない）"
emoji: "適切な絵文字"
type: "idea"
topics: [${keywords.map((k) => `"${k}"`).join(", ")}]
published: true
---`;

  const result = await generateWithClaude(client, system, prompt);
  await logUsage("zenn", "Zenn記事生成", MODEL, result.usage);
  return result.text;
}

// --- Qiita: Zennとは異なる切り口の課題解決記事 ---
async function generateQiitaArticle(
  client: Anthropic,
  project: ProjectDefinition,
  angle: (typeof QIITA_ANGLES)[number],
  zennAngleId: string
): Promise<{ title: string; body: string; tags: string[] }> {
  const keywords = (project.promotionKeywords || project.tags).slice(0, 5);
  const context = projectContextFull(project);
  const zennAngle = ZENN_ANGLES.find((a) => a.id === zennAngleId);

  const system = `あなたはコンテンツマーケターです。ターゲットユーザー向けの記事を書きます。

今回の記事の切り口: ${angle.label}
${angle.instruction}

絶対ルール:
- Zennには「${zennAngle?.label || "別の切り口"}」で記事を書いたので、完全に異なるアプローチにする
- 技術的な実装の話はしない（コードやアーキテクチャの説明禁止）
- 記事の中で自然にアプリを紹介する（宣伝臭を出さない）
- 具体的なステップや比較を含める
- フロントマターと完全な本文を含む、すぐに公開できる完成した記事を書く
- テンプレートやプレースホルダーは絶対に使わない
- 最初の行は「TITLE: 記事タイトル」
- 2行目は空行、3行目から本文
- 1500〜3000字`;

  const prompt = `以下のアプリのターゲットユーザー向けに、「${angle.label}」の切り口で記事を書いてください。
すぐにQiitaに公開できる完成した記事を出力してください。[ここに〜を書く]のようなプレースホルダーは禁止です。

${context}

最初の行は「TITLE: 記事タイトル」としてください。`;

  const result = await generateWithClaude(client, system, prompt);
  await logUsage("qiita", "Qiita記事生成", MODEL, result.usage);
  const lines = result.text.split("\n");
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
  const context = projectContextFull(project);

  const system = `あなたはアプリの公式ブログライターです。アプリの活用ガイドを書きます。

絶対ルール:
- ユーザー目線で書く（開発者目線にしない）
- アプリの使い方、活用シーン、メリットを伝える
- 「このアプリを使えば○○ができる」という価値提案
- MDXフロントマター形式で始める
- フロントマターと完全な本文を含む、すぐに公開できる記事を書く
- テンプレートやプレースホルダーは絶対に使わない
- 日本語で書く
- 1000〜2000字`;

  const prompt = `以下のアプリの活用ガイド記事を書いてください。
想定読者はアプリのターゲットユーザーです。
すぐにブログに公開できる完成した記事を出力してください。

${context}

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

  const result = await generateWithClaude(client, system, prompt);
  await logUsage("blog", "ブログ記事生成", MODEL, result.usage);
  return result.text;
}

// --- コンテンツバリデーション ---
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function validateTweet(tweet: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (tweet.length > 280) {
    errors.push(`文字数超過: ${tweet.length}文字 (上限280)`);
  }

  // 技術スタック用語チェック
  const techTerms = [
    "React", "TypeScript", "JavaScript", "Rust", "Next.js", "Tauri",
    "Node.js", "PostgreSQL", "SQLite", "Prisma", "TailwindCSS", "Vite",
    "Express", "API", "SDK", "npm", "GitHub", "git",
  ];
  for (const term of techTerms) {
    if (tweet.toLowerCase().includes(term.toLowerCase())) {
      errors.push(`技術用語「${term}」が含まれています`);
    }
  }

  if (tweet.length < 50) {
    warnings.push("短すぎる可能性があります");
  }

  return { valid: errors.length === 0, errors, warnings };
}

function validateZennArticle(content: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // フロントマターチェック
  if (!content.startsWith("---")) {
    errors.push("フロントマターがありません");
  }

  if (!content.includes("published: true")) {
    errors.push("published: true が設定されていません");
  }

  // プレースホルダーチェック
  const placeholderPatterns = [/\[ここに.*?\]/g, /\[.*?を記入\]/g, /TODO/g, /FIXME/g];
  for (const pattern of placeholderPatterns) {
    if (pattern.test(content)) {
      errors.push(`プレースホルダーが残っています: ${content.match(pattern)?.[0]}`);
    }
  }

  // 本文の長さチェック（フロントマターを除く）
  const bodyMatch = content.match(/^---[\s\S]*?---\n([\s\S]*)$/);
  if (bodyMatch) {
    const bodyLength = bodyMatch[1].length;
    if (bodyLength < 800) {
      warnings.push(`本文が短い可能性: ${bodyLength}文字`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

function validateQiitaArticle(article: {
  title: string;
  body: string;
  tags: string[];
}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!article.title || article.title === "TITLE:") {
    errors.push("タイトルが空です");
  }

  if (article.body.length < 800) {
    warnings.push(`本文が短い可能性: ${article.body.length}文字`);
  }

  if (article.tags.length === 0) {
    errors.push("タグがありません");
  }

  // プレースホルダーチェック
  const placeholderPatterns = [/\[ここに.*?\]/g, /\[.*?を記入\]/g, /TODO/g, /FIXME/g];
  for (const pattern of placeholderPatterns) {
    if (pattern.test(article.body)) {
      errors.push(`プレースホルダーが残っています: ${article.body.match(pattern)?.[0]}`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

function validateBlogPost(content: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!content.startsWith("---")) {
    errors.push("フロントマターがありません");
  }

  if (!content.includes("published: true")) {
    errors.push("published: true が設定されていません");
  }

  const placeholderPatterns = [/\[ここに.*?\]/g, /\[.*?を記入\]/g, /TODO/g, /FIXME/g];
  for (const pattern of placeholderPatterns) {
    if (pattern.test(content)) {
      errors.push(`プレースホルダーが残っています: ${content.match(pattern)?.[0]}`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

function logValidation(label: string, result: ValidationResult) {
  if (!result.valid) {
    console.error(`  ❌ ${label} バリデーション失敗:`);
    result.errors.forEach((e) => console.error(`     - ${e}`));
  }
  if (result.warnings.length > 0) {
    result.warnings.forEach((w) => console.warn(`  ⚠ ${label}: ${w}`));
  }
  if (result.valid && result.warnings.length === 0) {
    console.log(`  ✅ ${label} バリデーションOK`);
  }
}

// --- メインオーケストレーション ---
async function main() {
  const apiKey = requireEnv("ANTHROPIC_API_KEY");
  const client = new Anthropic({ apiKey });

  const projects = await readProjectFiles();
  const publishedLog = await getPublishedLog();

  // autoPromote: true のプロジェクトのみ対象
  const promotable = projects.filter(
    (p: ProjectDefinition) => p.autoPromote === true
  );

  if (promotable.length === 0) {
    console.log("autoPromote: true のプロジェクトがありません。終了します。");
    console.log(
      'content/projects/<slug>.json に "autoPromote": true を設定してください。'
    );
    return;
  }

  // プロジェクト選定（ローテーション）
  const targetProject = selectProject(promotable, publishedLog);
  console.log(
    `対象プロジェクト: ${targetProject.nameJa || targetProject.name}`
  );
  console.log(
    `登録プロジェクト数: ${promotable.length}件 / 公開済み: ${(publishedLog[targetProject.slug] || []).length}回\n`
  );

  // 記事切り口の選定
  const zennAngle = selectAngle(
    ZENN_ANGLES,
    targetProject.slug,
    "zenn",
    publishedLog
  );
  const qiitaAngle = selectAngle(
    QIITA_ANGLES,
    targetProject.slug,
    "qiita",
    publishedLog
  );
  console.log(`Zenn切り口: ${zennAngle.label}`);
  console.log(`Qiita切り口: ${qiitaAngle.label}\n`);

  let hasErrors = false;

  // 1. Twitter投稿生成（5パターン）
  console.log("ツイート生成中...");
  const tweets = await generateTweets(client, targetProject);
  const twitterDir = path.join(CONTENT_DIR, "sns", "twitter");
  await fs.mkdir(twitterDir, { recursive: true });

  const validTweets: string[] = [];
  for (let i = 0; i < tweets.length; i++) {
    const result = validateTweet(tweets[i]);
    logValidation(`ツイート${i + 1}`, result);
    if (result.valid) {
      validTweets.push(tweets[i]);
    } else {
      hasErrors = true;
    }
  }

  // バリデーション通過したツイートのみ保存
  for (let i = 0; i < validTweets.length; i++) {
    const suffix = i === 0 ? "" : `-v${i + 1}`;
    await fs.writeFile(
      path.join(
        twitterDir,
        `${TODAY}-${targetProject.slug}${suffix}.txt`
      ),
      validTweets[i],
      "utf-8"
    );
  }
  console.log(`  保存: ${validTweets.length}/${tweets.length}件のツイート\n`);

  // 2. Zenn記事生成
  console.log("Zenn記事生成中...");
  const zennArticle = await generateZennArticle(
    client,
    targetProject,
    zennAngle
  );
  const zennValidation = validateZennArticle(zennArticle);
  logValidation("Zenn記事", zennValidation);

  if (zennValidation.valid) {
    const zennSlug = `${TODAY.replace(/-/g, "")}-${targetProject.slug}`;
    await fs.mkdir(ARTICLES_DIR, { recursive: true });
    await fs.writeFile(
      path.join(ARTICLES_DIR, `${zennSlug}.md`),
      zennArticle,
      "utf-8"
    );
    console.log(`  保存: articles/${zennSlug}.md\n`);
  } else {
    hasErrors = true;
    console.error("  Zenn記事はバリデーション失敗のためスキップ\n");
  }

  // 3. Qiita記事生成
  console.log("Qiita記事生成中...");
  const qiitaArticle = await generateQiitaArticle(
    client,
    targetProject,
    qiitaAngle,
    zennAngle.id
  );
  const qiitaValidation = validateQiitaArticle(qiitaArticle);
  logValidation("Qiita記事", qiitaValidation);

  if (qiitaValidation.valid) {
    const qiitaDir = path.join(CONTENT_DIR, "sns", "qiita");
    await fs.mkdir(qiitaDir, { recursive: true });
    await fs.writeFile(
      path.join(qiitaDir, `${TODAY}-${targetProject.slug}.json`),
      JSON.stringify(qiitaArticle, null, 2),
      "utf-8"
    );
    console.log(
      `  保存: content/sns/qiita/${TODAY}-${targetProject.slug}.json\n`
    );
  } else {
    hasErrors = true;
    console.error("  Qiita記事はバリデーション失敗のためスキップ\n");
  }

  // 4. ブログ記事生成
  console.log("ブログ記事生成中...");
  const blogPost = await generateBlogPost(client, targetProject);
  const blogValidation = validateBlogPost(blogPost);
  logValidation("ブログ記事", blogValidation);

  if (blogValidation.valid) {
    const blogDir = path.join(CONTENT_DIR, "blog");
    await fs.mkdir(blogDir, { recursive: true });
    await fs.writeFile(
      path.join(blogDir, `${targetProject.slug}-guide.mdx`),
      blogPost,
      "utf-8"
    );
    console.log(
      `  保存: content/blog/${targetProject.slug}-guide.mdx\n`
    );
  } else {
    hasErrors = true;
    console.error("  ブログ記事はバリデーション失敗のためスキップ\n");
  }

  // 5. 公開ログ更新
  if (!publishedLog[targetProject.slug]) {
    publishedLog[targetProject.slug] = [];
  }
  publishedLog[targetProject.slug].push(TODAY);
  await savePublishedLog(publishedLog);

  // サマリー
  console.log("=".repeat(50));
  console.log("コンテンツ生成完了!");
  console.log(
    `  プロジェクト: ${targetProject.nameJa || targetProject.name}`
  );
  console.log(`  日付: ${TODAY}`);
  console.log(`  Zenn切り口: ${zennAngle.label}`);
  console.log(`  Qiita切り口: ${qiitaAngle.label}`);
  console.log(`  ツイート: ${validTweets.length}/${tweets.length}件`);
  if (hasErrors) {
    console.warn(
      "\n⚠ 一部のコンテンツがバリデーションに失敗しました。ログを確認してください。"
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
