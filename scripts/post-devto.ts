/**
 * post-devto.ts
 * ProjectDefinitionから直接Dev.to向けの英語技術記事を生成・投稿する。
 * 翻訳ではなくネイティブ英語で生成し、Dev.toコミュニティに最適化。
 */
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs/promises";
import path from "path";
import {
  requireEnv,
  loadConfig,
  CONTENT_DIR,
  readProjectFiles,
  getPublishedLog,
  projectContextFull,
  blogArticleUrl,
} from "./lib/config";
import { logUsage } from "./lib/usage-logger";
import type { ProjectDefinition } from "../src/lib/types";

const TODAY = new Date().toISOString().split("T")[0];
const MODEL = "claude-sonnet-4-20250514";

interface PostedEntry {
  filename: string;
  postId: string;
  url: string;
  postedAt: string;
  slug: string;
}

// Dev.toタグマッピング（カテゴリ別）
function mapToDevtoTags(project: ProjectDefinition): string[] {
  const tagMap: Record<string, string[]> = {
    crypto: ["crypto", "javascript", "webdev", "opensource"],
    tool: ["opensource", "productivity", "webdev", "tutorial"],
    saas: ["saas", "webdev", "startup", "javascript"],
    platform: ["webdev", "opensource", "javascript", "tutorial"],
  };
  return (tagMap[project.category] || ["webdev", "opensource", "javascript", "tutorial"]).slice(0, 4);
}

// Dev.to記事の切り口（ローテーション）
const DEVTO_ANGLES = [
  {
    id: "solve-their-problem",
    label: "Solving a Real Problem",
    instruction: "Write about a problem that the target audience actually faces. Explain it from their perspective, walk through possible solutions, and share what worked for you. Your tool may appear as one of the solutions, but the article should help readers even if they never use it.",
  },
  {
    id: "what-i-learned",
    label: "What I Learned",
    instruction: "Share genuine lessons from your experience in the target audience's domain. What surprised you? What did you get wrong? Write as a peer sharing hard-won knowledge, not as someone promoting a product.",
  },
  {
    id: "honest-comparison",
    label: "Honest Comparison",
    instruction: "Compare different approaches to a problem the target audience cares about. Be objective — include pros and cons of each approach including your own. Readers should be able to make their own informed decision.",
  },
  {
    id: "beginner-guide",
    label: "Getting Started Guide",
    instruction: "Write a guide for someone new to the target audience's domain. What do they need to know first? What mistakes should they avoid? Your tool can appear as something you use, but the guide should be valuable regardless.",
  },
  {
    id: "workflow-share",
    label: "My Workflow",
    instruction: "Share your actual workflow in the target audience's domain. Be specific about what tools and methods you use and why. Your app naturally appears as part of your workflow, not as a recommendation.",
  },
];

async function generateDevtoArticle(
  client: Anthropic,
  project: ProjectDefinition,
  angle: (typeof DEVTO_ANGLES)[number],
  existingTitles: string[]
): Promise<{ title: string; body: string }> {
  const context = projectContextFull(project);
  const stack = (project.techStack || []).join(", ");
  const currentYear = new Date().getFullYear();

  const titleExclusion = existingTitles.length > 0
    ? `\nDo NOT reuse these titles or close variations:\n${existingTitles.map(t => `- ${t}`).join("\n")}`
    : "";

  const system = `You are someone who belongs to the target audience. Write an article sharing your genuine experience and knowledge with peers who face similar challenges.

Article angle: ${angle.label}
${angle.instruction}

Rules:
- You are NOT a marketer. You are a peer sharing what you know.
- Write in natural, conversational English
- The article must be useful to readers even if they never use your tool
- Your tool/project may appear in context as "something I use/built", but it is NOT the focus
- Use ${currentYear} for any year references
- 800-1500 words
- First line: "TITLE: your article title" (title should be what the target audience would search for)
- Second line: empty
- Third line onward: article body in Markdown
- Do NOT use placeholder text, TODO markers, or incomplete sections${titleExclusion}`;

  const blogUrl = blogArticleUrl(project.slug);

  const prompt = `Think about what the target audience (described below) would search for on Dev.to. Write an article that answers their question or solves their problem, using the "${angle.label}" angle.
At the end of the article, include a natural reference like "I wrote a more detailed guide on my blog: ${blogUrl}"

Target audience and project context (in Japanese, but write the article in English):
${context}

First line must be "TITLE: your article title".`;

  const raw = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
    system,
  });

  await logUsage("devto", `Dev.to記事生成 (${angle.id})`, MODEL, raw.usage);

  const text = raw.content[0].type === "text" ? raw.content[0].text : "";
  const lines = text.split("\n");
  const title = lines[0].replace(/^TITLE:\s*/, "").trim();
  const body = lines.slice(2).join("\n");

  return { title, body };
}

