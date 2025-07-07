import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-chartreuse-dark dark:bg-chartreuse text-deep-black dark:text-rich-black hover:bg-chartreuse-dark/90 dark:hover:bg-chartreuse/90 shadow-md hover:shadow-lg hover:shadow-chartreuse/20 hover:-translate-y-0.5",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md hover:shadow-lg hover:-translate-y-0.5",
        outline:
          "border border-chartreuse/50 bg-background hover:bg-chartreuse/10 hover:text-chartreuse hover:border-chartreuse text-chartreuse shadow-sm hover:shadow-md hover:-translate-y-0.5",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm hover:shadow-md hover:-translate-y-0.5",
        ghost: "hover:bg-chartreuse/10 hover:text-chartreuse transition-all duration-200",
        link: "text-chartreuse underline-offset-4 hover:underline hover:text-chartreuse-dark",
        success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md hover:shadow-lg hover:shadow-emerald/20 hover:-translate-y-0.5",
        warning: "bg-amber-500 text-white hover:bg-amber-600 shadow-md hover:shadow-lg hover:shadow-amber/20 hover:-translate-y-0.5",
        premium: "bg-chartreuse text-deep-black hover:bg-chartreuse-dark shadow-lg hover:shadow-xl hover:shadow-chartreuse/30 hover:-translate-y-1 font-semibold border border-chartreuse-dark",
        attention: "bg-chartreuse text-deep-black hover:bg-chartreuse-dark shadow-lg hover:shadow-xl hover:shadow-chartreuse/40 hover:-translate-y-1 font-semibold animate-pulse",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        xl: "h-14 rounded-xl px-10 text-lg",
        icon: "h-10 w-10",
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
