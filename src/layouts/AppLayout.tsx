import { useState } from 'react'
import { Outlet, Link, useRouterState, useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth.store'
import {
  LogOut, ChevronLeft, ChevronRight,
  Layers, ShoppingCart, TrendingUp, Cog, Package, Receipt, BarChart3, Ruler,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem  { icon: LucideIcon; label: string; path: string; color: string }
interface NavGroup { label: string; items: NavItem[] }

const navGroups: NavGroup[] = [
  { label: 'Catalogo', items: [
    { icon: Layers, label: 'Codificacion', path: '/app/catalog',  color: '#60a5fa' },
    { icon: Ruler,  label: 'Medidas',      path: '/app/measures', color: '#34d399' },
  ]},
  { label: 'Operaciones', items: [
    { icon: ShoppingCart, label: 'Compras',      path: '/app/purchases',  color: '#a78bfa' },
    { icon: TrendingUp,   label: 'Ventas',       path: '/app/sales',      color: '#34d399' },
    { icon: Cog,          label: 'Produccion',   path: '/app/production', color: '#fbbf24' },
  ]},
  { label: 'Inventario', items: [
    { icon: Package,      label: 'Stock',        path: '/app/stock',      color: '#818cf8' },
  ]},
  { label: 'Finanzas', items: [
    { icon: Receipt,      label: 'Facturacion',  path: '/app/invoicing',  color: '#f87171' },
    { icon: BarChart3,    label: 'Reportes',     path: '/app/reports',    color: '#94a3b8' },
  ]},
]

function NavLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const state    = useRouterState()
  const isActive = state.location.pathname.startsWith(item.path)
  const Icon     = item.icon

  if (collapsed) {
    return (
      <Link
        to={item.path}
        title={item.label}
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-150',
          isActive
            ? 'bg-[#2C6B2F] shadow-lg shadow-[#1a3d1c]/40'
            : 'text-slate-400 hover:bg-white/10 hover:text-white',
        )}
      >
        <Icon size={16} style={{ color: isActive ? '#fff' : item.color }} />
      </Link>
    )
  }

  return (
    <Link
      to={item.path}
      className={cn(
        'flex items-center gap-3 rounded-2xl px-3 py-3 transition-all duration-150',
        isActive
          ? 'bg-[#2C6B2F] text-white shadow-lg shadow-[#1a3d1c]/40'
          : 'text-slate-400 hover:bg-white/8 hover:text-white',
      )}
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
        style={isActive ? { background: 'rgba(255,255,255,0.20)' } : { background: 'rgba(255,255,255,0.07)' }}
      >
        <Icon size={16} style={{ color: isActive ? '#fff' : item.color }} />
      </span>
      <span className="truncate text-sm font-medium">{item.label}</span>
    </Link>
  )
}

export function AppLayout() {
  const { logout }      = useAuthStore()
  const navigate        = useNavigate()
  const [open, setOpen] = useState(true)

  return (
    <div className="flex h-full w-full overflow-hidden">

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className="flex h-full shrink-0 flex-col overflow-hidden transition-[width] duration-200"
        style={{
          width: open ? '220px' : '64px',
          background: '#0d1629',
          borderRight: '2px solid #1e3a5f',
          boxShadow: '2px 0 12px rgba(0,0,0,0.25)',
        }}
      >
        {/* Brand + toggle */}
        {open ? (
          <div
            className="flex min-h-[64px] items-center gap-3 px-3.5 py-4"
            style={{ background: '#1d293d', borderBottom: '1px solid #1e3a5f' }}
          >
            <svg width="34" height="30" viewBox="0 0 38 34" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
              <rect x="11" y="1"  width="16" height="9" rx="2.5" fill="#2ecc71"/>
              <rect x="6"  y="12" width="26" height="9" rx="2.5" fill="#27ae60"/>
              <rect x="1"  y="23" width="36" height="10" rx="2.5" fill="#1a7a40"/>
            </svg>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold uppercase tracking-widest text-white">
                PYRAM<span style={{ color: '#2ecc71' }}>PROD</span>
              </p>
              <p className="text-[10px] text-slate-500">Gestión Industrial</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-slate-700 text-slate-500 transition hover:border-slate-500 hover:bg-white/10 hover:text-slate-300"
            >
              <ChevronLeft size={14} />
            </button>
          </div>
        ) : (
          <div
            className="flex min-h-[64px] flex-col items-center justify-center gap-2 py-3"
            style={{ background: '#1d293d', borderBottom: '1px solid #1e3a5f' }}
          >
            <svg width="26" height="23" viewBox="0 0 38 34" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="11" y="1"  width="16" height="9" rx="2.5" fill="#2ecc71"/>
              <rect x="6"  y="12" width="26" height="9" rx="2.5" fill="#27ae60"/>
              <rect x="1"  y="23" width="36" height="10" rx="2.5" fill="#1a7a40"/>
            </svg>
            <button
              onClick={() => setOpen(true)}
              title="Expandir menú"
              className="flex h-6 w-6 items-center justify-center rounded-lg border border-slate-700 text-slate-500 transition hover:border-slate-500 hover:bg-white/10 hover:text-white"
            >
              <ChevronRight size={12} />
            </button>
          </div>
        )}

        {/* Nav */}
        <nav className={cn('flex-1 overflow-y-auto py-3', open ? 'px-2.5' : 'px-2')}>
          {navGroups.map((group) => (
            <div key={group.label} className="mb-4">
              {open ? (
                <p className="mb-1.5 px-3 text-[9.5px] font-bold uppercase tracking-[0.16em] text-slate-600">
                  {group.label}
                </p>
              ) : (
                <div className="mx-auto mb-2 h-px w-6 rounded-full" style={{ background: '#1e3a5f' }} />
              )}
              <div className={cn('space-y-1', !open && 'flex flex-col items-center gap-1.5')}>
                {group.items.map((item) => (
                  <NavLink key={item.path} item={item} collapsed={!open} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t" style={{ borderColor: '#1e3a5f' }} />

        {/* User */}
        <div className={cn('flex items-center gap-3 px-3 py-4', !open && 'justify-center')}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2C6B2F] text-xs font-bold text-white">
            MR
          </div>
          {open && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-white">Mauri R.</p>
                <p className="truncate text-[11px] text-slate-500">Admin Empresa</p>
              </div>
              <button
                onClick={() => { logout(); navigate({ to: '/login' }) }}
                className="shrink-0 rounded-lg p-1.5 text-slate-600 transition hover:bg-white/5 hover:text-slate-300"
              >
                <LogOut size={14} />
              </button>
            </>
          )}
        </div>
      </aside>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  )
}
