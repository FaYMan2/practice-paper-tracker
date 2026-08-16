/**
 * Collapsible sections, on Radix.
 *
 * Used for the review list's subject tree, where the alternative — every
 * subject expanded at once — is the wall of rows this replaced. Radix supplies
 * the parts that are tedious by hand: the trigger/panel wiring, `aria-expanded`
 * and `aria-controls` on the right elements, and arrow-key movement between
 * headers.
 *
 * The chevron is here rather than at each call site so a section always says
 * which way it opens, and always the same way.
 */

import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronRight } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "./cn";

export const Accordion = AccordionPrimitive.Root;

export function AccordionItem({ className, ...props }: ComponentProps<typeof AccordionPrimitive.Item>) {
  return <AccordionPrimitive.Item className={cn("border-b border-line last:border-b-0", className)} {...props} />;
}

export function AccordionTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        className={cn(
          "group flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[13px]",
          "font-semibold transition-colors hover:bg-raised",
          className,
        )}
        {...props}
      >
        {/* Rotates rather than swapping icon, so the direction of travel is legible. */}
        <ChevronRight className="size-3.5 shrink-0 text-faint transition-transform duration-150 group-data-[state=open]:rotate-90" />
        {children}
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

export function AccordionContent({
  className,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Content>) {
  return <AccordionPrimitive.Content className={cn("overflow-hidden pb-1", className)} {...props} />;
}
