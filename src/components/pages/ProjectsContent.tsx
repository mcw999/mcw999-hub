"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { T, LT } from "@/lib/i18n";
import { StatusBadge, TechBadge } from "@/components/ui/Badge";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SpotlightCard } from "@/components/effects/SpotlightCard";
import { ScrollReveal } from "@/components/effects/ScrollReveal";
import type { ProjectDefinition } from "@/lib/types";

export function ProjectsContent({ projects }: { projects: ProjectDefinition[] }) {
  return (
    <div>
      {/* Page header with subtle gradient */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-50%] right-[-20%] w-[600px] h-[400px] rounded-full bg-accent/3 blur-[100px]" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-6 sm:px-10 pt-8 pb-14">
          <Breadcrumb items={[{ label: <T ja="プロジェクト" en="Projects" /> }]} />
          <h1 className="text-4xl sm:text-5xl font-bold mb-3 tracking-tight">
            <T ja="プロジェクト" en="Projects" />
          </h1>
          <p className="text-muted text-lg max-w-lg">
            <T
              ja="個人開発しているプロジェクトの一覧です。"
              en="A collection of my personal projects."
            />
          </p>
        </div>
      </section>

      {/* Grid */}
      <div className="mx-auto max-w-7xl px-6 sm:px-10 py-16">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, i) => (
            <ScrollReveal key={project.slug} delay={i * 60}>
              <Link
                href={`/projects/${project.slug}/`}
                className="group block h-full"
              >
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
                      {project.techStack.length > 4 && (
                        <span className="text-xs text-muted self-center">
                          +{project.techStack.length - 4}
                        </span>
                      )}
                    </div>
                    <div className="mt-auto flex items-center gap-1 text-xs text-muted group-hover:text-accent transition-colors">
                      <T ja="詳細を見る" en="View details" />
                      <ArrowRight
                        size={12}
                        className="group-hover:translate-x-0.5 transition-transform"
                      />
                    </div>
                  </div>
                </SpotlightCard>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </div>
  );
}
