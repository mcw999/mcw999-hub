"use client";

import Link from "next/link";
import {
  Github,
  Globe,
  Twitter,
  ArrowRight,
  Rocket,
} from "lucide-react";
import { T, LT } from "@/lib/i18n";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SpotlightCard } from "@/components/effects/SpotlightCard";
import { ScrollReveal } from "@/components/effects/ScrollReveal";
import { StatusBadge } from "@/components/ui/Badge";
import type { AuthorMeta, ProjectDefinition } from "@/lib/types";

const LINK_ICONS: Record<
  string,
  React.ComponentType<{ size?: number; className?: string }>
> = {
  github: Github,
  twitter: Twitter,
  website: Globe,
};

const LINK_LABELS: Record<string, { ja: string; en: string }> = {
  github: { ja: "GitHub", en: "GitHub" },
  twitter: { ja: "Twitter / X", en: "Twitter / X" },
  zenn: { ja: "Zenn", en: "Zenn" },
  qiita: { ja: "Qiita", en: "Qiita" },
  devto: { ja: "Dev.to", en: "Dev.to" },
  website: { ja: "ウェブサイト", en: "Website" },
};

export function AboutContent({
  author,
  projects,
}: {
  author: AuthorMeta;
  projects: ProjectDefinition[];
}) {
  return (
    <div>
      {/* Header */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-40%] left-[-10%] w-[500px] h-[500px] rounded-full bg-accent-tertiary/3 blur-[100px]" />
          <div className="absolute bottom-[-30%] right-[-10%] w-[400px] h-[400px] rounded-full bg-accent/3 blur-[100px]" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-6 sm:px-10 pt-8 pb-16">
          <Breadcrumb items={[{ label: <T ja="概要" en="About" /> }]} />

          <div className="flex flex-col sm:flex-row sm:items-center gap-8">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-accent/20 via-accent-secondary/10 to-accent-tertiary/20 border border-accent/20 flex items-center justify-center shrink-0 shadow-lg shadow-accent/10">
              <span className="text-4xl sm:text-5xl font-bold text-gradient">
                {author.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold mb-3 tracking-tight">
                {author.name}
              </h1>
              <p className="text-lg text-muted leading-relaxed max-w-xl">
                <LT ja={author.bioJa} en={author.bio} />
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-6 sm:px-10">
        {/* Skills */}
        <section className="py-16">
          <ScrollReveal>
            <h2 className="text-xl font-bold mb-8 heading-accent">
              <T ja="スキル" en="Skills" />
            </h2>
          </ScrollReveal>
          <div className="flex flex-wrap gap-2.5">
            {author.skills.map((skill, i) => (
              <ScrollReveal key={skill} delay={i * 25} direction="scale">
                <span className="skill-chip">{skill}</span>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* Projects showcase */}
        {projects.length > 0 && (
          <section className="py-16 border-t border-border">
            <ScrollReveal>
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-accent/10">
                    <Rocket size={18} className="text-accent" />
                  </div>
                  <h2 className="text-xl font-bold heading-accent">
                    <T ja="プロジェクト" en="Projects" />
                  </h2>
                </div>
                <Link
                  href="/projects/"
                  className="flex items-center gap-1 text-sm text-muted hover:text-accent transition-colors"
                >
                  <T ja="すべて見る" en="View all" />{" "}
                  <ArrowRight size={14} />
                </Link>
              </div>
            </ScrollReveal>
            <div className="grid gap-4 sm:grid-cols-2">
              {projects.map((project, i) => (
                <ScrollReveal key={project.slug} delay={i * 80}>
                  <Link
                    href={`/projects/${project.slug}/`}
                    className="group block h-full"
                  >
                    <SpotlightCard className="p-5 h-full">
                      <div className="relative z-10">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-foreground group-hover:text-accent transition-colors">
                            <LT ja={project.nameJa} en={project.name} />
                          </h3>
                          <StatusBadge status={project.status} />
                        </div>
                        <p className="text-muted text-sm line-clamp-2 leading-relaxed">
                          <LT
                            ja={project.descriptionJa}
                            en={project.description}
                          />
                        </p>
                      </div>
                    </SpotlightCard>
                  </Link>
                </ScrollReveal>
              ))}
            </div>
          </section>
        )}

        {/* Links */}
        {Object.entries(author.links).some(([, v]) => v) && (
          <section className="py-16 border-t border-border">
            <ScrollReveal>
              <h2 className="text-xl font-bold mb-8 heading-accent">
                <T ja="リンク" en="Links" />
              </h2>
            </ScrollReveal>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(author.links).map(([key, url], i) => {
                if (!url) return null;
                const Icon = LINK_ICONS[key] || Globe;
                const label = LINK_LABELS[key] || { ja: key, en: key };
                return (
                  <ScrollReveal key={key} delay={i * 60}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block h-full"
                    >
                      <SpotlightCard className="p-5 h-full">
                        <div className="relative z-10 flex items-center gap-4">
                          <div className="p-2.5 rounded-xl bg-accent/10 group-hover:bg-accent/20 transition-colors">
                            <Icon size={18} className="text-accent" />
                          </div>
                          <span className="font-medium text-foreground group-hover:text-accent transition-colors">
                            <T ja={label.ja} en={label.en} />
                          </span>
                        </div>
                      </SpotlightCard>
                    </a>
                  </ScrollReveal>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
