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

  // 一次素材: 実体験・実測データ・観察メモ（AI生成の質を上げる核）
  sourceNotes?: {
    experiences?: string[];     // 体験ログ（例: "バックテストで勝率58%→63%に改善した"）
    observations?: string[];    // 観察メモ（例: "BTC過熱度が90超えた翌日の下落確率は72%"）
    metrics?: string[];         // 実測データ（例: "API応答時間: 平均120ms, P99: 450ms"）
    failures?: string[];        // 失敗談（例: "RSI単体では誤検出が多く、複合指標に切り替えた"）
  };

  schedule?: {
    frequency: "weekly" | "biweekly" | "monthly";
    platforms: ("twitter" | "zenn" | "qiita" | "blog" | "devto" | "reddit" | "bluesky" | "mastodon" | "hashnode" | "github_releases")[];
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

export interface SNSPost {
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
    bluesky?: string;
    mastodon?: string;
    hashnode?: string;
  };
  skills: string[];
}

export interface ExternalArticle {
  platform: "devto" | "qiita" | "zenn" | "reddit" | "twitter" | "bluesky" | "mastodon" | "hashnode";
  url: string;
  date: string;
  slug: string;
}

export interface SiteNavItem {
  label: string;
  labelJa?: string;
  href: string;
}
