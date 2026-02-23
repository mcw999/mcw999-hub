import { getAllProjects, getFeaturedProjects, getAuthorMeta, getExternalArticles } from "@/lib/content";
import { HomeContent } from "@/components/pages/HomeContent";
import { PersonStructuredData } from "@/components/seo/StructuredData";

export default async function HomePage() {
  const [allProjects, featured, author, externalArticles] = await Promise.all([
    getAllProjects(),
    getFeaturedProjects(),
    getAuthorMeta(),
    getExternalArticles(),
  ]);

  return (
    <>
      <PersonStructuredData />
      <HomeContent
        allProjects={allProjects}
        featured={featured}
        author={author}
        externalArticles={externalArticles}
      />
    </>
  );
}
