import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn('rounded-2xl border border-[#e5eaf1] bg-white shadow-[0_3px_12px_rgba(19,44,82,.035)]', className)} {...props} /> }
