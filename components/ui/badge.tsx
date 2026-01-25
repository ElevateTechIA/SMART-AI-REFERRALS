import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-theme-primary text-white hover:bg-theme-primaryLight',
        secondary:
          'border-transparent bg-theme-secondary text-white hover:bg-theme-secondaryLight',
        destructive:
          'border-transparent bg-theme-error text-white hover:opacity-80',
        outline: 'text-theme-textPrimary border-theme-cardBorder',
        success:
          'border-transparent bg-theme-success text-white hover:opacity-80',
        warning:
          'border-transparent bg-theme-warning text-white hover:opacity-80',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
