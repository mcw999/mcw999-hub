"use client";

import { useState, useEffect } from "react";

export function TypeWriter({
  words,
  typingSpeed = 80,
  deletingSpeed = 40,
  pauseTime = 2500,
}: {
  words: string[];
  typingSpeed?: number;
  deletingSpeed?: number;
  pauseTime?: number;
}) {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = words[index];

    if (!deleting && text === current) {
      const t = setTimeout(() => setDeleting(true), pauseTime);
      return () => clearTimeout(t);
    }

    if (deleting && text === "") {
      setDeleting(false);
      setIndex((i) => (i + 1) % words.length);
      return;
    }

    const speed = deleting ? deletingSpeed : typingSpeed;
    const t = setTimeout(() => {
      setText(current.slice(0, text.length + (deleting ? -1 : 1)));
    }, speed);

    return () => clearTimeout(t);
  }, [text, deleting, index, words, typingSpeed, deletingSpeed, pauseTime]);

  return (
    <span className="inline-flex items-center">
      <span>{text}</span>
      <span className="typewriter-cursor ml-0.5">|</span>
    </span>
  );
}
