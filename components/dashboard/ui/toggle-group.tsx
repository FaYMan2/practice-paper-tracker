/**
 * A row of mutually exclusive choices, on Radix.
 *
 * Three places want exactly this — which subjects to show, how to arrange the
 * review list, which end of it comes first — and they should not look like
 * three different controls when they do the same kind of thing.
 *
 * Generic over the value so each caller keeps its own enum and gets a compile
 * error rather than a silent no-op if an option names something the handler
 * cannot take.
 */

import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import type { ReactNode } from "react";
import { cn } from "./cn";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

export interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Names the group for anyone not looking at it. */
  label: string;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: SegmentedProps<T>) {
  return (
    <ToggleGroupPrimitive.Root
      type="single"
      value={value}
      aria-label={label}
      // Radix clears the value when the pressed item is pressed again. These
      // are modes, not toggles: there is no "neither", so an empty change is
      // dropped rather than allowed to blank the view.
      onValueChange={(next) => {
        if (next) onChange(next as T);
      }}
      className={cn("inline-flex rounded-full border border-line bg-raised p-0.5")}
    >
      {options.map((option) => (
        <ToggleGroupPrimitive.Item
          key={option.value}
          value={option.value}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
            "whitespace-nowrap text-muted transition-colors hover:text-ink",
            "data-[state=on]:bg-surface data-[state=on]:text-ink",
            "data-[state=on]:shadow-[0_1px_2px_rgba(28,25,23,0.08)]",
            "[&_svg]:size-3.5 [&_svg]:shrink-0",
          )}
        >
          {option.icon}
          {option.label}
        </ToggleGroupPrimitive.Item>
      ))}
    </ToggleGroupPrimitive.Root>
  );
}
