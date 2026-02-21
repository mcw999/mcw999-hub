import { Github } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border mt-auto">
      <div className="mx-auto max-w-5xl px-6 py-8 flex items-center justify-between text-sm text-muted">
        <p>&copy; {new Date().getFullYear()} mcw999</p>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/mcw999"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            <Github size={18} />
          </a>
        </div>
      </div>
    </footer>
  );
}
