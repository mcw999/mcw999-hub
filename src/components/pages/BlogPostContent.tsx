"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Calendar,
  FolderOpen,
} from "lucide-react";
import { T, LT } from "@/lib/i18n";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SpotlightCard } from "@/components/effects/SpotlightCard";
import { ScrollReveal } from "@/components/effects/ScrollReveal";
import type { BlogPostMeta } from "@/lib/types";
import type { ReactNode } from "react";

export function BlogPostContent({
  post,
  content,
  prevPost,
  nextPost,
}: {
  post: BlogPostMeta;
  content: ReactNode;
  prevPost: BlogPostMeta | null;
  nextPost: BlogPostMeta | null;
}) {
  return (
    <div>
      {/* Article header */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-40%] left-[20%] w-[500px] h-[400px] rounded-full bg-accent-secondary/3 blur-[100px]" />
        </div>
        <div className="relative z-10 mx-auto max-w-4xl px-6 sm:px-10 pt-8 pb-14">
          <Breadcrumb
            items={[
              { label: <T ja="ブログ" en="Blog" />, href: "/blog" },
              { label: <LT ja={post.titleJa} en={post.title} /> },
            ]}
          />

          <div className="flex flex-wrap gap-2 mb-5">
            {post.tags.map((tag) => (
              <span key={tag} className="tag-pill">
                #{tag}
              </span>
            ))}
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 leading-tight tracking-tight">
            <LT ja={post.titleJa} en={post.title} />
          </h1>
          <div className="flex items-center gap-5 text-sm text-muted">
            <span className="flex items-center gap-1.5">
              <Calendar size={14} />
              {post.date}
            </span>
            {post.readingTime && (
              <span className="flex items-center gap-1.5">
                <Clock size={14} />
                {post.readingTime}
              </span>
            )}
            {post.project && (
              <Link
                href={`/projects/${post.project}/`}
                className="flex items-center gap-1.5 hover:text-accent transition-colors"
              >
                <FolderOpen size={14} />
                {post.project}
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Article body */}
      <div className="mx-auto max-w-3xl px-6 sm:px-10 py-16">
        <article className="prose prose-invert prose-zinc max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-accent prose-code:text-accent prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-border prose-lg">
          {content}
        </article>

        {/* Related project */}
        {post.project && (
          <ScrollReveal>
            <div className="mt-16">
              <Link
                href={`/projects/${post.project}/`}
                className="group block"
              >
                <SpotlightCard className="p-5">
                  <div className="relative z-10 flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-accent/10 group-hover:bg-accent/20 transition-colors">
                      <FolderOpen size={18} className="text-accent" />
                    </div>
                    <div>
                      <p className="text-xs text-muted mb-0.5">
                        <T ja="関連プロジェクト" en="Related Project" />
                      </p>
                      <span className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors">
                        {post.project}
                      </span>
                    </div>
                    <ArrowRight
                      size={16}
                      className="ml-auto text-muted group-hover:text-accent group-hover:translate-x-1 transition-all"
                    />
                  </div>
                </SpotlightCard>
              </Link>
            </div>
          </ScrollReveal>
        )}

        {/* Prev / Next */}
        {(prevPost || nextPost) && (
          <nav className="mt-16 pt-10 border-t border-border grid grid-cols-2 gap-4">
            {prevPost ? (
              <ScrollReveal direction="left">
                <Link
                  href={`/blog/${prevPost.slug}/`}
                  className="group block h-full"
                >
                  <SpotlightCard className="p-5 h-full">
                    <div className="relative z-10">
                      <span className="text-xs text-muted flex items-center gap-1 mb-2">
                        <ArrowLeft size={12} />
                        <T ja="前の記事" en="Previous" />
                      </span>
                      <span className="text-sm font-medium text-foreground group-hover:text-accent transition-colors line-clamp-2">
                        <LT ja={prevPost.titleJa} en={prevPost.title} />
                      </span>
                    </div>
                  </SpotlightCard>
                </Link>
              </ScrollReveal>
            ) : (
              <div />
            )}
            {nextPost ? (
              <ScrollReveal direction="right">
                <Link
                  href={`/blog/${nextPost.slug}/`}
                  className="group block h-full"
                >
                  <SpotlightCard className="p-5 h-full text-right">
                    <div className="relative z-10">
                      <span className="text-xs text-muted flex items-center justify-end gap-1 mb-2">
                        <T ja="次の記事" en="Next" />
                        <ArrowRight size={12} />
                      </span>
                      <span className="text-sm font-medium text-foreground group-hover:text-accent transition-colors line-clamp-2">
                        <LT ja={nextPost.titleJa} en={nextPost.title} />
                      </span>
                    </div>
                  </SpotlightCard>
                </Link>
              </ScrollReveal>
            ) : (
              <div />
            )}
          </nav>
        )}
      </div>
    </div>
  );
}
