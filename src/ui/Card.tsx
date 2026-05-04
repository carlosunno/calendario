import type { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  noPadding?: boolean
}

export function Card({ noPadding = false, className = '', children, ...props }: CardProps) {
  return (
    <div
      {...props}
      className={`rounded-xl bg-white shadow-sm border border-gray-100 ${noPadding ? '' : 'p-4'} ${className}`}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={`flex items-center justify-between mb-3 ${className}`}>
      {children}
    </div>
  )
}

export function CardTitle({ className = '', children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 {...props} className={`text-base font-semibold text-gray-900 ${className}`}>
      {children}
    </h3>
  )
}
