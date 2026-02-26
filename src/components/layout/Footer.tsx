"use client";

import Link from "next/link";
import { Github, ArrowUpRight, Code2 } from "lucide-react";
import { useLocale, T } from "@/lib/i18n";

const NAV_LINKS = [
  { en: "Projects", ja: "プロジェクト", href: "/projects" },
  { en: "Blog", ja: "ブログ", href: "/blog" },
  { en: "About", ja: "概要", href: "/about" },
];

const EXTERNAL_LINKS = [
  { label: "GitHub", href: "https://github.com/mcw999", icon: "github" },
  { label: "Qiita", href: "https://qiita.com/mcw999", icon: "qiita" },
  { label: "Dev.to", href: "https://dev.to/mcw999", icon: "devto" },
  { label: "Zenn", href: "https://zenn.dev/mcw999", icon: "zenn" },
  { label: "Hashnode", href: "https://hashnode.com/@mcw999", icon: "hashnode" },
  { label: "Bluesky", href: "https://bsky.app/profile/mcw999.bsky.social", icon: "bluesky" },
  { label: "Mastodon", href: "https://mastodon.social/@mcw999", icon: "mastodon" },
];

export function Footer() {
  const { locale } = useLocale();

  return (
    <footer className="border-t border-border mt-auto">
      <div className="mx-auto max-w-7xl px-6 sm:px-10 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 mb-10">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2.5 mb-4 group">
              <div className="p-1.5 rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-colors">
                <Code2 size={16} className="text-accent" />
              </div>
              <span className="font-bold text-foreground">mcw999</span>
            </Link>
            <p className="text-sm text-muted leading-relaxed">
              <T
                ja="暗号資産トレーディングツールや開発者向けプロダクトを個人開発しています。"
                en="Solo developer building crypto trading tools and developer products."
              />
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-muted mb-4">
              <T ja="ナビゲーション" en="Navigation" />
            </h4>
            <nav className="flex flex-col gap-2.5">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted hover:text-foreground transition-colors w-fit"
                >
                  {locale === "ja" ? link.ja : link.en}
                </Link>
              ))}
            </nav>
          </div>

          {/* External links */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-muted mb-4">
              <T ja="リンク" en="Links" />
            </h4>
            <nav className="flex flex-col gap-2.5">
              {EXTERNAL_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors w-fit"
                >
                  {link.icon === "github" && <Github size={14} />}
                  {link.label}
                  <ArrowUpRight size={11} className="opacity-50" />
                </a>
              ))}
            </nav>
          </div>
        </div>

        <div className="pt-6 border-t border-border flex items-center justify-between">
          <span className="text-xs text-muted/50">
            &copy; {new Date().getFullYear()} mcw999
          </span>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="text-xs text-muted hover:text-foreground transition-colors"
          >
            <T ja="トップへ" en="Back to top" /> &uarr;
          </button>
        </div>
      </div>
    </footer>
  );
}
