import Link from "next/link";
import { Code2 } from "lucide-react";

const NAV_ITEMS = [
  { label: "Projects", href: "/projects" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
];

export function Header() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto max-w-5xl flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-foreground hover:text-accent transition-colors">
          <Code2 size={24} />
          <span className="font-bold text-lg">mcw999</span>
        </Link>
        <nav className="flex items-center gap-6">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-muted hover:text-foreground transition-colors text-sm"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
