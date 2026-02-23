"use client";

import Link from "next/link";
import {
  ExternalLink,
  Github,
  ArrowLeft,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { T, LT } from "@/lib/i18n";
import { StatusBadge, TechBadge } from "@/components/ui/Badge";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SpotlightCard } from "@/components/effects/SpotlightCard";
import { ScrollReveal } from "@/components/effects/ScrollReveal";
import type { ProjectDefinition, ExternalArticle } from "@/lib/types";

const PLATFORM_META: Record<string, { label: string; icon: string; color: string }> = {
  devto: { label: "Dev.to", icon: "📝", color: "text-foreground" },
  qiita: { label: "Qiita", icon: "📗", color: "text-green-400" },
  zenn: { label: "Zenn", icon: "📘", color: "text-blue-400" },
  reddit: { label: "Reddit", icon: "🔶", color: "text-orange-400" },
  twitter: { label: "X / Twitter", icon: "𝕏", color: "text-foreground" },
};

type LucideIconComponent = React.ComponentType<{
  size?: number;
  className?: string;
}>;

function getIcon(name?: string): LucideIconComponent {
  if (!name) return LucideIcons.Box;
  const icons = LucideIcons as unknown as Record<string, LucideIconComponent>;
  return icons[name] || LucideIcons.Box;
}

