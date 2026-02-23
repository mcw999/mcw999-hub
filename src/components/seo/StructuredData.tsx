import type { ProjectDefinition } from "@/lib/types";

const BASE_URL = "https://mcw999.github.io/mcw999-hub";

export function ProjectStructuredData({ project }: { project: ProjectDefinition }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: project.name,
    description: project.description,
    applicationCategory: "DeveloperApplication",
    operatingSystem: project.platforms.join(", "),
    url: project.liveUrl || `${BASE_URL}/projects/${project.slug}`,
    author: {
      "@type": "Person",
      name: "mcw999",
      url: BASE_URL,
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

export function ArticleStructuredData({
  title,
  description,
  date,
  slug,
}: {
  title: string;
  description: string;
  date: string;
  slug: string;
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    datePublished: date,
    dateModified: date,
    url: `${BASE_URL}/blog/${slug}`,
    author: {
      "@type": "Person",
      name: "mcw999",
      url: BASE_URL,
    },
    publisher: {
      "@type": "Person",
      name: "mcw999",
      url: BASE_URL,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${BASE_URL}/blog/${slug}`,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function PersonStructuredData() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "mcw999",
    url: BASE_URL,
    description:
      "Solo developer building tools for crypto trading, cultural experiences, and developer productivity.",
    sameAs: [
      "https://github.com/mcw999",
      "https://qiita.com/mcw999",
    ],
    jobTitle: "Software Developer",
    knowsAbout: [
      "TypeScript",
      "React",
      "Next.js",
      "Rust",
      "Cryptocurrency",
      "Web Development",
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
