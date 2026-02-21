import type { ProjectDefinition } from "@/lib/types";

export function ProjectStructuredData({ project }: { project: ProjectDefinition }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: project.name,
    description: project.description,
    applicationCategory: "DeveloperApplication",
    operatingSystem: project.platforms.join(", "),
    author: {
      "@type": "Person",
      name: "mcw999",
    },
    dateCreated: project.createdAt,
    dateModified: project.updatedAt,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