export function ProjectDetailContent({
  project,
  externalArticles,
  prevProject,
  nextProject,
}: {
  project: ProjectDefinition;
  externalArticles: ExternalArticle[];
  prevProject: ProjectDefinition | null;
  nextProject: ProjectDefinition | null;
}) {
  return (
    <div>
      {/* Hero section with gradient bg */}
      <section className="relative overflow-hidden border-b border-border">
        {/* Background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-30%] left-[-10%] w-[500px] h-[500px] rounded-full bg-accent/5 blur-[100px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-accent-secondary/5 blur-[100px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-6 sm:px-10 pt-8 pb-16">
          <Breadcrumb
            items={[
              {
                label: <T ja="プロジェクト" en="Projects" />,
                href: "/projects",
              },
              { label: <LT ja={project.nameJa} en={project.name} /> },
            ]}
          />

          <div className="flex flex-col lg:flex-row lg:items-start lg:gap-16">
            {/* Left: info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-5">
                <StatusBadge status={project.status} />
                <span className="text-xs text-muted uppercase tracking-widest">
                  {project.category}
                </span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-5 tracking-tight">
                <LT ja={project.nameJa} en={project.name} />
              </h1>
              <p className="text-xl text-muted mb-4">
                <LT ja={project.taglineJa} en={project.tagline} />
              </p>
              <p className="text-foreground/70 mb-8 max-w-2xl leading-relaxed">
                <LT ja={project.descriptionJa} en={project.description} />
              </p>

              <div className="flex flex-wrap gap-3 mb-8">
                {project.liveUrl && (
                  <a
                    href={project.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-white font-medium hover:bg-accent-hover transition-all hover:shadow-lg hover:shadow-accent/20"
                  >
                    <ExternalLink size={16} />
                    <T ja="デモを見る" en="Live Demo" />
                  </a>
                )}
                {project.repositoryUrl && (
                  <a
                    href={project.repositoryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-border text-foreground hover:bg-card-hover transition-all"
                  >
                    <Github size={16} />
                    <T ja="ソースコード" en="Source Code" />
                  </a>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {project.techStack.map((tech) => (
                  <TechBadge key={tech} name={tech} />
                ))}
              </div>
            </div>

            {/* Right: quick stats */}
            <div className="hidden lg:flex flex-col gap-3 w-64 shrink-0 mt-10">
              <div className="glass rounded-xl p-4">
                <div className="text-xs text-muted uppercase tracking-widest mb-2">
                  <T ja="技術スタック" en="Tech Stack" />
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {project.techStack.length}
                </div>
              </div>
              <div className="glass rounded-xl p-4">
                <div className="text-xs text-muted uppercase tracking-widest mb-2">
                  <T ja="機能数" en="Features" />
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {project.features.length}
                </div>
              </div>
              {externalArticles.length > 0 && (
                <div className="glass rounded-xl p-4">
                  <div className="text-xs text-muted uppercase tracking-widest mb-2">
                    <T ja="外部記事" en="Articles" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {externalArticles.length}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-6 sm:px-10">
        {/* Features */}
        {project.features.length > 0 && (
          <section className="py-20">
            <ScrollReveal>
              <h2 className="text-2xl font-bold mb-10 heading-accent">
                <T ja="機能" en="Features" />
              </h2>
            </ScrollReveal>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {project.features.map((feature, i) => {
                const Icon = getIcon(feature.icon);
                return (
                  <ScrollReveal key={feature.title} delay={i * 60}>
                    <SpotlightCard className="p-5 h-full">
                      <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 rounded-xl bg-accent/10">
                            <Icon size={16} className="text-accent" />
                          </div>
                          <h3 className="font-semibold text-sm">
                            <LT ja={feature.titleJa} en={feature.title} />
                          </h3>
                        </div>
                        <p className="text-muted text-sm leading-relaxed">
                          <LT
                            ja={feature.descriptionJa}
                            en={feature.description}
                          />
                        </p>
                      </div>
                    </SpotlightCard>
                  </ScrollReveal>
                );
              })}
            </div>
          </section>
        )}

        {/* External platform articles */}
        {externalArticles.length > 0 && (
          <section className="py-16 border-t border-border">
            <ScrollReveal>
              <h2 className="text-lg font-semibold mb-5 flex items-center gap-2.5">
                <BookOpen size={16} className="text-accent-secondary" />
                <T ja="関連記事" en="Articles" />
              </h2>
              <div className="flex flex-wrap gap-3">
                {externalArticles.map((article, i) => {
                  const meta = PLATFORM_META[article.platform];
                  return (
                    <a
                      key={`${article.platform}-${i}`}
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card hover:border-accent/30 hover:bg-accent/5 transition-all text-sm ${meta?.color || "text-muted"}`}
                    >
                      <span>{meta?.icon || "📄"}</span>
                      <span className="font-medium">{meta?.label || article.platform}</span>
                      <ExternalLink size={12} className="text-muted" />
                    </a>
                  );
                })}
              </div>
            </ScrollReveal>
          </section>
        )}

        {/* Prev / Next project */}
        {(prevProject || nextProject) && (
          <nav className="py-16 border-t border-border grid grid-cols-2 gap-4">
            {prevProject ? (
              <ScrollReveal direction="left">
                <Link
                  href={`/projects/${prevProject.slug}/`}
                  className="group block h-full"
                >
                  <SpotlightCard className="p-5 h-full">
                    <div className="relative z-10">
                      <span className="text-xs text-muted flex items-center gap-1 mb-2">
                        <ArrowLeft size={12} />
                        <T ja="前のプロジェクト" en="Previous" />
                      </span>
                      <span className="text-sm font-medium text-foreground group-hover:text-accent transition-colors line-clamp-1">
                        <LT ja={prevProject.nameJa} en={prevProject.name} />
                      </span>
                    </div>
                  </SpotlightCard>
                </Link>
              </ScrollReveal>
            ) : (
              <div />
            )}
            {nextProject ? (
              <ScrollReveal direction="right">
                <Link
                  href={`/projects/${nextProject.slug}/`}
                  className="group block h-full"
                >
                  <SpotlightCard className="p-5 h-full text-right">
                    <div className="relative z-10">
                      <span className="text-xs text-muted flex items-center justify-end gap-1 mb-2">
                        <T ja="次のプロジェクト" en="Next" />
                        <ArrowRight size={12} />
                      </span>
                      <span className="text-sm font-medium text-foreground group-hover:text-accent transition-colors line-clamp-1">
                        <LT ja={nextProject.nameJa} en={nextProject.name} />
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
