import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Neobrutalist buttons: the base `nb-btn` class (globals.css) carries the thick
// border, hard offset shadow, and press-down interaction. Variants only recolour.
const variants = cva("nb-btn text-sm", {
  variants: {
    variant: {
      default: "nb-btn-accent",
      outline: "",
      ghost: "nb-btn-ghost !border-2",
      danger: "nb-btn-danger",
    },
    size: {
      default: "h-10 px-4",
      sm: "h-8 px-3 text-xs",
      lg: "h-12 px-5",
    },
  },
  defaultVariants: { variant: "default", size: "default" },
});

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof variants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(variants({ variant, size }), className)} {...props} />;
}
