"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const current = OPTIONS.find((o) => o.value === theme) || OPTIONS[2];
  const CurrentIcon = mounted ? current.icon : Sun;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center border border-ink/15 text-ink transition-colors hover:border-catalyst hover:text-catalyst"
        aria-label="Change theme"
        aria-expanded={open}
      >
        <CurrentIcon className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 min-w-40 border border-ink/10 bg-bone shadow-xl">
          {OPTIONS.map((o) => {
            const Icon = o.icon;
            const active = mounted && theme === o.value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  setTheme(o.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 border-b border-ink/5 px-4 py-3 small-caps last:border-0 transition-colors hover:bg-ink/5",
                  active ? "text-catalyst" : "text-ink/70",
                )}
              >
                <Icon
                  className="h-4 w-4"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                {o.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
