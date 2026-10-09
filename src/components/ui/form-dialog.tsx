import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'

interface FormDialogProps {
  open:      boolean
  title:     string
  subtitle?: string
  onClose:   () => void
  children:  ReactNode
  width?:    string
  /** Opt-in: non-modal (no overlay, page behind stays interactive) and movable by dragging the header. */
  draggable?: boolean
}

export function FormDialog({ open, title, subtitle, onClose, children, width = 'w-[560px]', draggable = false }: FormDialogProps) {
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

  // Draggable mode: the dialog is offset from its centered position by `offset`.
  const contentRef = useRef<HTMLDivElement>(null)
  const dragStart = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  // Re-center on close (state adjusted during render, not in an effect).
  if (!open && (offset.x !== 0 || offset.y !== 0)) setOffset({ x: 0, y: 0 })

  /**
   * Clamps an offset from the centered position so the whole dialog stays inside the viewport.
   * A dialog larger than the viewport is kept left/top aligned so its header stays reachable.
   */
  const clampOffset = (x: number, y: number) => {
    const w = contentRef.current?.offsetWidth ?? 0
    const h = contentRef.current?.offsetHeight ?? 0
    const limitX = Math.max(0, (window.innerWidth - w) / 2)
    const limitY = Math.max(0, (window.innerHeight - h) / 2)
    return {
      x: w > window.innerWidth ? (w - window.innerWidth) / 2 : Math.max(-limitX, Math.min(limitX, x)),
      y: h > window.innerHeight ? (h - window.innerHeight) / 2 : Math.max(-limitY, Math.min(limitY, y)),
    }
  }

  // Keep the dialog on screen when the window shrinks.
  useEffect(() => {
    if (!open || !draggable) return
    const onResize = () => setOffset(o => clampOffset(o.x, o.y))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [open, draggable])

  const onHeaderPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggable || e.button !== 0 || (e.target as HTMLElement).closest('button')) return
    dragStart.current = { px: e.clientX, py: e.clientY, ox: offset.x, oy: offset.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onHeaderPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const start = dragStart.current
    if (!start) return
    setOffset(clampOffset(start.ox + e.clientX - start.px, start.oy + e.clientY - start.py))
  }

  const onHeaderPointerUp = () => { dragStart.current = null }

  return (
    <Dialog.Root open={open} onOpenChange={v => !v && onClose()} modal={!draggable}>
      <Dialog.Portal>
        {/* Overlay and Content share z-50: with nested FormDialogs (e.g. the weight wizard opened
            from inside "Nueva Clase"), Radix appends each dialog's Portal after the previous one's,
            so equal z-index falls back to DOM order — the later (inner) dialog's overlay then
            correctly paints above the earlier (outer) dialog's content instead of under it. */}
        {!draggable && <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />}
        <Dialog.Content
          ref={contentRef}
          // Non-modal: clicking/focusing the page behind must not close the dialog (would lose typed text).
          onInteractOutside={draggable ? e => e.preventDefault() : undefined}
          style={draggable ? { left: `calc(50% + ${offset.x}px)`, top: `calc(50% + ${offset.y}px)` } : undefined}
          className={`fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] ${width} -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_64px_-8px_rgba(0,0,0,0.2),0_0_0_1px_rgba(0,0,0,0.05)] focus:outline-none`}
        >
          {/* Green accent bar */}
          <div className="h-[3px] w-full shrink-0 bg-[#2C6B2F]" />

          {/* Header */}
          <div
            onPointerDown={onHeaderPointerDown}
            onPointerMove={onHeaderPointerMove}
            onPointerUp={onHeaderPointerUp}
            onPointerCancel={onHeaderPointerUp}
            className={`flex shrink-0 items-start justify-between px-10 pt-8 pb-6 ${draggable ? 'cursor-move select-none touch-none' : ''}`}
          >
            <div>
              <Dialog.Title className="text-[21px] font-bold text-[#101828]">
                {title}
              </Dialog.Title>
              {subtitle && (
                <p className="mt-1 whitespace-pre-line text-[14px] text-[#667085]">{subtitle}</p>
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

          {/* Body — overflow lives directly on this flex item, not on a `h-full` grandchild.
              Dialog.Content only sets max-height (not height), so it never has a spec-"definite"
              height; a percentage-height (`h-full`) or `absolute inset-0` descendant then fails to
              resolve against it in Chromium and either grows to its own content's size (spilling
              past the dialog's clipped edge, including the footer) or collapses to zero. The flex
              item's OWN box, though, is correctly resolved by the flex algorithm itself (confirmed:
              its rendered height reliably matches "available space minus the other rows") — putting
              overflow-y-auto there instead sidesteps the percentage-height quirk entirely. */}
          <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto px-10 py-8 [scrollbar-gutter:stable]">
            {children}
            {hasMoreBelow && (
              <div className="pointer-events-none sticky bottom-0 -mt-10 h-10 bg-gradient-to-t from-white to-transparent" />
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
