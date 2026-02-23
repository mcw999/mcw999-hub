import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllProjects, getProject, getExternalArticlesForProject } from "@/lib/content";
import { ProjectStructuredData } from "@/components/seo/StructuredData";
import { ProjectDetailContent } from "@/components/pages/ProjectDetailContent";

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
    alternates: {
      canonical: `/projects/${slug}`,
    },
    openGraph: {
      title: project.name,
      description: project.tagline,
      type: "website",
    },
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [project, allProjects, externalArticles] = await Promise.all([
    getProject(slug),
    getAllProjects(),
    getExternalArticlesForProject(slug),
  ]);
  if (!project) notFound();
  const currentIndex = allProjects.findIndex((p) => p.slug === slug);
  const prevProject =
    currentIndex > 0 ? allProjects[currentIndex - 1] : null;
  const nextProject =
    currentIndex < allProjects.length - 1 ? allProjects[currentIndex + 1] : null;

  return (
    <>
      <ProjectStructuredData project={project} />
      <ProjectDetailContent
        project={project}
        externalArticles={externalArticles}
        prevProject={prevProject}
        nextProject={nextProject}
      />
    </>
  );
}
