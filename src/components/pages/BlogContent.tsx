"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, FolderOpen, Search } from "lucide-react";
import { T, LT } from "@/lib/i18n";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SpotlightCard } from "@/components/effects/SpotlightCard";
import { ScrollReveal } from "@/components/effects/ScrollReveal";
import type { BlogPostMeta } from "@/lib/types";

export function BlogContent({ posts }: { posts: BlogPostMeta[] }) {
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const allTags = Array.from(new Set(posts.flatMap((p) => p.tags))).sort();

  const filtered = posts.filter((post) => {
    if (activeTag && !post.tags.includes(activeTag)) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        post.title.toLowerCase().includes(q) ||
        (post.titleJa || "").toLowerCase().includes(q) ||
        post.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div>
      {/* Page header */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-50%] left-[-20%] w-[600px] h-[400px] rounded-full bg-accent-secondary/3 blur-[100px]" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-6 sm:px-10 pt-8 pb-14">
          <Breadcrumb items={[{ label: <T ja="ブログ" en="Blog" /> }]} />
          <h1 className="text-4xl sm:text-5xl font-bold mb-3 tracking-tight">
            <T ja="ブログ" en="Blog" />
          </h1>
          <p className="text-muted text-lg max-w-lg">
            <T
              ja="開発やプロジェクトに関する記事です。"
              en="Articles about development, technology, and projects."
            />
          </p>
        </div>
      </section>

      {/* Posts */}
      <div className="mx-auto max-w-4xl px-6 sm:px-10 py-16">
        {posts.length === 0 ? (
          <ScrollReveal>
            <SpotlightCard className="text-center py-20 px-8">
              <div className="relative z-10">
                <p className="text-muted text-lg mb-2">
                  <T ja="記事はまだありません" en="No articles yet" />
                </p>
                <p className="text-sm text-muted/60">Coming soon...</p>
              </div>
            </SpotlightCard>
          </ScrollReveal>
        ) : (
          <>
            {/* Search & Tag filters */}
            <div className="mb-8 space-y-4">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={
                    typeof window !== "undefined" && document.documentElement.lang === "ja"
                      ? "記事を検索..."
                      : "Search articles..."
                  }
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-border text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:border-accent/40 transition-colors"
                />
              </div>
              {allTags.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setActiveTag(null)}
                    className={`tag-pill transition-all ${
                      activeTag === null
                        ? "!bg-accent/20 !border-accent/40 !text-accent"
                        : ""
                    }`}
                  >
                    <T ja="すべて" en="All" />
                  </button>
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                      className={`tag-pill transition-all ${
                        activeTag === tag
                          ? "!bg-accent/20 !border-accent/40 !text-accent"
                          : ""
                      }`}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Filtered results */}
            {filtered.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted">
                  <T ja="該当する記事が見つかりませんでした" en="No matching articles found" />
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map((post, i) => (
                  <ScrollReveal key={post.slug} delay={i * 60}>
                    <Link href={`/blog/${post.slug}/`} className="group block">
                      <SpotlightCard className="p-6">
                        <div className="relative z-10">
                          <div className="flex items-start justify-between mb-2">
                            <h2 className="text-lg font-semibold text-foreground group-hover:text-accent transition-colors">
                              <LT ja={post.titleJa} en={post.title} />
                            </h2>
                            <span className="text-xs text-muted shrink-0 ml-4">
                              {post.date}
                            </span>
                          </div>
                          <p className="text-muted text-sm mb-4 line-clamp-2 leading-relaxed">
                            <LT ja={post.descriptionJa} en={post.description} />
                          </p>
                          <div className="flex items-center gap-3 text-xs text-muted">
                            {post.readingTime && (
                              <span className="flex items-center gap-1">
                                <Clock size={12} />
                                {post.readingTime}
                              </span>
                            )}
                            {post.project && (
                              <span className="flex items-center gap-1">
                                <FolderOpen size={12} />
                                {post.project}
                              </span>
                            )}
                            {post.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="tag-pill">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </SpotlightCard>
                    </Link>
                  </ScrollReveal>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
