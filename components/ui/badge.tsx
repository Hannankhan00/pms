import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium transition-colors select-none",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#0F766E] text-white",
        primary:
          "border-transparent bg-[#0F766E] text-white",
        secondary:
          "border-[#E2E8F0] bg-[#F1F5F9] text-[#475569]",
        outline:
          "border-[#E2E8F0] bg-white text-[#0F172A]",
        success:
          "border-transparent bg-[#DCFCE7] text-[#16A34A]",
        warning:
          "border-transparent bg-[#FEF3C7] text-[#D97706]",
        danger:
          "border-transparent bg-[#FEE2E2] text-[#DC2626]",
        destructive:
          "border-transparent bg-[#FEE2E2] text-[#DC2626]",
        info:
          "border-transparent bg-[#DBEAFE] text-[#2563EB]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
