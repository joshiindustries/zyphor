import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils.js";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-zyphor-indigo-100 text-zyphor-indigo-700 dark:bg-zyphor-indigo-950 dark:text-zyphor-indigo-300",
        secondary:
          "border-transparent bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
        destructive:
          "border-transparent bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
        outline:
          "border border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300",
        success:
          "border-transparent bg-zyphor-green-100 text-zyphor-green-700 dark:bg-emerald-950 dark:text-emerald-300",
        warning:
          "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({ className, variant, dot = false, children, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            variant === "success" && "bg-zyphor-green-600 animate-pulse",
            variant === "warning" && "bg-amber-500",
            variant === "destructive" && "bg-red-500",
            (!variant || variant === "default") && "bg-zyphor-indigo-600",
            variant === "secondary" && "bg-slate-500"
          )}
        />
      )}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
