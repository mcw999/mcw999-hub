import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { getFeaturedProjects, getAllBlogPosts, getAuthorMeta } from "@/lib/content";
import { ProjectCard } from "@/components/projects/ProjectCard";

export default async function HomePage() {
  const [featured, posts, author] = await Promise.all([
    getFeaturedProjects(),
    getAllBlogPosts(),
    getAuthorMeta(),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-6">
      {/* Hero */}
      <section className="py-20 text-center">
        <h1 className="text-4xl font-bold mb-4">{author.name}</h1>
        <p className="text-muted text-lg max-w-2xl mx-auto mb-8">
          {author.bioJa || author.bio}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {author.skills.slice(0, 8).map((skill) => (
            <span
              key={skill}
              className="px-3 py-1 text-sm rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700"
            >
              {skill}
            </span>
          ))}
        </div>
      </section>

      {/* Featured Projects */}
      {featured.length > 0 && (
        <section className="pb-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">Featured Projects</h2>
            <Link
              href="/projects/"
              className="flex items-center gap-1 text-sm text-muted hover:text-accent transition-colors"
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {featured.map((project) => (
              <ProjectCard key={project.slug} project={project} />
            ))}
          </div>
        </section>
      )}

      {/* Latest Blog Posts */}
      {posts.length > 0 && (
        <section className="pb-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">Latest Posts</h2>
            <Link
              href="/blog/"
              className="flex items-center gap-1 text-sm text-muted hover:text-accent transition-colors"
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="space-y-4">
            {posts.slice(0, 3).map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}/`}
                className="block rounded-lg border border-border bg-card p-5 hover:bg-card-hover hover:border-accent/30 transition-all"
              >
                <div className="flex items-start justify-between">
                  <h3 className="font-medium text-foreground">
                    {post.titleJa || post.title}
                  </h3>
                  <span className="text-xs text-muted shrink-0 ml-4">
                    {post.date}
                  </span>
                </div>
                <p className="text-muted text-sm mt-1 line-clamp-1">
                  {post.descriptionJa || post.description}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
