"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type MogenSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

const tones = {
  mogen: "scheme-dark border-ink/25 bg-ink/5 text-ink focus:border-catalyst/70",
  admin: "scheme-light dark:scheme-dark border-input bg-background text-foreground focus:border-catalyst",
  inverse: "scheme-light border-bone/30 bg-bone/10 text-bone focus:border-catalyst",
} as const;

const optionTones = {
  mogen: "bg-bone text-ink",
  admin: "bg-background text-foreground",
  inverse: "bg-ink text-bone",
} as const;

export default function MogenSelect({
  id,
  name,
  value,
  options,
  onChange,
  placeholder,
  tone = "mogen",
  disabled = false,
  required = false,
  className,
  "aria-label": ariaLabel,
}: Readonly<{
  id: string;
  name?: string;
  value: string;
  options: MogenSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  tone?: keyof typeof tones;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  "aria-label"?: string;
}>) {
  return (
    <div className={cn("relative", className)}>
      <select
        id={id}
        name={name}
        value={value}
        disabled={disabled}
        required={required}
        aria-label={ariaLabel}
        onChange={event => onChange(event.target.value)}
        className={cn(
          "w-full appearance-none rounded-md border px-4 py-3 pr-11 text-sm font-semibold outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-50 dark:scheme-dark",
          tones[tone],
        )}
      >
        {placeholder !== undefined && <option value="" className={optionTones[tone]}>{placeholder}</option>}
        {options.map(option => (
          <option key={option.value} value={option.value} disabled={option.disabled} className={optionTones[tone]}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-current opacity-60" />
    </div>
  );
}
