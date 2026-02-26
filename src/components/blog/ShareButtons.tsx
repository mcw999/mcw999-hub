"use client";

import { useState } from "react";
import { Check, Link as LinkIcon } from "lucide-react";
import { T } from "@/lib/i18n";

const BASE_URL = "https://mcw999.github.io/mcw999-hub";

interface SharePlatform {
  key: string;
  label: string;
  icon: React.ReactNode;
  getUrl: (title: string, shareUrl: string) => string;
}

const SHARE_PLATFORMS: SharePlatform[] = [
  {
    key: "bluesky",
    label: "Bluesky",
    icon: <span className="text-xs">🦋</span>,
    getUrl: (title, shareUrl) =>
      `https://bsky.app/intent/compose?text=${encodeURIComponent(`${title}\n${shareUrl}`)}`,
  },
  {
    key: "mastodon",
    label: "Mastodon",
    icon: <span className="text-xs">🐘</span>,
    getUrl: (title, shareUrl) =>
      `https://donshare.net/share?text=${encodeURIComponent(`${title}\n${shareUrl}`)}`,
  },
  {
    key: "hatena",
    label: "Hatena",
    icon: <span className="text-xs font-bold">B!</span>,
    getUrl: (_title, shareUrl) =>
      `https://b.hatena.ne.jp/add?mode=confirm&url=${encodeURIComponent(shareUrl)}`,
  },
  {
    key: "x",
    label: "X",
    icon: (
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    getUrl: (title, shareUrl) =>
      `https://x.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}`,
  },
];

export function ShareButtons({ title, slug }: { title: string; slug: string }) {
  const [copied, setCopied] = useState(false);
  const baseUrl = `${BASE_URL}/blog/${slug}/`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(baseUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted mr-1">
        <T ja="共有" en="Share" />
      </span>
      {SHARE_PLATFORMS.map((platform) => {
        const shareUrl = `${baseUrl}?utm_source=share_${platform.key}`;
        return (
          <a
            key={platform.key}
            href={platform.getUrl(title, shareUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 border border-border hover:bg-accent/10 hover:border-accent/30 transition-colors text-muted hover:text-accent"
            aria-label={`Share on ${platform.label}`}
          >
            {platform.icon}
          </a>
        );
      })}
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
