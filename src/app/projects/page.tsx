import type { Metadata } from "next";
import { getAllProjects } from "@/lib/content";
import { ProjectsContent } from "@/components/pages/ProjectsContent";

export const metadata: Metadata = {
  title: "Projects",
  description: "Personal development projects.",
  alternates: { canonical: "/projects" },
};

export default async function ProjectsPage() {
  const projects = await getAllProjects();
  return <ProjectsContent projects={projects} />;
}
