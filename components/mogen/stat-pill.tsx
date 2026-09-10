"use client";

interface Props {
  label: string;
  value: string;
}

export default function StatPill({ value, label }: Readonly<Props>) {
  return (
    <div className="flex flex-col">
      <span className="font-display text-3xl font-black text-ink">{value}</span>
      <span className="small-caps text-muted-foreground">{label}</span>
    </div>
  );
}
