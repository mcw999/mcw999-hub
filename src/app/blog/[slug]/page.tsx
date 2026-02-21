import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Calendar } from "lucide-react";
import { getAllBlogPosts, getBlogPost } from "@/lib/content";
import { compileMdxContent } from "@/lib/mdx";

export async function generateStaticParams() {
  const posts = await getAllBlogPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) return { title: "Not Found" };
  return {
    title: post.titleJa || post.title,
    description: post.descriptionJa || post.description,
    openGraph: {
      title: post.titleJa || post.title,
      description: post.descriptionJa || post.description,
      type: "article",
      publishedTime: post.date,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) notFound();

  const content = await compileMdxContent(post.content);

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href="/blog/"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft size={14} />
        All Posts
      </Link>

      <article>
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-4">
            {post.titleJa || post.title}
          </h1>
          <div className="flex items-center gap-4 text-sm text-muted">
            <span className="flex items-center gap-1">
              <Calendar size={14} />
              {post.date}
            </span>
            {post.readingTime && (
              <span className="flex items-center gap-1">
                <Clock size={14} />
                {post.readingTime}
              </span>
            )}
          </div>
          <div className="flex gap-2 mt-3">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-xs rounded bg-zinc-800 text-accent border border-zinc-700"
              >
                #{tag}
              </span>
            ))}
          </div>
        </header>

        <div className="prose prose-invert prose-zinc max-w-none prose-headings:font-semibold prose-a:text-accent prose-code:text-accent prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-border">
          {content}
        </div>
      </article>

      {post.project && (
        <div className="mt-12 p-4 rounded-lg border border-border bg-card">
          <p className="text-sm text-muted">
            Related project:{" "}
            <Link
              href={`/projects/${post.project}/`}
              className="text-accent hover:underline"
            >
              {post.project}
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