async function postToDevto(
  apiKey: string,
  title: string,
  body: string,
  tags: string[],
  canonicalUrl?: string,
  series?: string
): Promise<{ id: number; url: string }> {
  const article: any = {
    title,
    body_markdown: body,
    published: true,
    tags: tags
      .slice(0, 4)
      .map((t) => t.replace(/[^a-zA-Z0-9]/g, "").toLowerCase())
      .filter(Boolean),
  };
  if (canonicalUrl) article.canonical_url = canonicalUrl;
  if (series) article.series = series;

  const response = await fetch("https://dev.to/api/articles", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ article }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Dev.to API error ${response.status}: ${errorBody}`);
  }

  return response.json();
}

async function loadPostedLog(logPath: string): Promise<PostedEntry[]> {
  try {
    const raw = await fs.readFile(logPath, "utf-8");
    const data = JSON.parse(raw);
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === "string") {
      return data.map((source: string) => ({
        filename: source,
        postId: "",
        url: "",
        postedAt: "",
        slug: "",
      }));
    }
    return data;
  } catch {
    return [];
  }
}

async function main() {
  const config = loadConfig();

  if (!config.devtoApiKey) {
    console.log("Dev.to API key not configured. Skipping.");
    return;
  }

  const apiKey = requireEnv("ANTHROPIC_API_KEY");
  const client = new Anthropic({ apiKey });

  const devtoDir = path.join(CONTENT_DIR, "sns", "devto");
  await fs.mkdir(devtoDir, { recursive: true });
  const postedLogPath = path.join(devtoDir, ".posted.json");

  const posted = await loadPostedLog(postedLogPath);
  const postedSlugs = new Set(posted.map((e) => e.slug));

  // プロジェクト選定: autoPromote かつ devto が対象のプロジェクトから、未投稿を選ぶ
  const allProjects = await readProjectFiles();
  const publishedLog = await getPublishedLog();

  const candidates = allProjects.filter((p: ProjectDefinition) => {
    if (!p.autoPromote) return false;
    const platforms = p.schedule?.platforms || [
      "twitter", "zenn", "qiita", "blog", "devto", "reddit",
    ];
    if (!platforms.includes("devto")) return false;
    return true;
  });

  if (candidates.length === 0) {
    console.log("No projects configured for Dev.to posting.");
    return;
  }

  // 投稿回数が少ないプロジェクトを優先
  const postedCountBySlug = (slug: string) =>
    posted.filter((e) => e.slug === slug).length;

  const sorted = [...candidates].sort(
    (a, b) => postedCountBySlug(a.slug) - postedCountBySlug(b.slug)
  );
  const targetProject = sorted[0];

  // 角度選定（投稿回数でローテーション）
  const postCount = postedCountBySlug(targetProject.slug);
  const angle = DEVTO_ANGLES[postCount % DEVTO_ANGLES.length];

  // 既出タイトル
  const existingTitles = posted
    .filter((e) => e.slug === targetProject.slug)
    .map((e) => e.filename)
    .filter(Boolean);

  console.log(`Target project: ${targetProject.name}`);
  console.log(`Article angle: ${angle.label}`);

  console.log("Generating Dev.to article (native English)...");
  const { title, body } = await generateDevtoArticle(
    client,
    targetProject,
    angle,
    existingTitles
  );
  console.log(`Generated title: ${title}`);

  // 生成結果を保存
  const tags = mapToDevtoTags(targetProject);
  await fs.writeFile(
    path.join(devtoDir, `${TODAY}-${targetProject.slug}.json`),
    JSON.stringify({ title, body, tags, angle: angle.id }, null, 2),
    "utf-8"
  );

  // ブログ記事をcanonical_urlに設定（ハブへの誘導）
  const canonicalUrl = blogArticleUrl(targetProject.slug);
  const series = targetProject.nameJa || targetProject.name;

  console.log("Posting to Dev.to...");
  const result = await postToDevto(
    config.devtoApiKey,
    title,
    body,
    tags,
    canonicalUrl,
    series
  );
  console.log(`Dev.to article posted! ID: ${result.id}, URL: ${result.url}`);

  posted.push({
    filename: title,
    postId: String(result.id),
    url: result.url,
    postedAt: TODAY,
    slug: targetProject.slug,
  });
  await fs.writeFile(postedLogPath, JSON.stringify(posted, null, 2), "utf-8");
}

main().catch((err) => {
  console.error("Dev.to post error:", err.message);
  process.exit(1);
});
