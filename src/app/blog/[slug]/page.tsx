import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllBlogPosts, getBlogPost } from "@/lib/content";
import { compileMdxContent } from "@/lib/mdx";
import { BlogPostContent } from "@/components/pages/BlogPostContent";
import { ArticleStructuredData } from "@/components/seo/StructuredData";

export async function generateStaticParams() {
  const posts = await getAllBlogPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) return { title: "Not Found" };
  return {
    title: post.titleJa || post.title,
    description: post.descriptionJa || post.description,
    alternates: {
      canonical: `/blog/${slug}`,
    },
    openGraph: {
      title: post.titleJa || post.title,
      description: post.descriptionJa || post.description,
      type: "article",
      publishedTime: post.date,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) notFound();

  const content = await compileMdxContent(post.content);

  const allPosts = await getAllBlogPosts();
  const currentIndex = allPosts.findIndex((p) => p.slug === slug);
  const prevPost = currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null;
  const nextPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null;

  return (
    <>
      <ArticleStructuredData
        title={post.titleJa || post.title}
        description={post.descriptionJa || post.description}
        date={post.date}
        slug={slug}
      />
      <BlogPostContent
        post={post}
        content={content}
        prevPost={prevPost}
        nextPost={nextPost}
      />
    </>
  );
}
