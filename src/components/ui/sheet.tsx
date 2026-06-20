import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Sheet = Dialog.Root
export const SheetTrigger = Dialog.Trigger

interface SheetContentProps {
  children: React.ReactNode
  title: string
  subtitle?: string
  onClose?: () => void
  className?: string
}

export function SheetContent({ children, title, subtitle, onClose, className }: SheetContentProps) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" />
      <Dialog.Content
        className={cn(
          'fixed right-0 top-0 z-50 flex h-full w-[460px] flex-col bg-white shadow-2xl',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
          'data-[state=open]:duration-200 data-[state=closed]:duration-150',
          className,
        )}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-[#f7f8fa] px-6 py-5">
          <div>
            <Dialog.Title className="text-base font-bold text-slate-900">{title}</Dialog.Title>
            {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
          </div>
          <Dialog.Close
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-slate-400 transition hover:border-gray-300 hover:bg-gray-50 hover:text-slate-600"
          >
            <X size={15} />
          </Dialog.Close>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 [scrollbar-gutter:stable]">
          {children}
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  )
}
