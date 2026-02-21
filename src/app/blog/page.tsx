import type { Metadata } from "next";
import Link from "next/link";
import { Clock } from "lucide-react";
import { getAllBlogPosts } from "@/lib/content";

export const metadata: Metadata = {
  title: "Blog",
  description: "Articles about development, technology, and projects.",
};

export default async function BlogPage() {
  const posts = await getAllBlogPosts();

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold mb-2">Blog</h1>
      <p className="text-muted mb-10">
        開発やプロジェクトに関する記事です。
      </p>

      {posts.length === 0 ? (
        <p className="text-muted">記事はまだありません。</p>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}/`}
              className="block rounded-lg border border-border bg-card p-6 hover:bg-card-hover hover:border-accent/30 transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <h2 className="text-lg font-semibold text-foreground">
                  {post.titleJa || post.title}
                </h2>
                <span className="text-xs text-muted shrink-0 ml-4">
                  {post.date}
                </span>
              </div>
              <p className="text-muted text-sm mb-3">
                {post.descriptionJa || post.description}
              </p>
              <div className="flex items-center gap-4 text-xs text-muted">
                {post.readingTime && (
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {post.readingTime}
                  </span>
                )}
                <div className="flex gap-2">
                  {post.tags.map((tag) => (
                    <span key={tag} className="text-accent">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
