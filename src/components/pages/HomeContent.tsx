"use client";

import {
  ArrowRight,
  ArrowUpRight,
  ExternalLink,
  Github,
  Sparkles,
  Layers,
  Zap,
  Terminal,
} from "lucide-react";
import Link from "next/link";
import { useLocale, T, LT } from "@/lib/i18n";
import { StatusBadge, TechBadge } from "@/components/ui/Badge";
import { Marquee } from "@/components/ui/Marquee";
import { SpotlightCard } from "@/components/effects/SpotlightCard";
import { ScrollReveal } from "@/components/effects/ScrollReveal";
import { TypeWriter } from "@/components/effects/TypeWriter";
import { ParticleField } from "@/components/effects/ParticleField";
import type { ProjectDefinition, AuthorMeta, ExternalArticle } from "@/lib/types";

const PLATFORM_META: Record<string, { label: string; icon: string }> = {
  devto: { label: "Dev.to", icon: "📝" },
  qiita: { label: "Qiita", icon: "📗" },
  zenn: { label: "Zenn", icon: "📘" },
  hashnode: { label: "Hashnode", icon: "📓" },
  bluesky: { label: "Bluesky", icon: "🦋" },
  mastodon: { label: "Mastodon", icon: "🐘" },
  github: { label: "GitHub", icon: "🐙" },
};

