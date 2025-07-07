import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chartreuse focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-chartreuse to-chartreuse-dark text-rich-black hover:from-chartreuse-dark hover:to-chartreuse shadow-md hover:shadow-lg hover:shadow-chartreuse/25 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] btn-bounce",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md hover:shadow-lg hover:shadow-red-500/20 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
        outline:
          "border border-chartreuse/50 bg-background hover:bg-chartreuse/10 hover:text-chartreuse hover:border-chartreuse text-chartreuse shadow-sm hover:shadow-md hover:shadow-chartreuse/15 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] btn-secondary",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
        ghost: "hover:bg-chartreuse/10 hover:text-chartreuse transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]",
        link: "text-chartreuse underline-offset-4 hover:underline hover:text-chartreuse-dark transition-colors duration-200",
        success: "bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:from-emerald-700 hover:to-emerald-800 shadow-md hover:shadow-lg hover:shadow-emerald-500/25 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
        warning: "bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 shadow-md hover:shadow-lg hover:shadow-amber-500/25 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
        premium: "bg-gradient-to-r from-chartreuse to-chartreuse-light text-rich-black hover:from-chartreuse-dark hover:to-chartreuse shadow-lg hover:shadow-xl hover:shadow-chartreuse/35 hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] font-semibold border border-chartreuse-dark btn-primary",
        attention: "bg-gradient-to-r from-chartreuse to-chartreuse-light text-rich-black hover:from-chartreuse-dark hover:to-chartreuse shadow-lg hover:shadow-xl hover:shadow-chartreuse/40 hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] font-semibold animate-pulse attention-pulse",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3 text-xs",
        lg: "h-11 rounded-md px-8 text-base",
        xl: "h-14 rounded-xl px-10 text-lg font-semibold",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
