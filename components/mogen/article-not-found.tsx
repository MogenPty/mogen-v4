"use client";

import { ArrowLeft } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import BlueprintGrid from "./blueprint-grid";
import MagneticButton from "./magnet-button";
import PageShell from "./page-shell";

interface Props {
  numbering?: number;
}

export default function ArticleNotFound({ numbering = 1 }: Readonly<Props>) {
  return (
    <PageShell
      index={`// ${formatNumber(numbering)} — Insights`}
      label="Blog"
      title={
        <>
          Article <span className="text-catalyst">not found.</span>
        </>
      }
    >
      <BlueprintGrid className="bg-bone pb-24">
        <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
          <p className="text-ink/70">We couldn&apos;t find that article.</p>
          <MagneticButton
            as="a"
            href="/blog"
            variant="outline"
            className="mt-6"
          >
            <ArrowLeft className="h-4 w-4" /> Back to blog
          </MagneticButton>
        </div>
      </BlueprintGrid>
    </PageShell>
  );
}
