import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-lg border border-ink-200 bg-white px-3 py-1 text-sm text-ink-900 shadow-subtle transition-colors placeholder:text-ink-400 hover:border-ink-300 disabled:cursor-not-allowed disabled:bg-ink-50 disabled:opacity-60",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
