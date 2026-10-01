import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva('inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:pointer-events-none disabled:opacity-50', {
  variants: {
    variant: { default: 'bg-[#1268e8] text-white shadow-sm hover:bg-[#075bd2]', secondary: 'bg-[#f0f3f8] text-[#172b4d] hover:bg-[#e5eaf2]', outline: 'border border-[#dce3ed] bg-white text-[#1a2d4d] hover:bg-[#f6f8fb]', ghost: 'text-[#53637a] hover:bg-[#eff3f8]', destructive: 'border border-red-200 bg-white text-red-600 hover:bg-red-50' },
    size: { default: 'h-10 px-4 py-2', sm: 'h-9 rounded-lg px-3', icon: 'h-10 w-10' },
  }, defaultVariants: { variant: 'default', size: 'default' },
})

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { asChild?: boolean }
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button'
  return <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />
})
Button.displayName = 'Button'
