import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

interface FormDialogProps {
  open:      boolean
  title:     string
  subtitle?: string
  onClose:   () => void
  children:  ReactNode
  width?:    string
}

export function FormDialog({ open, title, subtitle, onClose, children, width = 'w-[560px]' }: FormDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={v => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" />
        <Dialog.Content
          className={`fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] ${width} -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_64px_-8px_rgba(0,0,0,0.2),0_0_0_1px_rgba(0,0,0,0.05)] focus:outline-none`}
        >
          {/* Green accent bar */}
          <div className="h-[3px] w-full shrink-0 bg-[#2C6B2F]" />

          {/* Header */}
          <div className="flex shrink-0 items-start justify-between px-10 pt-8 pb-6">
            <div>
              <Dialog.Title className="text-[21px] font-bold text-[#101828]">
                {title}
              </Dialog.Title>
              {subtitle && (
                <p className="mt-1 text-[14px] text-[#667085]">{subtitle}</p>
              )}
            </div>
            <Dialog.Close
              onClick={onClose}
              className="ml-6 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#98A2B3] transition hover:bg-[#F2F4F7] hover:text-[#344054]"
            >
              <X size={16} strokeWidth={2} />
            </Dialog.Close>
          </div>

          {/* Divider */}
          <div className="mx-10 border-t border-[#F2F4F7]" />

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-10 py-8 [scrollbar-gutter:stable]">
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
