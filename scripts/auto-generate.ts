/**
 * auto-generate.ts
 * ターゲットユーザー起点のコンテンツを自動生成する。
 *
 * 設計思想:
 * - 起点は「アプリの宣伝」ではなく「ターゲットユーザーが求めている情報」
 * - 各プラットフォームのユーザーに価値を提供し、結果としてアプリの認知につなげる
 *
 * 各プラットフォームの役割:
 * - Twitter/X: ターゲットと同じ立場からの共感投稿（プロフィール経由でアプリ認知）
 * - Zenn/Qiita: ターゲットが検索する課題の解決記事（記事内でツールに一言触れる程度）
 * - ブログ: ターゲットの悩みを解決するガイド（自社サイトなのでアプリ紹介あり）
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
  blogArticleUrl,
} from "./lib/config";
import { logUsage } from "./lib/usage-logger";
import type { ProjectDefinition } from "../src/lib/types";

const TODAY = new Date().toISOString().split("T")[0];

// --- 記事の切り口定義 ---
const ZENN_ANGLES = [
  {
    id: "solve-problem",
    label: "ターゲットの課題解決",
    zennType: "tech" as const,
    instruction: "ターゲットユーザーが検索しそうな具体的な課題を取り上げ、解決方法を丁寧に解説する。自分のツールは解決手段の1つとして文脈の中で触れる程度。記事単体で読者の役に立つ内容にすること。",
  },
  {
    id: "my-experience",
    label: "自分の体験から学んだこと",
    zennType: "idea" as const,
    instruction: "ターゲットユーザーが直面しがちな状況について、自分自身の体験を共有する。成功も失敗も正直に書く。ツールの紹介が目的ではなく、体験の共有が目的。ツールは体験の中に自然に登場する。",
  },
  {
    id: "misconceptions",
    label: "よくある誤解・落とし穴",
    zennType: "idea" as const,
    instruction: "ターゲットユーザーが陥りやすい誤解や落とし穴を取り上げ、正しい理解を促す記事。読者が「知らなかった」「気をつけよう」と思える内容にする。ツールの紹介は必須ではない。",
  },
  {
    id: "how-i-chose",
    label: "自分がどう選んだか",
    zennType: "idea" as const,
    instruction: "ターゲットユーザーが迷いやすい選択（ツール、手法、サービス等）について、自分がどう判断したかを共有する。判断基準と結果を具体的に書く。自分のツールも選択肢の1つとして正直に扱う。",
  },
  {
    id: "beginner-roadmap",
    label: "これから始める人へのロードマップ",
    zennType: "tech" as const,
    instruction: "ターゲットユーザーが新しく始めるときに必要な情報を段階的にまとめる。初心者の「何から始めればいい？」に答える構成にする。ツールは実際に使うステップで触れる程度。",
  },
];

const QIITA_ANGLES = [
  {
    id: "deep-dive",
    label: "技術的な深掘り解説",
    instruction: "プロジェクトで使っている技術の1つを取り上げ、仕組みや実装を深く解説する。例: アルゴリズム解説、アーキテクチャ設計、パフォーマンス最適化など。読者が「この技術をこう使えるのか」と学べる内容にする。コードは必須（最低3ブロック）。",
  },
  {
    id: "build-log",
    label: "実装してみた記録",
    instruction: "実際に何かを実装した過程を時系列で記録する。最初のアプローチ → 問題発生 → 解決策 → 最終的な結果、という流れ。失敗や試行錯誤を正直に含めること。コードの before/after を見せる。",
  },
  {
    id: "pitfall",
    label: "ハマったポイントと解決策",
    instruction: "開発中に遭遇した具体的な問題とその解決方法を共有する。エラーメッセージ、原因分析、解決コードを含める。同じ問題に遭遇した人が検索して辿り着ける記事にする。",
  },
  {
    id: "howto",
    label: "具体的な手順解説",
    instruction: "特定の技術的な作業をステップバイステップで解説する。環境構築、API連携、データ処理など。読者がそのまま手を動かして再現できる記事にする。完全に動くコード例を含めること。",
  },
  {
    id: "architecture",
    label: "設計判断と理由",
    instruction: "技術選定やアーキテクチャの判断について、なぜその選択をしたか理由を解説する。比較検討した選択肢、トレードオフ、実際に使ってみた結果を含める。ランキング形式は禁止。判断の過程を記述する。",
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

const MODEL = "claude-sonnet-4-6-20250620";

// --- Qiitaの既出タイトルを読み込む ---
async function loadExistingQiitaTitles(): Promise<string[]> {
  const titles: string[] = [];
  try {
    // .posted.json からタイトルを取得
    const postedPath = path.join(CONTENT_DIR, "sns", "qiita", ".posted.json");
    const raw = await fs.readFile(postedPath, "utf-8");
    const posted = JSON.parse(raw);
    for (const entry of posted) {
      if (entry.title) titles.push(entry.title);
    }
  } catch { /* ファイルがなければ空 */ }
  try {
    // 未投稿のJSON記事からもタイトルを取得
    const qiitaDir = path.join(CONTENT_DIR, "sns", "qiita");
    const files = await fs.readdir(qiitaDir);
    for (const f of files.filter(f => f.endsWith(".json") && !f.startsWith("."))) {
      const raw = await fs.readFile(path.join(qiitaDir, f), "utf-8");
      const article = JSON.parse(raw);
      if (article.title) titles.push(article.title);
    }
  } catch { /* ディレクトリがなければ空 */ }
  return [...new Set(titles)];
}

