/**
 * Tabs, on Radix.
 *
 * Worth the dependency for what is invisible: arrow-key navigation across the
 * list, a single tab stop rather than one per tab, and `aria-controls` wired to
 * the panel it opens. Written by hand these are the details that get skipped.
 */

import * as TabsPrimitive from "@radix-ui/react-tabs";
import type { ComponentProps } from "react";
import { cn } from "./cn";

export const Tabs = TabsPrimitive.Root;

export function TabList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn("flex gap-1 border-b border-line", className)}
      {...props}
    />
  );
}

export function Tab({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        // -mb-px so the active underline paints over the list's own border
        // rather than sitting above it.
        "-mb-px inline-flex items-center gap-2 border-b-2 border-transparent px-4 py-2.5",
        "text-[13px] font-semibold text-muted transition-colors",
        "hover:text-ink data-[state=active]:border-accent data-[state=active]:text-ink",
        "[&_svg]:size-4 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    />
  );
}

export function TabPanel({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn("mt-5 outline-none", className)} {...props} />;
}
