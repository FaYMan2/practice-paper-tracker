/**
 * Merging class lists, last-wins.
 *
 * `clsx` handles conditionals; `tailwind-merge` resolves conflicts between
 * utilities that set the same property, so a caller passing `px-4` genuinely
 * overrides a component's own `px-2` instead of the two fighting on specificity.
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...classes: ClassValue[]): string {
  return twMerge(clsx(classes));
}
