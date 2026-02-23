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

  // PR用: ユーザー獲得に必要な情報
  userProblem?: string;        // ターゲットユーザーが抱える課題
  userProblemJa?: string;
  solution?: string;           // このアプリがどう解決するか
  solutionJa?: string;
  callToAction?: string;       // ユーザーに取ってほしいアクション（例: "無料で試す"）
  callToActionUrl?: string;    // CTAのリンク先
  promotionKeywords?: string[]; // SNS投稿に使うキーワード（技術用語ではなく業界用語）

  schedule?: {
    frequency: "weekly" | "biweekly" | "monthly";
    platforms: ("twitter" | "zenn" | "qiita" | "blog" | "devto" | "reddit")[];
  };

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
    devto?: string;
    website?: string;
  };
  skills: string[];
}

export interface ExternalArticle {
  platform: "devto" | "qiita" | "zenn" | "reddit" | "twitter";
  url: string;
  date: string;
  slug: string;
}

export interface SiteNavItem {
  label: string;
  labelJa?: string;
  href: string;
}
