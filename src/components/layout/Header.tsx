"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Code2, Globe, Menu, X } from "lucide-react";
import { useState } from "react";
import { useLocale } from "@/lib/i18n";

const NAV_ITEMS = [
  { en: "Projects", ja: "プロジェクト", href: "/projects" },
  { en: "Blog", ja: "ブログ", href: "/blog" },
  { en: "About", ja: "概要", href: "/about" },
];

export function Header() {
  const { locale, setLocale } = useLocale();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="sticky top-0 z-50 glass">
      <div className="mx-auto max-w-7xl flex items-center justify-between px-6 sm:px-10 py-4">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="p-1.5 rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-colors">
            <Code2 size={18} className="text-accent" />
          </div>
          <span className="font-bold text-lg text-foreground">mcw999</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-6">
          <nav className="flex items-center gap-8">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium relative transition-colors after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:bg-accent after:transition-all ${
                  isActive(item.href)
                    ? "text-accent after:w-full"
                    : "text-muted hover:text-foreground after:w-0 hover:after:w-full"
                }`}
              >
                {locale === "ja" ? item.ja : item.en}
              </Link>
            ))}
          </nav>
          <button
            onClick={() => setLocale(locale === "ja" ? "en" : "ja")}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted hover:text-foreground bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all"
            aria-label="Switch language"
          >
            <Globe size={14} />
            {locale === "ja" ? "EN" : "JA"}
          </button>
        </div>

        {/* Mobile menu button */}
        <button
          className="sm:hidden p-2 text-muted hover:text-foreground transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-border px-6 py-4 space-y-1 glass">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`block py-2.5 text-sm font-medium transition-colors ${
                isActive(item.href) ? "text-accent" : "text-muted hover:text-foreground"
              }`}
            >
              {locale === "ja" ? item.ja : item.en}
            </Link>
          ))}
          <button
            onClick={() => { setLocale(locale === "ja" ? "en" : "ja"); setMobileOpen(false); }}
            className="flex items-center gap-1.5 py-2.5 text-xs font-medium text-muted hover:text-foreground transition-colors"
          >
            <Globe size={14} />
            {locale === "ja" ? "English" : "日本語"}
          </button>
        </div>
      )}
    </header>
  );
}
