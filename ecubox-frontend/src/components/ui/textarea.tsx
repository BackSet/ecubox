import * as React from "react"

import { cn } from "@/lib/utils"

type TextareaVariant = "default" | "clean"

interface TextareaProps extends React.ComponentProps<"textarea"> {
  variant?: TextareaVariant
}

function Textarea({ className, variant = "default", ...props }: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      data-variant={variant}
      className={cn(
        "flex field-sizing-content min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/45 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/35",
        "data-[variant=clean]:bg-background/70",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
