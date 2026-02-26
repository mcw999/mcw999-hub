import fs from "fs/promises";
import path from "path";
import type { ProjectDefinition } from "../src/lib/types";
import {
  generateProjectLaunchPost,
  generateZennArticle,
  generateQiitaArticle,
} from "../src/lib/sns-generator";

const CONTENT_DIR = path.join(process.cwd(), "content");
const SITE_URL = "https://mcw999.github.io";

async function loadProject(slug: string): Promise<ProjectDefinition> {
  const filePath = path.join(CONTENT_DIR, "projects", `${slug}.json`);
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw);
}

async function loadAllProjects(): Promise<ProjectDefinition[]> {
  const dir = path.join(CONTENT_DIR, "projects");
  const files = await fs.readdir(dir);
  return Promise.all(
    files
      .filter((f) => f.endsWith(".json"))
      .map(async (f) => {
        const raw = await fs.readFile(path.join(dir, f), "utf-8");
        return JSON.parse(raw) as ProjectDefinition;
      })
  );
}

async function generateForProject(project: ProjectDefinition, types: string[]) {
  const date = new Date().toISOString().split("T")[0];

  if (types.includes("twitter") || types.includes("all")) {
    const tweet = generateProjectLaunchPost(project);
    const tweetDir = path.join(CONTENT_DIR, "sns", "twitter");
    await fs.mkdir(tweetDir, { recursive: true });
    const tweetPath = path.join(tweetDir, `${date}-${project.slug}-launch.json`);
    await fs.writeFile(tweetPath, JSON.stringify(tweet, null, 2), "utf-8");
    console.log(`Twitter: ${tweetPath}`);
    console.log(`  Text (${tweet.text.length} chars):`);
    console.log(`  ${tweet.text.replace(/\n/g, "\n  ")}`);
    console.log(`  Hashtags: ${tweet.hashtags.join(" ")}`);
    console.log();
  }

  if (types.includes("zenn") || types.includes("all")) {
    const article = generateZennArticle(project, "story");
    const zennDir = path.join(CONTENT_DIR, "sns", "zenn");
    await fs.mkdir(zennDir, { recursive: true });
    const zennPath = path.join(zennDir, `${date}-${project.slug}.md`);
    await fs.writeFile(zennPath, article, "utf-8");
    console.log(`Zenn: ${zennPath}`);
  }

  if (types.includes("qiita") || types.includes("all")) {
    const article = generateQiitaArticle(project);
    const qiitaDir = path.join(CONTENT_DIR, "sns", "qiita");
    await fs.mkdir(qiitaDir, { recursive: true });
    const qiitaPath = path.join(qiitaDir, `${date}-${project.slug}.md`);
    await fs.writeFile(qiitaPath, article, "utf-8");
    console.log(`Qiita: ${qiitaPath}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const projectFlag = args.indexOf("--project");
  const typeFlag = args.indexOf("--type");

  const projectSlug = projectFlag >= 0 ? args[projectFlag + 1] : null;
  const typeStr = typeFlag >= 0 ? args[typeFlag + 1] : "all";
  const types = typeStr.split(",");

  if (projectSlug) {
    const project = await loadProject(projectSlug);
    console.log(`Generating SNS content for: ${project.nameJa || project.name}\n`);
    await generateForProject(project, types);
  } else {
    const projects = await loadAllProjects();
    console.log(`Generating SNS content for ${projects.length} projects\n`);
    for (const project of projects) {
      console.log(`--- ${project.nameJa || project.name} ---\n`);
      await generateForProject(project, types);
      console.log();
    }
  }

  console.log("Done!");
}

main().catch(console.error);
