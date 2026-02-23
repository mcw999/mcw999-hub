"use client";

import { useEffect, useRef } from "react";

export function GlowCursor() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (ref.current) {
        ref.current.style.setProperty("--cx", `${e.clientX}px`);
        ref.current.style.setProperty("--cy", `${e.clientY}px`);
      }
    }
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div
      ref={ref}
      className="glow-cursor"
      style={{ "--cx": "-100px", "--cy": "-100px" } as React.CSSProperties}
    />
  );
}
