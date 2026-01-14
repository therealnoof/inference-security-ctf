// =============================================================================
// Button Component
// =============================================================================
// A versatile button component with multiple variants and sizes.
// Based on shadcn/ui design system.
//
// Usage:
// <Button variant="default">Click me</Button>
// <Button variant="destructive" size="sm">Delete</Button>
// <Button variant="outline" disabled>Disabled</Button>
// =============================================================================

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Define button variants using class-variance-authority (cva)
// This creates a function that returns the right CSS classes based on props
const buttonVariants = cva(
  // Base classes applied to all buttons
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      // Visual style variants
      variant: {
        // Primary action button (filled)
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        
        // Dangerous/delete actions (red)
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        
        // Bordered button (no fill)
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        
        // Subtle button (minimal styling)
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        
        // Ghost button (transparent until hover)
        ghost: "hover:bg-accent hover:text-accent-foreground",
        
        // Link-style button (looks like text link)
        link: "text-primary underline-offset-4 hover:underline",
        
        // Success variant (green)
        success: "bg-ctf-easy text-white hover:bg-ctf-easy/90",
      },
      
      // Size variants
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",  // Square button for icons
      },
    },
    
    // Default values if not specified
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

// Props interface extends HTML button props + our custom variants
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  // asChild allows the button to render as a different element (e.g., Link)
  asChild?: boolean;
}

/**
 * Button component with multiple variants and sizes
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    // If asChild is true, render as whatever child is passed (useful for Links)
    const Comp = asChild ? Slot : "button";
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
