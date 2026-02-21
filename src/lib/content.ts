import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import readingTime from "reading-time";
import type {
  ProjectDefinition,
  BlogPostMeta,
  BlogPost,
  AuthorMeta,
} from "./types";

const CONTENT_DIR = path.join(process.cwd(), "content");

// --- Projects ---

export async function getAllProjects(): Promise<ProjectDefinition[]> {
  const dir = path.join(CONTENT_DIR, "projects");
  const files = await fs.readdir(dir);
  const projects = await Promise.all(
    files
      .filter((f) => f.endsWith(".json"))
      .map(async (f) => {
        const raw = await fs.readFile(path.join(dir, f), "utf-8");
        return JSON.parse(raw) as ProjectDefinition;
      })
  );
  return projects.sort((a, b) => a.order - b.order);
}

export async function getProject(
  slug: string
): Promise<ProjectDefinition | null> {
  try {
    const filePath = path.join(CONTENT_DIR, "projects", `${slug}.json`);
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as ProjectDefinition;
  } catch {
    return null;
  }
}

export async function getFeaturedProjects(): Promise<ProjectDefinition[]> {
  const projects = await getAllProjects();
  return projects.filter((p) => p.featured);
}

// --- Blog ---

export async function getAllBlogPosts(): Promise<BlogPostMeta[]> {
  const dir = path.join(CONTENT_DIR, "blog");
  let files: string[];
  try {
    files = await fs.readdir(dir);
  } catch {
    return [];
  }
  const posts = await Promise.all(
    files
      .filter((f) => f.endsWith(".mdx"))
      .map(async (f) => {
        const raw = await fs.readFile(path.join(dir, f), "utf-8");
        const { data, content } = matter(raw);
        const rt = readingTime(content);
        return {
          ...data,
          slug: data.slug || f.replace(/\.mdx$/, ""),
          readingTime: rt.text,
        } as BlogPostMeta;
      })
  );
  return posts
    .filter((p) => p.published)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  const dir = path.join(CONTENT_DIR, "blog");
  let files: string[];
  try {
    files = await fs.readdir(dir);
  } catch {
    return null;
  }
  for (const f of files) {
    if (!f.endsWith(".mdx")) continue;
    const raw = await fs.readFile(path.join(dir, f), "utf-8");
    const { data, content } = matter(raw);
    const postSlug = data.slug || f.replace(/\.mdx$/, "");
    if (postSlug === slug) {
      const rt = readingTime(content);
      return {
        ...data,
        slug: postSlug,
        content,
        readingTime: rt.text,
      } as BlogPost;
    }
  }
  return null;
}

// --- Author / Meta ---

export async function getAuthorMeta(): Promise<AuthorMeta> {
  const filePath = path.join(CONTENT_DIR, "meta", "author.json");
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw) as AuthorMeta;
}
