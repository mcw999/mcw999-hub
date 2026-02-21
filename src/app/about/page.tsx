import type { Metadata } from "next";
import { getAuthorMeta } from "@/lib/content";
import { TechBadge } from "@/components/ui/Badge";

export const metadata: Metadata = {
  title: "About",
  description: "About mcw999 - Solo developer profile.",
};

export default async function AboutPage() {
  const author = await getAuthorMeta();

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold mb-6">About</h1>

      <section className="mb-10">
        <p className="text-lg text-foreground/80 leading-relaxed">
          {author.bioJa || author.bio}
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Skills</h2>
        <div className="flex flex-wrap gap-2">
          {author.skills.map((skill) => (
            <TechBadge key={skill} name={skill} />
          ))}
        </div>
      </section>

      {Object.entries(author.links).some(([, v]) => v) && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Links</h2>
          <div className="space-y-2">
            {Object.entries(author.links).map(
              ([key, url]) =>
                url && (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-accent hover:underline"
                  >
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </a>
                )
            )}
          </div>
        </section>
      )}
    </div>
  );
}
