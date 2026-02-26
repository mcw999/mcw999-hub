import type { ProjectDefinition, BlogPostMeta, SNSPost } from "./types";

// --- Twitter/X ---

export function generateProjectLaunchPost(project: ProjectDefinition): SNSPost {
  const name = project.nameJa || project.name;
  const tagline = project.taglineJa || project.tagline;
  const features = project.features
    .slice(0, 3)
    .map((f) => `・${f.titleJa || f.title}`)
    .join("\n");
  const tags = project.tags.slice(0, 3).map((t) => `#${t.replace(/-/g, "")}`);
  const techTags = project.techStack.slice(0, 2).map((t) => `#${t.replace(/[\s.]/g, "")}`);
  const url = project.liveUrl || project.repositoryUrl || "";

  const text = `${name}をリリースしました！\n\n${tagline}\n\n${features}\n\n${url}`;

  return {
    text,
    hashtags: [...tags, ...techTags],
    type: "launch",
    createdAt: new Date().toISOString().split("T")[0],
    projectSlug: project.slug,
  };
}

export function generateProjectUpdatePost(
  project: ProjectDefinition,
  updateDescription: string
): SNSPost {
  const name = project.nameJa || project.name;
  const text = `【${name} アップデート】\n\n${updateDescription}`;

  return {
    text,
    hashtags: project.tags.slice(0, 3).map((t) => `#${t.replace(/-/g, "")}`),
    type: "update",
    createdAt: new Date().toISOString().split("T")[0],
    projectSlug: project.slug,
  };
}

export function generateBlogSharePost(post: BlogPostMeta, siteUrl: string, source?: string): SNSPost {
  const title = post.titleJa || post.title;
  const desc = post.descriptionJa || post.description;
  const baseUrl = `${siteUrl}/blog/${post.slug}/`;
  const url = source
    ? `${baseUrl}?utm_source=${source}&utm_medium=social&utm_campaign=blog`
    : baseUrl;

  const text = `ブログを書きました📝\n\n${title}\n\n${desc}\n\n${url}`;

  return {
    text,
    hashtags: post.tags.map((t) => `#${t.replace(/-/g, "")}`),
    type: "blog",
    createdAt: new Date().toISOString().split("T")[0],
  };
}

// --- Zenn ---

export function generateZennArticle(
  project: ProjectDefinition,
  focus: "technical" | "story" = "story"
): string {
  const name = project.nameJa || project.name;
  const desc = project.descriptionJa || project.description;
  const topics = project.techStack
    .slice(0, 5)
    .map((t) => `"${t}"`)
    .join(", ");

  if (focus === "story") {
    return `---
title: "${name}を作った話"
emoji: "🛠"
type: "tech"
topics: [${topics}]
published: false
---

## はじめに

${desc}

この記事では、${name}の開発経緯と技術的なポイントについて紹介します。

## 背景・課題

<!-- なぜこのプロジェクトを作ろうと思ったのか -->

## 技術選定

${project.techStack.map((t) => `- **${t}**`).join("\n")}

<!-- 各技術を選んだ理由 -->

## アーキテクチャ

<!-- システム構成の説明 -->

## 主な機能

${project.features.map((f) => `### ${f.titleJa || f.title}\n\n${f.descriptionJa || f.description}`).join("\n\n")}

## 苦労した点・工夫した点

<!-- 開発中のチャレンジ -->

## 今後の展望

<!-- 今後の計画 -->

## まとめ

${name}を開発してみて学んだことをまとめます。

<!-- まとめ -->
`;
  }

  return `---
title: "${project.techStack[0]}で${name}を構築する"
emoji: "💻"
type: "tech"
topics: [${topics}]
published: false
---

## はじめに

この記事では、${project.techStack[0]}を使って${name}を構築する技術的なアプローチを解説します。

## 前提

${desc}

## 実装

<!-- 技術的な実装の詳細 -->

## まとめ

<!-- まとめ -->
`;
}

// --- Qiita ---

export function generateQiitaArticle(project: ProjectDefinition): string {
  const name = project.nameJa || project.name;
  const desc = project.descriptionJa || project.description;
  const tags = project.techStack
    .slice(0, 5)
    .map((t) => `  - ${t}`)
    .join("\n");

  return `---
title: '${name}を${project.techStack[0]}で作った'
tags:
${tags}
private: false
updated_at: ''
id: null
organization_url_name: null
slide: false
ignorePublish: false
---

## はじめに

${desc}

## 使用技術

| 技術 | 用途 |
|------|------|
${project.techStack.map((t) => `| ${t} | <!-- 用途 --> |`).join("\n")}

## 機能紹介

${project.features.map((f) => `### ${f.titleJa || f.title}\n\n${f.descriptionJa || f.description}`).join("\n\n")}

## 実装のポイント

<!-- 技術的なポイント -->

## おわりに

<!-- まとめ -->
`;
}
