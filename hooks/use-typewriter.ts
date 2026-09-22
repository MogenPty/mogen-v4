"use client";

import { useEffect, useState } from "react";

export interface TypewriterOptions {
  type?: number;
  erase?: number;
  hold?: number;
}

export function useTypewriter(
  words: string[],
  { type = 90, erase = 45, hold = 1600 }: TypewriterOptions = {},
) {
  const [text, setText] = useState("");
  const [i, setI] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = words[i % words.length];
    let t: NodeJS.Timeout;
    if (!deleting && text === current) {
      t = setTimeout(() => setDeleting(true), hold);
    } else if (deleting && text === "") {
      setDeleting(false);
      setI((v) => v + 1);
    } else {
      t = setTimeout(
        () => {
          setText((prev) =>
            deleting
              ? current.slice(0, prev.length - 1)
              : current.slice(0, prev.length + 1),
          );
        },
        deleting ? erase : type,
      );
    }
    return () => clearTimeout(t);
  }, [text, deleting, i, words, type, erase, hold]);

  return text;
}
