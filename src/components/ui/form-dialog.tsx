import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

interface FormDialogProps {
  open:      boolean
  title:     string
  subtitle?: string
  onClose:   () => void
  children:  ReactNode
  width?:    string
}

export function FormDialog({ open, title, subtitle, onClose, children, width = 'w-[560px]' }: FormDialogProps) {
  // Long forms (e.g. "Nueva Clase") can scroll past the fold with no visual cue that there's more
  // below — surfaced as "the button stays half hidden". A bottom fade while scrollable content
  // remains makes the cutoff read as "scroll for more", not "the button is missing".
  const bodyRef = useRef<HTMLDivElement>(null)
  const [hasMoreBelow, setHasMoreBelow] = useState(false)

  useEffect(() => {
    const el = bodyRef.current
    if (!open || !el) { setHasMoreBelow(false); return }
    const check = () => setHasMoreBelow(el.scrollHeight - el.scrollTop - el.clientHeight > 4)
    check()
    el.addEventListener('scroll', check)
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => { el.removeEventListener('scroll', check); ro.disconnect() }
  }, [open, children])

  return (
    <Dialog.Root open={open} onOpenChange={v => !v && onClose()}>
      <Dialog.Portal>
        {/* Overlay and Content share z-50: with nested FormDialogs (e.g. the weight wizard opened
            from inside "Nueva Clase"), Radix appends each dialog's Portal after the previous one's,
            so equal z-index falls back to DOM order — the later (inner) dialog's overlay then
            correctly paints above the earlier (outer) dialog's content instead of under it. */}
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
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
          <div className="relative min-h-0 flex-1">
            <div ref={bodyRef} className="h-full overflow-y-auto px-10 py-8 [scrollbar-gutter:stable]">
              {children}
            </div>
            {hasMoreBelow && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent" />
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
