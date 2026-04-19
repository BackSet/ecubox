import * as React from "react"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

interface SelectionCardProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean
  icon?: React.ReactNode
  title: string
  description?: string
  onClick?: () => void
}

const SelectionCard = React.forwardRef<HTMLButtonElement, SelectionCardProps>(
  ({ className, selected, icon, title, description, onClick, ...props }, ref) => {
    return (
      <button
        type="button"
        ref={ref}
        onClick={onClick}
        aria-pressed={selected}
        className={cn(
          "group relative flex w-full cursor-pointer flex-col gap-3 rounded-md border p-4 text-left transition-colors hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]/30",
          selected
            ? "border-primary bg-primary/5 ring-1 ring-primary"
            : "border-border bg-card text-card-foreground shadow-sm hover:border-primary/50",
          className
        )}
        {...props}
      >
        <div className="flex w-full items-start justify-between gap-2">
           <div className="flex items-start gap-3">
            {icon && (
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors",
                  selected
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                )}
              >
                {icon}
              </div>
            )}
            <div className="space-y-1">
                <h3 className="font-semibold leading-none tracking-tight">{title}</h3>
                 {description && (
                  <p className="text-sm text-muted-foreground leading-snug">
                    {description}
                  </p>
                )}
            </div>
          </div>
          {selected && (
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Check className="h-3 w-3" />
            </div>
          )}
        </div>
      </button>
    )
  }
)
SelectionCard.displayName = "SelectionCard"

export { SelectionCard }
