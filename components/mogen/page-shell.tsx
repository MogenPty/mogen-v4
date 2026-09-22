import type { ReactNode } from "react";
import BlueprintGrid, { SectionLabel } from "./blueprint-grid";
import ConversionBar from "./conversation-bar";
import Footer from "./footer";
import Nav from "./nav";

interface Props {
  index: string | number;
  label: string;
  title: ReactNode;
  intro?: string;
  children: ReactNode;
}

export default function PageShell({
  index,
  label,
  title,
  intro,
  children,
}: Readonly<Props>) {
  return (
    <div className="bg-bone">
      <Nav />
      <main>
        <BlueprintGrid className="bg-bone pt-32 pb-16 lg:pt-40 lg:pb-20">
          <div className="mx-auto max-w-[1600px] px-6 lg:px-10">
            <SectionLabel index={index} title={label} />
            <div className="mb-14 max-w-3xl">
              <h1 className="font-display text-5xl font-black leading-[1.02] text-ink lg:text-7xl text-balance">
                {title}
              </h1>
              {intro && <p className="mt-6 text-lg text-ink/70">{intro}</p>}
            </div>
          </div>
        </BlueprintGrid>
        {children}
      </main>
      <Footer />
      <ConversionBar />
    </div>
  );
}
