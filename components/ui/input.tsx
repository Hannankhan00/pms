import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-[8px] border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#0F172A] shadow-none transition-colors",
          "placeholder:text-[#94A3B8]",
          "focus-visible:outline-none focus-visible:border-[#0F766E] focus-visible:ring-[3px] focus-visible:ring-[#0F766E]/15",
          "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60",
          error && "border-[#DC2626] focus-visible:border-[#DC2626] focus-visible:ring-[#DC2626]/15",
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
