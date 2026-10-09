import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { Faq } from "@/data/services";

export default function ServiceFAQ({ faq }: Readonly<{ faq: Faq[] }>) {
  return (
    <Accordion
      type="single"
      collapsible
      className="border border-ink/10 bg-bone"
    >
      {faq.map((item: Faq) => (
        <AccordionItem
          key={item.question}
          value={`faq-item-${item.question}`}
          className="px-6 border-ink/10"
        >
          <AccordionTrigger className="font-display text-lg font-bold text-ink hover:no-underline">
            {item.question}
          </AccordionTrigger>
          <AccordionContent className="text-base text-ink/70">
            {item.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
