"use client";

import Link from "next/link";
import { ArrowRight, ExternalLink, Github, Rocket } from "lucide-react";
import { T, LT } from "@/lib/i18n";
import { TechBadge } from "@/components/ui/Badge";
import { SpotlightCard } from "@/components/effects/SpotlightCard";
import type { ProjectDefinition } from "@/lib/types";

export function ProjectCTA({ project }: { project: ProjectDefinition }) {
  return (
    <div className="mt-16">
      <SpotlightCard className="p-6 sm:p-8">
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-accent/10">
              <Rocket size={18} className="text-accent" />
            </div>
            <span className="text-xs font-medium uppercase tracking-widest text-accent">
              <T ja="このプロジェクトを試す" en="Try This Project" />
            </span>
          </div>

          {/* Project name + tagline */}
          <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2 tracking-tight">
            <LT ja={project.nameJa} en={project.name} />
          </h3>
          <p className="text-muted text-sm mb-6 leading-relaxed max-w-xl">
            <LT ja={project.taglineJa} en={project.tagline} />
          </p>

          {/* Key features grid */}
          {project.features.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-3 mb-6">
              {project.features.slice(0, 3).map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-xl border border-border bg-white/[0.02] p-3"
                >
                  <p className="text-sm font-medium text-foreground mb-1">
                    <LT ja={feature.titleJa} en={feature.title} />
                  </p>
                  <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                    <LT ja={feature.descriptionJa} en={feature.description} />
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Tech stack badges */}
          <div className="flex flex-wrap gap-1.5 mb-6">
            {project.techStack.slice(0, 6).map((tech) => (
              <TechBadge key={tech} name={tech} />
            ))}
          </div>

          {/* CTA buttons */}
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/projects/${project.slug}/`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white font-medium text-sm hover:bg-accent-hover transition-all hover:shadow-lg hover:shadow-accent/20"
            >
              <T ja="プロジェクトを見る" en="View Project" />
              <ArrowRight size={14} />
            </Link>
            {project.demoUrl && (
              <a
                href={project.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-foreground text-sm hover:bg-card-hover transition-all"
              >
                <ExternalLink size={14} />
                <T ja="デモ" en="Demo" />
              </a>
            )}
            {project.repositoryUrl && (
              <a
                href={project.repositoryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-foreground text-sm hover:bg-card-hover transition-all"
              >
                <Github size={14} />
                <T ja="ソースコード" en="Source Code" />
              </a>
            )}
          </div>
        </div>
      </SpotlightCard>
    </div>
  );
}

export function ExploreProjectsCTA() {
  return (
    <div className="mt-16">
      <SpotlightCard className="p-6 text-center">
        <div className="relative z-10">
          <div className="p-2.5 rounded-xl bg-accent/10 inline-flex mb-4">
            <Rocket size={20} className="text-accent" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            <T ja="プロジェクトを見る" en="Explore Projects" />
          </h3>
          <p className="text-sm text-muted mb-5">
            <T
              ja="他のプロジェクトもチェックしてみてください。"
              en="Check out other projects I'm working on."
            />
          </p>
          <Link
            href="/projects/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white font-medium text-sm hover:bg-accent-hover transition-all"
          >
            <T ja="プロジェクト一覧" en="All Projects" />
            <ArrowRight size={14} />
          </Link>
        </div>
      </SpotlightCard>
    </div>
  );
}
