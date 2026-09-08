import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function ServiceFAQ({ faq }) {
  return (
    <Accordion
      type="single"
      collapsible
      className="border border-ink/10 bg-bone"
    >
      {faq.map((item, i) => (
        <AccordionItem
          key={i}
          value={`item-${i}`}
          className="px-6 border-ink/10"
        >
          <AccordionTrigger className="font-display text-lg font-bold text-ink hover:no-underline">
            {item.q}
          </AccordionTrigger>
          <AccordionContent className="text-base text-ink/70">
            {item.a}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
