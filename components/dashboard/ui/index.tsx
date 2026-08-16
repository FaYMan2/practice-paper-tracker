/**
 * The primitives everything else is built from.
 *
 * shadcn/ui's approach rather than its package: these are ours, in our
 * repository, styled with our tokens — which is the whole point of a library
 * that ships source instead of a dependency. Radix supplies the behaviour that
 * is genuinely hard to get right (roving focus in a tab list, a dialog that
 * traps focus and restores it), and the look is entirely local.
 */

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "./cn";

export * from "./cn";

/* ------------------------------------------------------------------ Button */

const button = cva(
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-colors disabled:opacity-50 disabled:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        solid: "bg-accent text-white hover:bg-accent-strong",
        outline: "border border-line bg-raised text-ink hover:border-accent hover:text-accent",
        accent: "border border-accent text-accent hover:bg-accent hover:text-white",
        ghost: "text-muted hover:bg-raised hover:text-ink",
      },
      size: {
        sm: "h-7 px-3 text-xs [&_svg]:size-3.5",
        md: "h-9 px-4 text-[13px] [&_svg]:size-4",
      },
    },
    defaultVariants: { variant: "outline", size: "md" },
  },
);

export interface ButtonProps
  extends ComponentProps<"button">,
    VariantProps<typeof button> {
  /** Render as the child element — for a link that should look like a button. */
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild, ...props }: ButtonProps) {
  const Component = asChild ? Slot : "button";
  return <Component className={cn(button({ variant, size }), className)} {...props} />;
}

/* -------------------------------------------------------------------- Card */

export function Card({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "rounded-card border border-line bg-surface shadow-[0_1px_2px_rgba(28,25,23,0.04)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentProps<"header">) {
  return <header className={cn("flex flex-wrap items-start justify-between gap-4 p-5 pb-0", className)} {...props} />;
}

export function CardTitle({ className, ...props }: ComponentProps<"h2">) {
  return <h2 className={cn("m-0 text-base font-semibold tracking-tight", className)} {...props} />;
}

export function CardNote({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("m-0 mt-1 max-w-[74ch] text-xs text-muted", className)} {...props} />;
}

export function CardBody({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("p-5", className)} {...props} />;
}

/* ------------------------------------------------------------------- Badge */

const badge = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold num",
  {
    variants: {
      tone: {
        accent: "bg-accent text-white",
        neutral: "bg-line text-muted",
        correct: "bg-correct-soft text-correct",
        wrong: "bg-wrong-soft text-wrong",
        warn: "bg-warn-soft text-warn",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BadgeProps extends ComponentProps<"span">, VariantProps<typeof badge> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badge({ tone }), className)} {...props} />;
}

/* ------------------------------------------------------------------ Labels */

/** The small uppercase caption under a figure or above a column. */
export function Caption({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      className={cn("text-[10px] font-semibold uppercase tracking-[0.08em] text-muted", className)}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------- Table */

export function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <div className="w-full overflow-x-auto">
      {/*
        `table-fixed` with explicit column widths. The previous hand-rolled grid
        let the widest cell decide a column, which is exactly how a heading ends
        up somewhere other than above its own values.
      */}
      <table className={cn("w-full table-fixed border-collapse text-left", className)} {...props} />
    </div>
  );
}

export function Th({ className, ...props }: ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "border-b border-line-strong px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted",
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: ComponentProps<"td">) {
  return <td className={cn("border-t border-line px-3 py-2.5 align-middle", className)} {...props} />;
}

/* -------------------------------------------------------------- Empty state */

export interface EmptyProps {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}

export function Empty({ icon, title, body, action }: EmptyProps) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <div className="mb-1 grid size-11 place-items-center rounded-full bg-accent-soft text-accent [&_svg]:size-5">
        {icon}
      </div>
      <h3 className="m-0 text-[15px] font-semibold">{title}</h3>
      <p className="m-0 max-w-[54ch] text-sm text-muted">{body}</p>
      {action}
    </div>
  );
}

export * from "./tabs";
export * from "./toggle-group";
