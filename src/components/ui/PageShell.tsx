import type { ReactNode } from 'react'

export function PageShell({ title, description, action, children }: {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
          {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
        </div>
        {action && <div>{action}</div>}
      </header>
      <main className="flex-1 overflow-auto bg-slate-50 p-6">
        {children}
      </main>
    </div>
  )
}
