import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const variants = cva("inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:pointer-events-none disabled:opacity-50", { variants: { variant: { default: "bg-brand-500 text-white hover:bg-brand-600", outline: "border bg-white hover:bg-slate-50", ghost: "hover:bg-slate-100", danger: "bg-red-600 text-white hover:bg-red-700" }, size: { default: "h-10 px-4", sm: "h-8 px-3 text-xs", lg: "h-12 px-5" } }, defaultVariants: { variant: "default", size: "default" } });
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof variants> { asChild?: boolean; }
export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) { const Comp = asChild ? Slot : "button"; return <Comp className={cn(variants({ variant, size }), className)} {...props} />; }
