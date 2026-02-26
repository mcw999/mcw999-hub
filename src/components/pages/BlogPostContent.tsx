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
import { TableOfContents } from "@/components/blog/TableOfContents";
import { ReadingProgress } from "@/components/blog/ReadingProgress";
import { ShareButtons } from "@/components/blog/ShareButtons";
import { ProjectCTA, ExploreProjectsCTA } from "@/components/blog/ProjectCTA";
import type { BlogPostMeta, ProjectDefinition } from "@/lib/types";
import type { ReactNode } from "react";

export function BlogPostContent({
  post,
  content,
  prevPost,
  nextPost,
  relatedProject,
}: {
  post: BlogPostMeta;
  content: ReactNode;
  prevPost: BlogPostMeta | null;
  nextPost: BlogPostMeta | null;
  relatedProject?: ProjectDefinition | null;
}) {
  return (
    <div>
      <ReadingProgress />

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
          <div className="flex items-center justify-between">
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
            <ShareButtons title={post.titleJa || post.title} slug={post.slug} />
          </div>
        </div>
      </section>

      {/* Article body */}
      <div className="relative mx-auto max-w-3xl px-6 sm:px-10 py-16">
        {/* TOC sidebar - positioned outside the article flow */}
        <div className="hidden xl:block absolute left-[calc(100%+2rem)] top-16 w-52">
          <TableOfContents />
        </div>

        <article className="prose prose-invert prose-zinc max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-accent prose-code:text-accent prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-border prose-lg">
          {content}
        </article>

        {/* Related project CTA */}
        <ScrollReveal>
          {relatedProject ? (
            <ProjectCTA project={relatedProject} />
          ) : (
            <ExploreProjectsCTA />
          )}
        </ScrollReveal>

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
