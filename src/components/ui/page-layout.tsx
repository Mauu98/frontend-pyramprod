import type { ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'

interface PageLayoutProps {
  title:       string
  subtitle?:   string
  backTo?:     string
  actions?:    ReactNode
  children:    ReactNode
}

/** Standard full-page layout with header bar and padded content area. */
export function PageLayout({ title, subtitle, backTo, actions, children }: PageLayoutProps) {
  const navigate = useNavigate()

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#f4f5f7]">
      {/* Header */}
      <header className="flex shrink-0 items-center gap-4 border-b-2 border-[#E8E8E8] bg-white px-6 py-4">
        {backTo && (
          <button
            type="button"
            onClick={() => navigate({ to: backTo as never })}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-[#D0D0D0] text-[#555555] transition hover:bg-[#F5F5F5]"
            aria-label="Volver"
          >
            <ArrowLeft size={15} />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-[20px] font-bold text-[#2C3E50] leading-tight">{title}</h1>
          {subtitle && <p className="mt-0.5 text-[13px] text-[#888888]">{subtitle}</p>}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-6 [scrollbar-gutter:stable]">
        {children}
      </main>
    </div>
  )
}

/** Centered form card — use inside PageLayout for standalone create/edit pages. */
export function FormCard({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[680px] rounded-lg border border-[#E8E8E8] bg-white p-6 shadow-sm">
      {children}
    </div>
  )
}
