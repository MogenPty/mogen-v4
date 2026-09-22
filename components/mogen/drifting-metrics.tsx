"use client";

import { useEffect, useState } from "react";

export default function DriftingMetrics() {
  const items = [
    {
      t: "Web Development",
      top: "18%",
      left: "4%",
      size: "text-2xl",
      speed: 0.04,
    },
    {
      t: "Business Documentation",
      top: "62%",
      left: "8%",
      size: "text-xl",
      speed: 0.06,
    },
    {
      t: "Digital Marketing",
      top: "30%",
      right: "5%",
      size: "text-2xl",
      speed: 0.05,
    },
    {
      t: "SEO",
      top: "72%",
      right: "9%",
      size: "text-xl",
      speed: 0.03,
    },
  ];
  const [y, setY] = useState(0);
  useEffect(() => {
    const onScroll = () => setY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      {items.map((it) => (
        <span
          key={it.t.slice(0, 15)}
          className={`absolute font-display font-black text-ink/4 ${it.size}`}
          style={{
            top: it.top,
            left: it.left,
            right: it.right,
            transform: `translateY(${y * it.speed}px)`,
          }}
        >
          {it.t}
        </span>
      ))}
    </div>
  );
}
