"use client";

import { useState } from "react";
import { Share2, Check, Link as LinkIcon } from "lucide-react";
import { T } from "@/lib/i18n";

const BASE_URL = "https://mcw999.github.io/mcw999-hub";

export function ShareButtons({ title, slug }: { title: string; slug: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${BASE_URL}/blog/${slug}/`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted mr-1">
        <T ja="共有" en="Share" />
      </span>
      <a
        href={twitterUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 border border-border hover:bg-accent/10 hover:border-accent/30 transition-colors"
        aria-label="Share on Twitter"
      >
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current text-muted hover:text-accent">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </a>
      <button
        onClick={handleCopy}
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 border border-border hover:bg-accent/10 hover:border-accent/30 transition-colors"
        aria-label="Copy link"
      >
        {copied ? (
          <Check size={14} className="text-green-400" />
        ) : (
          <LinkIcon size={14} className="text-muted" />
        )}
      </button>
    </div>
  );
}
