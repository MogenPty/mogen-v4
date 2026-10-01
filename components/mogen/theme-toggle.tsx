"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  getStoredAccent,
  setStoredAccent,
  type Accent,
} from "@/lib/accent";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

const ACCENT_OPTIONS: { value: Accent; label: string; swatch: string }[] = [
  { value: "green", label: "Green", swatch: "bg-catalyst" },
  { value: "orange", label: "Orange", swatch: "" },
];

function OrangeSwatch() {
  return (
    <span
      className="h-4 w-4 shrink-0 rounded-full"
      style={{ backgroundColor: "hsl(22 100% 50%)" }}
      aria-hidden="true"
    />
  );
}

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // Avoids the `setState` in `useEffect` hydration anti-pattern.
  // `useSyncExternalStore` returns `false` on the server and `true` after hydration,
  // so the first client render matches the server without a cascading render.
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [open, setOpen] = useState(false);
  // Lazy init reads localStorage (client) or the default (server) with no
  // post-hydration cascading render.
  const [accent, setAccent] = useState<Accent>(() => getStoredAccent());
  const ref = useRef<HTMLDivElement>(null);

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

  const chooseAccent = (value: Accent) => {
    setAccent(value);
    setStoredAccent(value);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center border border-ink/15 text-ink transition-colors hover:border-catalyst hover:text-catalyst"
        aria-label="Change appearance"
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
          <div
            className="border-t border-ink/10 px-4 pb-1 pt-3"
            role="group"
            aria-label="Accent"
          >
            <span className="small-caps text-ink/50">Accent</span>
            <div className="flex flex-col pb-2">
              {ACCENT_OPTIONS.map((o) => {
                const active = accent === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => chooseAccent(o.value)}
                    aria-pressed={active}
                    className={cn(
                      "flex w-full items-center gap-3 px-0 py-2 small-caps transition-colors hover:bg-ink/5",
                      active ? "text-catalyst" : "text-ink/70",
                    )}
                  >
                    {o.value === "orange" ? (
                      <OrangeSwatch />
                    ) : (
                      <span
                        className={cn(
                          "h-4 w-4 shrink-0 rounded-full",
                          o.swatch,
                        )}
                        aria-hidden="true"
                      />
                    )}
                    {o.label}
                    {active && (
                      <Check
                        className="ml-auto h-4 w-4"
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