// --- 技術コンテキスト（Qiita/Zenn技術記事用）---
function projectContextForTech(project: any): string {
  const stack = project.techStack || [];
  const platforms = project.platforms || [];
  return `
技術スタック: ${stack.join(", ") || "未設定"}
プラットフォーム: ${platforms.join(", ") || "未設定"}
カテゴリ: ${project.category || "未設定"}
`.trim();
}

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

// --- 頻度チェック: schedule.frequency に基づきスキップ ---
function isEligibleByFrequency(
  project: ProjectDefinition,
  publishedLog: Record<string, string[]>
): boolean {
  const freq = project.schedule?.frequency || "weekly";
  if (freq === "weekly") return true;

  const dates = publishedLog[project.slug] || [];
  if (dates.length === 0) return true;

  const lastDate = new Date(dates[dates.length - 1]);
  const daysSince = (Date.now() - lastDate.getTime()) / (24 * 60 * 60 * 1000);

  if (freq === "biweekly") return daysSince >= 13;
  if (freq === "monthly") return daysSince >= 27;
  return true;
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
function selectAngle<T extends { id: string }>(
  angles: T[],
  projectSlug: string,
  platform: string,
  publishedLog: Record<string, string[]>
): T {
  const publishCount = (publishedLog[projectSlug] || []).length;
  // 公開回数に基づいてローテーション
  return angles[publishCount % angles.length];
}

// --- Twitter: 独立ツイート2本 + スレッド1本（3ツイート）---
async function generateTweets(
  client: Anthropic,
  project: ProjectDefinition
): Promise<{ standalone: string[]; thread: string[] }> {
  const context = projectContextForTwitter(project);

  const system = `あなたはターゲットユーザーの1人です。同じ悩みや関心を持つ人間として、日常の体験や気づきを投稿します。

絶対ルール:
- あなたは「ユーザー」であり「宣伝者」ではない
- 技術スタックには一切触れない（React、TypeScript、Rust、Next.js等は禁止）
- 技術的な用語（API、アルゴリズム、データベース等）も禁止
- 同じ悩みを持つ人が「わかる！」と共感する内容にする
- アプリ名やURLを入れなくてよい（プロフィールで知ってもらう導線）
- 各ツイートは280文字以内（厳守）
- ハッシュタグはターゲットユーザーが検索するワードを使う（毎回異なるもの）
- 改行を活用して読みやすくする
- ツイート本文のみを出力（説明不要）

以下の形式で出力してください:

STANDALONE-1:
[共感型: ターゲットが「あるある！」と感じる日常の悩みや体験]
===
STANDALONE-2:
[気づき型: ターゲットの関心領域に関する有益な情報や発見]
===
THREAD-1:
[フック: ターゲットが思わず読みたくなる問いかけや体験の導入]
THREAD-2:
[展開: 自分の体験を具体的に共有]
THREAD-3:
[まとめ: 学びや気づきを共有し、最後に「詳しくはブログに書いた」としてブログURLを1つ載せる]`;

  const blogUrl = blogArticleUrl(project.slug);

  const prompt = `以下のアプリのターゲットユーザーになりきって、ターゲットが共感・反応するツイートを書いてください。
宣伝ではなく、同じ立場の人間としての投稿です。
独立ツイートにはURLは不要です。スレッドの最後（THREAD-3）にだけ、ブログ記事へのリンクを自然に含めてください。

ブログURL: ${blogUrl}

${context}

上記の形式（STANDALONE-1, STANDALONE-2, THREAD-1/2/3）で出力してください。`;

  const result = await generateWithClaude(client, system, prompt);
  await logUsage("twitter", "ツイート+スレッド生成", MODEL, result.usage);

  const standalone: string[] = [];
  const thread: string[] = [];

  const parts = result.text.split("===").map(p => p.trim()).filter(Boolean);
  for (const part of parts) {
    const cleaned = part.replace(/^STANDALONE-\d+:\s*/i, "").replace(/^THREAD-\d+:\s*/i, "").trim();
    if (part.startsWith("STANDALONE")) {
      standalone.push(cleaned);
    } else if (part.startsWith("THREAD")) {
      // THREADパートは1つの===区切りに3つのTHREAD-N:が入っている場合
      const threadParts = part.split(/THREAD-\d+:\s*/i).filter(Boolean);
      thread.push(...threadParts.map(t => t.trim()));
    }
  }

  // フォールバック: パースに失敗した場合は全てをstandaloneとして扱う
  if (standalone.length === 0 && thread.length === 0) {
    const fallback = result.text.split("---").map(t => t.trim()).filter(Boolean);
    return { standalone: fallback, thread: [] };
  }

  return { standalone, thread };
}

// --- Zenn: 開発者向け技術記事 ---
async function generateZennArticle(
  client: Anthropic,
  project: ProjectDefinition,
  angle: (typeof ZENN_ANGLES)[number]
): Promise<string> {
  const context = projectContextFull(project);
  const techContext = projectContextForTech(project);
  const zennType = angle.zennType || "idea";

  // カテゴリ別のZennトピック
  const topicMap: Record<string, string[]> = {
    crypto: ["暗号資産", "TypeScript", "トレード", "自動化", "Web開発"],
    tool: ["開発ツール", "TypeScript", "React", "デスクトップアプリ", "Rust"],
    saas: ["SaaS", "TypeScript", "Web開発", "React", "クラウド"],
    platform: ["プラットフォーム", "TypeScript", "Web開発", "React", "設計"],
  };
  const topics = (topicMap[project.category] || (project.tags || []).slice(0, 5));

  const codeInstruction = zennType === "tech"
    ? "- コード例を積極的に含める（最低2つのコードブロック）\n- 読者が手を動かしながら学べる内容にする"
    : "- 必要に応じてコード例や設定例を含めてもよい\n- データや具体例で説得力を持たせる";

  const system = `あなたはソフトウェアエンジニアです。Zennに技術記事を書きます。

今回の記事の切り口: ${angle.label}
${angle.instruction}

Zenn記事の品質基準:
${codeInstruction}
- 「なぜそうするのか」の理由や背景を必ず説明する
- 3000〜5000字（十分な深さで解説すること）
- 記事単体で読者の役に立つこと

絶対禁止:
- ランキング形式（「TOP7」「○選」「比較ランキング」等）は絶対禁止
- 【】で囲んだ煽りタイトル禁止
- 広告的・宣伝的な文体禁止
- テンプレートやプレースホルダー禁止（[ここに〜]、TODO、...で省略 等）
- 「以下に続く」「詳細は省略」等の省略も禁止
- すべてのセクションを完全に書き切ること

その他:
- アプリに触れる場合は「自分が使っている/作ったもの」として文脈の中で自然に（必須ではない）
- Zennフロントマター形式で始める
- published: true は必須`;

  const blogUrl = blogArticleUrl(project.slug);

  const prompt = `以下のアプリのターゲットユーザーになりきって、「${angle.label}」の切り口で記事を書いてください。
ターゲットが検索しそうなテーマを選び、読者の役に立つ記事にしてください。
アプリの宣伝ではなく、同じ立場の人間からの知見共有です。
記事の最後に「より詳しい解説はブログに書いています」として以下のURLを自然に含めてください: ${blogUrl}

${context}

Zennフロントマター形式で始めてください:
---
title: "ターゲットユーザーが検索しそうなタイトル（アプリ名を入れない）"
emoji: "適切な絵文字"
type: "${zennType}"
topics: [${topics.map((k) => `"${k}"`).join(", ")}]
published: true
---`;

  const result = await generateWithClaude(client, system, prompt);
  await logUsage("zenn", "Zenn記事生成", MODEL, result.usage);
  return result.text;
}

// --- Qiita: 技術記事（コード例付き）---
async function generateQiitaArticle(
  client: Anthropic,
  project: ProjectDefinition,
  angle: (typeof QIITA_ANGLES)[number],
  zennAngleId: string
): Promise<{ title: string; body: string; tags: string[] }> {
  const keywords = (project.promotionKeywords || project.tags).slice(0, 5);
  const context = projectContextFull(project);
  const techContext = projectContextForTech(project);
  const zennAngle = ZENN_ANGLES.find((a) => a.id === zennAngleId);
  const currentYear = new Date().getFullYear();

  // 既出タイトルを読み込んで重複防止
  const existingTitles = await loadExistingQiitaTitles();
  const titleExclusion = existingTitles.length > 0
    ? `\n以下のタイトルは既に使用済みです。同じまたは類似のタイトルは禁止:\n${existingTitles.map(t => `- ${t}`).join("\n")}`
    : "";

  const system = `あなたはソフトウェアエンジニアです。Qiitaに技術記事を書きます。

今回の記事の切り口: ${angle.label}
${angle.instruction}

Qiita記事の品質基準:
- 具体的なコード例を最低3つ含める（動作するコードであること）
- 技術的に正確で、読者が再現・応用できる内容にする
- 「なぜそうするのか」の理由を必ず説明する
- 3000〜5000字（十分な深さで解説すること）

絶対禁止:
- ランキング形式（「TOP7」「○選」「比較ランキング」等）は絶対禁止
- 【】で囲んだ煽りタイトル禁止（例: 【最新】【完全版】【必見】）
- 広告的・宣伝的な文体禁止（「今すぐ」「必見」「驚きの」等）
- 他ツールとの比較表・点数付けは禁止
- テンプレートやプレースホルダー禁止（[ここに〜]、TODO等）

タイトルのルール:
- 技術者が検索する自然な表現にする（例: 「Node.jsでWebSocket接続を管理する方法」）
- 年号を使う場合は必ず${currentYear}年
${titleExclusion}

Zennには「${zennAngle?.label || "別の切り口"}」で記事を書いたので、完全に異なるテーマにする

出力形式:
- 最初の行は「TITLE: 記事タイトル」
- 2行目は空行、3行目から本文（Markdown形式）`;

  const blogUrl = blogArticleUrl(project.slug);

  const prompt = `以下のプロジェクトの技術的な内容について、「${angle.label}」の切り口で Qiita 記事を書いてください。
読者はエンジニアです。具体的なコードと技術的な解説を期待しています。
記事の最後に「参考」として以下のブログURLを自然に含めてください: ${blogUrl}

${context}
${techContext}

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

  const system = `あなたはターゲットユーザーの悩みを理解し、それを解決する方法を紹介するブログライターです。
この記事は各SNS（Twitter、Qiita、Zenn、Dev.to、Reddit）から誘導される「詳細記事」です。
SNSでは短い概要や体験を共有し、「詳しくはブログで」とリンクされる受け皿になります。

絶対ルール:
- 読者の悩みや課題から始める（アプリの機能紹介から始めない）
- 「読者がこの記事を読んで何が解決するか」を最初に明確にする
- SNSの短い投稿では伝えきれない詳細をここで丁寧に解説する
- 解決策としてアプリの使い方を具体的に説明する
- MDXフロントマター形式で始める
- フロントマターと完全な本文を含む、すぐに公開できる記事を書く
- テンプレートやプレースホルダーは絶対に使わない
- 日本語で書く
- 1000〜2000字`;

  const prompt = `以下のアプリのターゲットユーザーが抱える課題を出発点として、その解決方法を紹介する記事を書いてください。
読者は「自分の悩みが解決できるか」を知りたくてこの記事に辿り着いた人です。
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

  // プレースホルダー・不完全コンテンツチェック
  const placeholderPatterns = [
    /\[ここに.*?\]/g, /\[.*?を記入\]/g, /TODO/g, /FIXME/g,
    /<!-- .* -->/g, /以下に続く/g, /詳細は省略/g, /\.\.\.$/gm,
  ];
  for (const pattern of placeholderPatterns) {
    if (pattern.test(content)) {
      errors.push(`不完全なコンテンツ: ${content.match(pattern)?.[0]}`);
    }
  }

  // 本文の長さチェック（フロントマターを除く）
  const bodyMatch = content.match(/^---[\s\S]*?---\n([\s\S]*)$/);
  if (bodyMatch) {
    const bodyLength = bodyMatch[1].length;
    if (bodyLength < 800) {
      warnings.push(`本文が短い可能性: ${bodyLength}文字 (推奨: 1500-3000)`);
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

  // 誤った年号チェック
  const currentYear = new Date().getFullYear();
  const yearMatch = article.title.match(/\b(20[0-9]{2})\b/);
  if (yearMatch && parseInt(yearMatch[1]) < currentYear) {
    errors.push(`タイトルの年号が古い: ${yearMatch[1]} (現在: ${currentYear})`);
  }

  // ランキング・煽りタイトル禁止
  const bannedTitlePatterns = [
    /TOP\s*\d+/i, /ランキング/i, /○選|[0-9]+選/, /【.*?】/,
    /必見/, /完全版/, /最強/, /厳選/, /驚きの/, /徹底比較/,
  ];
  for (const pattern of bannedTitlePatterns) {
    if (pattern.test(article.title)) {
      errors.push(`禁止パターンのタイトル: ${article.title.match(pattern)?.[0]}`);
    }
  }

  // 本文の長さチェック（3000字以上必須）
  if (article.body.length < 2000) {
    errors.push(`本文が短すぎる: ${article.body.length}文字 (最低3000字)`);
  } else if (article.body.length < 3000) {
    warnings.push(`本文がやや短い: ${article.body.length}文字 (推奨: 3000-5000字)`);
  }

  if (article.tags.length === 0) {
    errors.push("タグがありません");
  }

  // コードブロック必須チェック（最低3つ）
  const codeBlockCount = (article.body.match(/```/g) || []).length / 2;
  if (codeBlockCount < 3) {
    errors.push(`コードブロックが不足: ${Math.floor(codeBlockCount)}個 (最低3個必須)`);
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

  // 頻度フィルタ: schedule.frequency に基づき今週対象でないプロジェクトを除外
  const eligible = promotable.filter((p) =>
    isEligibleByFrequency(p, publishedLog)
  );

  if (eligible.length === 0) {
    console.log("今週対象のプロジェクトがありません（頻度スケジュールにより）。");
    return;
  }

  // プロジェクト選定（ローテーション）
  const targetProject = selectProject(eligible, publishedLog);
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

  const schedulePlatforms = targetProject.schedule?.platforms || [
    "twitter", "zenn", "qiita", "blog", "devto", "reddit",
  ];
  console.log(`配信先: ${schedulePlatforms.join(", ")}\n`);

  let hasErrors = false;

  // 1. Twitter投稿生成（独立2本 + スレッド1本）
  if (!schedulePlatforms.includes("twitter")) {
    console.log("Twitter: スケジュール対象外のためスキップ\n");
  } else {
  console.log("ツイート生成中...");
  const { standalone, thread } = await generateTweets(client, targetProject);
  const twitterDir = path.join(CONTENT_DIR, "sns", "twitter");
  await fs.mkdir(twitterDir, { recursive: true });

  // 独立ツイートのバリデーションと保存
  const validStandalone: string[] = [];
  for (let i = 0; i < standalone.length; i++) {
    const result = validateTweet(standalone[i]);
    logValidation(`独立ツイート${i + 1}`, result);
    if (result.valid) {
      validStandalone.push(standalone[i]);
    } else {
      hasErrors = true;
    }
  }
  for (let i = 0; i < validStandalone.length; i++) {
    const suffix = i === 0 ? "" : `-v${i + 1}`;
    await fs.writeFile(
      path.join(twitterDir, `${TODAY}-${targetProject.slug}${suffix}.txt`),
      validStandalone[i],
      "utf-8"
    );
  }

  // スレッドのバリデーションと保存
  if (thread.length > 0) {
    let threadValid = true;
    for (let i = 0; i < thread.length; i++) {
      const result = validateTweet(thread[i]);
      logValidation(`スレッド${i + 1}`, result);
      if (!result.valid) {
        threadValid = false;
        hasErrors = true;
      }
    }
    if (threadValid) {
      await fs.writeFile(
        path.join(twitterDir, `${TODAY}-${targetProject.slug}.thread.json`),
        JSON.stringify(thread, null, 2),
        "utf-8"
      );
      console.log(`  保存: スレッド(${thread.length}ツイート)\n`);
    }
  }

  console.log(`  保存: ${validStandalone.length}件の独立ツイート\n`);
  }

  // 2. Zenn記事生成
  if (!schedulePlatforms.includes("zenn")) {
    console.log("Zenn: スケジュール対象外のためスキップ\n");
  } else {
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
  }

  // 3. Qiita記事生成
  if (!schedulePlatforms.includes("qiita")) {
    console.log("Qiita: スケジュール対象外のためスキップ\n");
  } else {
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
  }

  // 4. ブログ記事生成
  if (!schedulePlatforms.includes("blog")) {
    console.log("Blog: スケジュール対象外のためスキップ\n");
  } else {
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
  console.log(`  配信先: ${schedulePlatforms.join(", ")}`);
  console.log(`  Zenn切り口: ${zennAngle.label}`);
  console.log(`  Qiita切り口: ${qiitaAngle.label}`);
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
