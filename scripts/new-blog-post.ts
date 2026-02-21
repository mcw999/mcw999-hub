import fs from "fs/promises";
import path from "path";

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error("Usage: npx tsx scripts/new-blog-post.ts <slug>");
    process.exit(1);
  }

  const date = new Date().toISOString().split("T")[0];
  const filePath = path.join(process.cwd(), "content", "blog", `${slug}.mdx`);

  try {
    await fs.access(filePath);
    console.error(`Blog post ${slug} already exists at ${filePath}`);
    process.exit(1);
  } catch {
    // File doesn't exist, continue
  }

  const template = `---
title: ""
titleJa: ""
slug: "${slug}"
date: "${date}"
tags: []
description: ""
descriptionJa: ""
published: false
---

## はじめに

<!-- 記事の導入 -->

## 本文

<!-- メインコンテンツ -->

## まとめ

<!-- まとめ -->
`;

  await fs.writeFile(filePath, template, "utf-8");
  console.log(`Created blog post template: ${filePath}`);
  console.log('Edit the MDX file and set "published: true" when ready.');
}

main().catch(console.error);
