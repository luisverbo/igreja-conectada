import * as React from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info'
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        {
          'border-transparent bg-violet-600 text-white': variant === 'default',
          'border-transparent bg-slate-100 text-slate-700': variant === 'secondary',
          'border-transparent bg-red-100 text-red-700': variant === 'destructive',
          'border-slate-200 text-slate-700': variant === 'outline',
          'border-transparent bg-green-100 text-green-700': variant === 'success',
          'border-transparent bg-amber-100 text-amber-700': variant === 'warning',
          'border-transparent bg-blue-100 text-blue-700': variant === 'info',
        },
        className
      )}
      {...props}
    />
  )
}

export { Badge }
