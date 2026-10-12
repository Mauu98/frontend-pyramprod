import { cn } from '@/lib/utils'
import { useEffect, useRef, type ReactNode } from 'react'
import { AlertCircle, ArrowRight } from 'lucide-react'

export { inputBase, textareaBase, inputError } from './form-tokens'

/** Label + input slot + helper + error */
export function FormField({
  label,
  required,
  optional,
  helper,
  error,
  className,
  labelExtra,
  children,
}: {
  label:      string
  required?:  boolean
  optional?:  boolean
  helper?:    string
  error?:     string | boolean
  className?: string
  labelExtra?: ReactNode
  children:   ReactNode
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label className="flex items-center text-[14px] font-medium text-[#344054]">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
        {optional && (
          <span className="ml-2 text-[13px] font-normal text-[#98A2B3]">opcional</span>
        )}
        {labelExtra}
      </label>

      {children}

      {error ? (
        <p className="flex items-center gap-1.5 text-[13px] text-red-500">
          <AlertCircle size={12} strokeWidth={2.5} />
          {typeof error === 'string' ? error : 'Campo requerido'}
        </p>
      ) : helper ? (
        <p className="text-[13px] leading-relaxed text-[#98A2B3]">{helper}</p>
      ) : null}
    </div>
  )
}

/** Section block — very subtle header, generous gap between fields */
export function FormSection({
  title,
  children,
  first,
}: {
  title?:   string
  children: ReactNode
  first?:   boolean
}) {
  return (
    <div className={cn(!first && 'border-t border-[#F2F4F7] pt-7')}>
      {title && (
        <p className="mb-6 text-[11px] font-bold uppercase tracking-[0.14em] text-[#98A2B3]">
          {title}
        </p>
      )}
      <div className="flex flex-col gap-7">{children}</div>
    </div>
  )
}

/** Full-width primary button + subtle cancel link — matches the reference style */
export function FormActions({
  pending,
  isEdit,
  label,
  onClose,
}: {
  pending: boolean
  isEdit:  boolean
  label:   string
  onClose: () => void
}) {
  // FormDialog's scroll body has 2rem bottom padding, and sticky offsets are measured from it.
  // -bottom-8/-mb-8 push the bar over that padding so it sits flush with the dialog edge with
  // nothing scrolling underneath it; pb-8 restores the breathing room inside the bar itself.
  return (
    <div className="sticky -bottom-8 -mx-10 -mb-8 mt-8 flex items-center gap-5 border-t border-[#F2F4F7] bg-white px-10 pb-8 pt-5">
      <button
        type="button"
        onClick={onClose}
        className="shrink-0 text-[14px] font-medium text-[#667085] transition hover:text-[#344054]"
      >
        Cancelar
      </button>

      <button
        type="submit"
        disabled={pending}
        className="flex h-12 flex-1 items-center justify-center gap-2.5 rounded-lg bg-[#2C6B2F] text-[15px] font-semibold text-white shadow-sm transition hover:bg-[#245A27] active:bg-[#1E4B21] disabled:opacity-50"
      >
        {pending ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Guardando...
          </>
        ) : (
          <>
            <ArrowRight size={16} strokeWidth={2.5} />
            {isEdit ? 'Guardar cambios' : label}
          </>
        )}
      </button>
    </div>
  )
}

/** Read-only parent context badge */
export function ParentBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] px-4 py-3.5">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#98A2B3]">{label}</p>
      <p className="mt-1 text-[15px] font-semibold text-[#101828]">{value}</p>
    </div>
  )
}

/** Full-width error banner */
export function ErrorBanner({ message }: { message?: string }) {
  // Banners usually render at the bottom of a long scrolling form (below the fold): bring them
  // into view on mount and whenever the message changes so a failed save is never silent.
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [message])

  return (
    <div ref={ref} role="alert" className="flex items-start gap-3 rounded-lg border border-red-100 bg-red-50 px-4 py-4 text-[14px] text-red-600">
      <AlertCircle size={15} className="mt-0.5 shrink-0" strokeWidth={2} />
      <span className="leading-snug">
        {message ?? 'No se pudo guardar. Verificá los datos e intentá de nuevo.'}
      </span>
    </div>
  )
}
