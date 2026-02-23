import type { Metadata } from "next";
import { getAllBlogPosts } from "@/lib/content";
import { BlogContent } from "@/components/pages/BlogContent";

export const metadata: Metadata = {
  title: "Blog",
  description: "Articles about development, technology, and projects.",
  alternates: { canonical: "/blog" },
};

export default async function BlogPage() {
  const posts = await getAllBlogPosts();
  return <BlogContent posts={posts} />;
}
