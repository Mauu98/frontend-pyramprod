import { cn } from '@/lib/utils'

const variants = {
  green:  'bg-green-50 text-green-700 border-green-200',
  blue:   'bg-blue-50 text-blue-700 border-blue-200',
  amber:  'bg-amber-50 text-amber-700 border-amber-200',
  red:    'bg-red-50 text-red-700 border-red-200',
  slate:  'bg-slate-50 text-slate-600 border-slate-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
}

export function Badge({ label, variant = 'slate' }: { label: string; variant?: keyof typeof variants }) {
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', variants[variant])}>
      {label}
    </span>
  )
}
