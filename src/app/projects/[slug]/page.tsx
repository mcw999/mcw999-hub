import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Github, ArrowLeft } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { getAllProjects, getProject } from "@/lib/content";
import { StatusBadge, TechBadge } from "@/components/ui/Badge";
import { ProjectStructuredData } from "@/components/seo/StructuredData";
import type { ProjectDefinition } from "@/lib/types";

type LucideIconComponent = React.ComponentType<{ size?: number; className?: string }>;

function getIcon(name?: string): LucideIconComponent {
  if (!name) return LucideIcons.Box;
  const icons = LucideIcons as unknown as Record<string, LucideIconComponent>;
  return icons[name] || LucideIcons.Box;
}

export async function generateStaticParams() {
  const projects = await getAllProjects();
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) return { title: "Not Found" };
  return {
    title: project.name,
    description: project.description,
    openGraph: {
      title: project.name,
      description: project.tagline,
      type: "website",
    },
  };
}

function FeatureCard({ feature }: { feature: ProjectDefinition["features"][number] }) {
  const Icon = getIcon(feature.icon);
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-md bg-accent/10">
          <Icon size={18} className="text-accent" />
        </div>
        <h3 className="font-medium">{feature.titleJa || feature.title}</h3>
      </div>
      <p className="text-muted text-sm">
        {feature.descriptionJa || feature.description}
      </p>
    </div>
  );
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) notFound();

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <ProjectStructuredData project={project} />

      <Link
        href="/projects/"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft size={14} />
        All Projects
      </Link>

      {/* Hero */}
      <section className="mb-12">
        <div className="flex items-start gap-4 mb-4">
          <h1 className="text-3xl font-bold">{project.nameJa || project.name}</h1>
          <StatusBadge status={project.status} />
        </div>
        <p className="text-lg text-muted mb-6">
          {project.taglineJa || project.tagline}
        </p>
        <p className="text-foreground/80 mb-6 max-w-3xl">
          {project.descriptionJa || project.description}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap gap-3 mb-8">
          {project.liveUrl && (
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent text-white font-medium hover:bg-accent-hover transition-colors"
            >
              <ExternalLink size={16} />
              Live Demo
            </a>
          )}
          {project.repositoryUrl && (
            <a
              href={project.repositoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border text-foreground hover:bg-card transition-colors"
            >
              <Github size={16} />
              Source Code
            </a>
          )}
        </div>

        {/* Tech Stack */}
        <div className="flex flex-wrap gap-2">
          {project.techStack.map((tech) => (
            <TechBadge key={tech} name={tech} />
          ))}
        </div>
      </section>

      {/* Features */}
      {project.features.length > 0 && (
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Features</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {project.features.map((feature) => (
              <FeatureCard key={feature.title} feature={feature} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
