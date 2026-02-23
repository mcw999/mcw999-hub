import type { Metadata } from "next";
import { getAuthorMeta, getFeaturedProjects } from "@/lib/content";
import { AboutContent } from "@/components/pages/AboutContent";

export const metadata: Metadata = {
  title: "About",
  description: "About mcw999 - Solo developer profile.",
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const [author, featured] = await Promise.all([
    getAuthorMeta(),
    getFeaturedProjects(),
  ]);

  return <AboutContent author={author} projects={featured} />;
}
