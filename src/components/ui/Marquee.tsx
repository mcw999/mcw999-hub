"use client";

import Link from "next/link";
import { TrendingUp, Flame, BarChart3, type LucideIcon } from "lucide-react";
import { useLocale, LT } from "@/lib/i18n";
import type { ProjectDefinition } from "@/lib/types";

const PROJECT_ICONS: Record<string, LucideIcon> = {
  easytrade: TrendingUp,
  "crypto-overheat-analyze": Flame,
  "crypto-market-section": BarChart3,
};

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  crypto: TrendingUp,
  tool: TrendingUp,
  saas: TrendingUp,
  platform: BarChart3,
};

function ProjectPill({ project }: { project: ProjectDefinition }) {
  const Icon = PROJECT_ICONS[project.slug] || CATEGORY_ICONS[project.category] || TrendingUp;

  return (
    <Link
      href={`/projects/${project.slug}/`}
      className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.06] hover:border-accent/30 hover:bg-accent/5 transition-all shrink-0"
    >
      <div className="p-1 rounded-md bg-accent/10">
        <Icon size={14} className="text-accent" />
      </div>
      <span className="text-sm font-medium text-foreground/80 whitespace-nowrap">
        <LT ja={project.nameJa} en={project.name} />
      </span>
    </Link>
  );
}

export function Marquee({ projects }: { projects: ProjectDefinition[] }) {
  if (projects.length === 0) return null;

  // Repeat items enough times to fill the viewport and create seamless loop
  const repeated = [...projects, ...projects, ...projects, ...projects];

  return (
    <div className="w-full overflow-hidden border-b border-white/[0.04] bg-white/[0.01]">
      <div className="marquee-track py-3">
        <div className="marquee-content">
          {repeated.map((project, i) => (
            <ProjectPill key={`${project.slug}-${i}`} project={project} />
          ))}
        </div>
      </div>
    </div>
  );
}
