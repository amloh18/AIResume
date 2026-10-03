import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { CHIP_BASE, BADGE_SIZES, CHIP_TONES, type ChipTone } from "./chip-styles"

/**
 * Static (non-interactive) chip.
 *
 * Same capsule geometry as `Pill`, but no hover/press affordance and no
 * selected state — it reports a fact. Semantic hues are preserved on purpose:
 * a green "Rejected" chip would read as success. Only the *recipe* is unified
 * (tinted background + matching border + readable text in both themes).
 *
 * For anything clickable use `Pill`, not this.
 */
const badgeVariants = cva(CHIP_BASE, {
  variants: {
    variant: {
      default: CHIP_TONES.neutral,
      secondary: CHIP_TONES.neutral,
      outline: CHIP_TONES.neutral,
      primary: CHIP_TONES.green,
      active: CHIP_TONES.green,
      beta: CHIP_TONES.green,
      success: CHIP_TONES.emerald,
      warning: CHIP_TONES.amber,
      danger: CHIP_TONES.rose,
      destructive: CHIP_TONES.rose,
      info: CHIP_TONES.sky,
      /** Escape hatch for one-off hues (admin themes, score tones). */
      custom: "",
    },
    size: {
      sm: BADGE_SIZES.sm,
      md: BADGE_SIZES.md,
      lg: BADGE_SIZES.lg,
    },
    interactive: {
      true: "cursor-pointer hover:brightness-110 active:brightness-95",
      false: "",
    },
    disabled: {
      true: "opacity-60 cursor-not-allowed",
      false: "",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "md",
  },
})

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  /** Applies the inert treatment. Prefer `Pill` when it is a real control. */
  disabled?: boolean
  /** Direct tone override, bypassing `variant`. */
  tone?: ChipTone
}

function Badge({
  className,
  variant,
  size,
  interactive,
  disabled,
  tone,
  leftIcon,
  rightIcon,
  children,
  ...props
}: BadgeProps) {
  return (
    <div
      aria-disabled={disabled || undefined}
      className={cn(
        badgeVariants({
          variant: tone ? "custom" : variant,
          size,
          interactive: interactive && !disabled,
          disabled,
          className,
        }),
        tone && CHIP_TONES[tone]
      )}
      {...props}
    >
      {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
    </div>
  )
}

export { Badge, badgeVariants }
