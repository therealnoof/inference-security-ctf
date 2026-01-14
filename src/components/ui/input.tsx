// =============================================================================
// Input Component
// =============================================================================
// A styled text input component.
//
// Usage:
// <Input type="text" placeholder="Enter your name" />
// <Input type="password" />
// <Input disabled />
// =============================================================================

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

/**
 * Styled input component
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base styles
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
          // Focus styles
          "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          // Placeholder styles
          "placeholder:text-muted-foreground",
          // Disabled styles
          "disabled:cursor-not-allowed disabled:opacity-50",
          // File input styles
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          // Allow custom classes to override
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
