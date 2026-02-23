"use client";

import { useRef, useState, type ReactNode, type MouseEvent } from "react";

export function SpotlightCard({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "a";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [hovering, setHovering] = useState(false);

  function onMove(e: MouseEvent) {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={`spotlight-card ${className}`}
      style={
        {
          "--spot-x": `${pos.x}px`,
          "--spot-y": `${pos.y}px`,
          "--spot-opacity": hovering ? "1" : "0",
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
