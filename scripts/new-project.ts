import fs from "fs/promises";
import path from "path";
import type { ProjectDefinition } from "../src/lib/types";

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error("Usage: npx tsx scripts/new-project.ts <slug>");
    process.exit(1);
  }

  const filePath = path.join(process.cwd(), "content", "projects", `${slug}.json`);

  try {
    await fs.access(filePath);
    console.error(`Project ${slug} already exists at ${filePath}`);
    process.exit(1);
  } catch {
    // File doesn't exist, continue
  }

  const template: ProjectDefinition = {
    slug,
    name: slug,
    nameJa: "",
    tagline: "",
    taglineJa: "",
    description: "",
    descriptionJa: "",
    category: "other",
    tags: [],
    targetAudience: [],
    status: "development",
    techStack: [],
    platforms: ["web"],
    features: [],
    createdAt: new Date().toISOString().split("T")[0],
    updatedAt: new Date().toISOString().split("T")[0],
    order: 99,
    featured: false,
  };

  await fs.writeFile(filePath, JSON.stringify(template, null, 2), "utf-8");
  console.log(`Created project template: ${filePath}`);
  console.log("Edit the JSON file to fill in project details.");
}

main().catch(console.error);
