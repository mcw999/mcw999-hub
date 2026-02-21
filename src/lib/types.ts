export interface ProjectDefinition {
  slug: string;
  name: string;
  nameJa?: string;
  tagline: string;
  taglineJa?: string;
  description: string;
  descriptionJa?: string;

  category: "crypto" | "saas" | "tool" | "platform" | "other";
  tags: string[];
  targetAudience: string[];
  status: "active" | "beta" | "development" | "prototype" | "archived";

  techStack: string[];
  platforms: ("web" | "desktop" | "mobile" | "cli")[];

  repositoryUrl?: string;
  liveUrl?: string;
  demoUrl?: string;

  icon?: string;
  screenshots?: string[];
  ogImage?: string;

  features: ProjectFeature[];

  createdAt: string;
  updatedAt: string;
  order: number;
  featured: boolean;
  autoPromote?: boolean;
}

export interface ProjectFeature {
  title: string;
  titleJa?: string;
  description: string;
  descriptionJa?: string;
  icon?: string;
}

export interface BlogPostMeta {
  title: string;
  titleJa?: string;
  slug: string;
  date: string;
  tags: string[];
  description: string;
  descriptionJa?: string;
  project?: string;
  published: boolean;
  readingTime?: string;
}

export interface BlogPost extends BlogPostMeta {
  content: string;
}

export interface TwitterPost {
  text: string;
  hashtags: string[];
  type: "launch" | "update" | "blog" | "milestone" | "recap";
  createdAt: string;
  projectSlug?: string;
}

export interface AuthorMeta {
  name: string;
  nameJa?: string;
  bio: string;
  bioJa?: string;
  avatar?: string;
  links: {
    github?: string;
    twitter?: string;
    zenn?: string;
    qiita?: string;
    website?: string;
  };
  skills: string[];
}

export interface SiteNavItem {
  label: string;
  labelJa?: string;
  href: string;
}
