import { ArrowUpRight } from "lucide-react";
import MagneticButton from "./magnet-button";

interface Props {
  title: string;
  desc: string;
  url: string;
  label?: string;
}

export default function ContactExternalLink({
  title,
  label,
  url,
  desc,
}: Readonly<Props>) {
  const viewLabel = label ?? `Visit ${title}`;
  return (
    <div>
      <h3 className="small-caps text-ink/50">{title}</h3>
      <p className="mt-2 text-sm text-ink/70">{desc}</p>
      <MagneticButton
        as="a"
        href={url}
        variant="outline"
        className="mt-4"
        aria-label={viewLabel}
        target="_blank"
      >
        {viewLabel} <ArrowUpRight className="h-4 w-4" />
      </MagneticButton>
    </div>
  );
}