export function HomeContent({
  allProjects,
  featured,
  author,
  externalArticles,
}: {
  allProjects: ProjectDefinition[];
  featured: ProjectDefinition[];
  author: AuthorMeta;
  externalArticles: ExternalArticle[];
}) {
  const { locale } = useLocale();

  const roles =
    locale === "ja"
      ? ["暗号資産トレーディングツール", "開発者向けプロダクト", "Webアプリケーション"]
      : ["Crypto Trading Tools", "Developer Products", "Web Applications"];

  const activeCount = allProjects.filter((p) => p.status === "active").length;
  const techCount = new Set(allProjects.flatMap((p) => p.techStack)).size;

  const mainProject = featured[0];
  const subProjects = featured.slice(1);

  return (
    <div>
      <Marquee projects={allProjects} />

      {/* ─── Hero: Asymmetric split ─── */}
      <section className="hero-gradient relative min-h-[100vh] overflow-hidden">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="absolute inset-0 z-[1]">
          <ParticleField />
        </div>

        {/* Giant watermark name */}
        <div
          className="absolute bottom-[-5%] right-[-3%] text-[20vw] font-black leading-none text-white/[0.02] select-none pointer-events-none z-[2] tracking-tighter"
          aria-hidden
        >
          {author.name}
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-6 sm:px-10 pt-32 pb-24 flex flex-col lg:flex-row lg:items-center lg:gap-16 min-h-[100vh]">
          {/* Left: text — 左寄せ */}
          <div className="flex-1 max-w-2xl">
            <div className="fade-up">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5 mb-10">
                <Sparkles size={14} className="text-accent" />
                <span className="text-sm font-medium text-accent">
                  <T ja="個人開発者" en="Solo Developer" />
                </span>
              </div>
            </div>

            <h1 className="text-[clamp(3.5rem,8vw,8rem)] font-black leading-[0.9] mb-8 fade-up fade-up-delay-1 tracking-tighter">
              <span className="text-gradient">{author.name}</span>
            </h1>

            <p className="text-xl text-muted max-w-lg mb-6 leading-relaxed fade-up fade-up-delay-2">
              <LT ja={author.bioJa} en={author.bio} />
            </p>

            <div className="text-base text-foreground/50 mb-12 fade-up fade-up-delay-3">
              <T ja="つくっているもの" en="Building" />
              <span className="mx-2 text-border">—</span>
              <span className="text-accent font-medium">
                <TypeWriter words={roles} />
              </span>
            </div>

            <div className="flex flex-wrap gap-2 fade-up fade-up-delay-4">
              {author.skills.slice(0, 8).map((skill) => (
                <span key={skill} className="skill-chip">{skill}</span>
              ))}
              {author.skills.length > 8 && (
                <span className="skill-chip text-muted">+{author.skills.length - 8}</span>
              )}
            </div>
          </div>

          {/* Right: floating stat cards — 右寄せ */}
          <div className="hidden lg:flex flex-col gap-4 mt-16 lg:mt-0 w-72 shrink-0 fade-up fade-up-delay-3">
            {[
              { icon: Layers, val: allProjects.length, lbl: <T ja="プロジェクト" en="Projects" />, bgClass: "bg-accent/10", textClass: "text-accent" },
              { icon: Zap, val: activeCount, lbl: <T ja="稼働中" en="Active" />, bgClass: "bg-accent-secondary/10", textClass: "text-accent-secondary" },
              { icon: Terminal, val: `${techCount}+`, lbl: <T ja="技術スタック" en="Tech Stack" />, bgClass: "bg-accent-tertiary/10", textClass: "text-accent-tertiary" },
            ].map((s, i) => (
              <div
                key={i}
                className="glass rounded-2xl p-5 flex items-center gap-4"
                style={{ animationDelay: `${0.4 + i * 0.12}s` }}
              >
                <div className={`p-2.5 rounded-xl ${s.bgClass}`}>
                  <s.icon size={20} className={s.textClass} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">{s.val}</div>
                  <div className="text-xs text-muted uppercase tracking-wider">{s.lbl}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Bento Grid: mixed content ─── */}
      <section className="mx-auto max-w-7xl px-6 sm:px-10 py-20 -mt-8 relative z-20">
        <div className="bento-grid">
          {/* ① Main featured project — large card */}
          {mainProject && (
            <ScrollReveal className="bento-main">
              <Link href={`/projects/${mainProject.slug}/`} className="group block h-full">
                <SpotlightCard className="p-8 sm:p-10 h-full flex flex-col">
                  <div className="relative z-10 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-6">
                      <span className="text-xs font-medium uppercase tracking-widest text-accent">
                        <T ja="注目" en="Featured" />
                      </span>
                      <StatusBadge status={mainProject.status} />
                    </div>
                    <h3 className="text-3xl sm:text-4xl font-bold text-foreground group-hover:text-accent transition-colors mb-4 tracking-tight">
                      <LT ja={mainProject.nameJa} en={mainProject.name} />
                    </h3>
                    <p className="text-muted leading-relaxed mb-8 max-w-lg">
                      <LT ja={mainProject.descriptionJa} en={mainProject.description} />
                    </p>
                    <div className="flex flex-wrap gap-1.5 mb-8">
                      {mainProject.techStack.slice(0, 6).map((tech) => (
                        <TechBadge key={tech} name={tech} />
                      ))}
                      {mainProject.techStack.length > 6 && (
                        <span className="text-xs text-muted self-center ml-1">
                          +{mainProject.techStack.length - 6}
                        </span>
                      )}
                    </div>
                    <div className="mt-auto flex items-center gap-4">
                      {mainProject.liveUrl && (
                        <span className="flex items-center gap-1.5 text-sm text-muted">
                          <ExternalLink size={14} /> <T ja="デモ" en="Live" />
                        </span>
                      )}
                      {mainProject.repositoryUrl && (
                        <span className="flex items-center gap-1.5 text-sm text-muted">
                          <Github size={14} /> <T ja="ソース" en="Source" />
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-sm font-medium text-accent ml-auto group-hover:gap-2 transition-all">
                        <T ja="詳しく見る" en="Explore" />
                        <ArrowUpRight size={16} />
                      </span>
                    </div>
                  </div>
                </SpotlightCard>
              </Link>
            </ScrollReveal>
          )}

          {/* ② Stats row (mobile) — lg以上ではヒーローに表示済み */}
          <ScrollReveal className="bento-stats-mobile lg:hidden" delay={50}>
            <div className="grid grid-cols-3 gap-3">
              {[
                { val: allProjects.length, lbl: <T ja="プロジェクト" en="Projects" /> },
                { val: activeCount, lbl: <T ja="稼働中" en="Active" /> },
                { val: `${techCount}+`, lbl: <T ja="技術" en="Tech" /> },
              ].map((s, i) => (
                <div key={i} className="glass rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-gradient">{s.val}</div>
                  <div className="text-[10px] text-muted uppercase tracking-wider mt-1">{s.lbl}</div>
                </div>
              ))}
            </div>
          </ScrollReveal>

          {/* ③ Sub featured projects */}
          {subProjects.map((project, i) => (
            <ScrollReveal key={project.slug} delay={100 + i * 80}>
              <Link href={`/projects/${project.slug}/`} className="group block h-full">
                <SpotlightCard className="p-6 h-full flex flex-col">
                  <div className="relative z-10 flex-1 flex flex-col">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-lg text-foreground group-hover:text-accent transition-colors">
                        <LT ja={project.nameJa} en={project.name} />
                      </h3>
                      <StatusBadge status={project.status} />
                    </div>
                    <p className="text-muted text-sm mb-4 line-clamp-2 leading-relaxed">
                      <LT ja={project.descriptionJa} en={project.description} />
                    </p>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {project.techStack.slice(0, 4).map((tech) => (
                        <TechBadge key={tech} name={tech} />
                      ))}
                    </div>
                    <div className="mt-auto flex items-center gap-1 text-xs text-muted group-hover:text-accent transition-colors">
                      <T ja="詳細" en="Details" />
                      <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </SpotlightCard>
              </Link>
            </ScrollReveal>
          ))}

          {/* ④ CTA: View all projects */}
          <ScrollReveal delay={200}>
            <Link href="/projects/" className="group block h-full">
              <SpotlightCard className="p-6 h-full flex items-center justify-center text-center">
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-accent/20 transition-colors">
                    <ArrowUpRight size={24} className="text-accent group-hover:rotate-45 transition-transform duration-300" />
                  </div>
                  <span className="text-sm font-medium text-muted group-hover:text-accent transition-colors">
                    <T ja="すべてのプロジェクト" en="All Projects" />
                  </span>
                </div>
              </SpotlightCard>
            </Link>
          </ScrollReveal>

          {/* ⑤ Platform links */}
          <ScrollReveal delay={250}>
            <SpotlightCard className="p-6 h-full flex flex-col">
              <div className="relative z-10 flex-1 flex flex-col">
                <span className="text-xs font-medium uppercase tracking-widest text-accent-secondary mb-4">
                  <T ja="プラットフォーム" en="Platforms" />
                </span>
                <div className="flex flex-wrap gap-2 flex-1">
                  {/* Author profile links */}
                  {Object.entries(author.links).map(([key, url]) => {
                    if (!url) return null;
                    const meta = PLATFORM_META[key];
                    if (!meta) return null;
                    return (
                      <a
                        key={key}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-white/[0.02] hover:border-accent/30 hover:bg-accent/5 transition-all text-sm text-muted hover:text-foreground"
                      >
                        <span>{meta.icon}</span>
                        <span className="font-medium">{meta.label}</span>
                      </a>
                    );
                  })}
                </div>
                {externalArticles.length > 0 && (
                  <div className="mt-3 text-xs text-muted/50">
                    {externalArticles.length} <T ja="件の記事を公開中" en="articles published" />
                  </div>
                )}
              </div>
            </SpotlightCard>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
