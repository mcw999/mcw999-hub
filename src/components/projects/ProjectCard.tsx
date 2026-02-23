import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ProjectDefinition } from "@/lib/types";
import { StatusBadge, TechBadge } from "@/components/ui/Badge";

export function ProjectCard({ project }: { project: ProjectDefinition }) {
  return (
    <Link
      href={`/projects/${project.slug}/`}
      className="group gradient-border p-6 block"
    >
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-semibold text-lg text-foreground group-hover:text-accent transition-colors">
            {project.nameJa || project.name}
          </h3>
          <StatusBadge status={project.status} />
        </div>
        <p className="text-muted text-sm mb-4 line-clamp-2 leading-relaxed">
          {project.descriptionJa || project.description}
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
        <div className="flex items-center gap-1 text-xs text-muted group-hover:text-accent transition-colors">
          <span>View details</span>
          <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </Link>
  );
}
