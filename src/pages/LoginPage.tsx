import { useState, type FormEvent } from 'react'
import { Eye, EyeOff, BarChart3, ShoppingCart, Package, FileText, LayoutGrid } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth.store'
import type { LoginResponse } from '@/types/api.types'

const PRIMARY = '#2C6B2F'
const PRIMARY_LIGHT = 'hsl(123, 45%, 97%)'

const features = [
  { icon: LayoutGrid,   title: 'Codificación de Artículos', desc: 'Jerarquía de 4 niveles: categoría, familia, tipo e ítem' },
  { icon: ShoppingCart, title: 'Compras y Ventas',           desc: 'Gestión integral de órdenes, proveedores y clientes' },
  { icon: Package,      title: 'Stock en Tiempo Real',       desc: 'Control de inventario con alertas de mínimo y máximo' },
  { icon: FileText,     title: 'Facturación',                desc: 'Emisión y seguimiento de comprobantes en un solo lugar' },
  { icon: BarChart3,    title: 'Reportes Detallados',        desc: 'Estadísticas y análisis de tu operación completa' },
]

export function LoginPage() {
  const login = useAuthStore((s) => s.login)
  const [form, setForm]         = useState({ companyCode: '', username: '', password: '' })
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const [showPwd, setShowPwd]   = useState(false)
  const [btnHover, setBtnHover] = useState(false)

  const handleChange = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    localStorage.removeItem('pyramid_token')
    try {
      const { data } = await apiClient.post<LoginResponse>('/auth/login', form)
      login(data)
      window.location.href = '/app/catalog'
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Error de conexión. Verificá que el servidor esté corriendo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="flex h-full w-full"
      style={{ background: `radial-gradient(circle at 25% 15%, ${PRIMARY}14, transparent 55%), ${PRIMARY_LIGHT}` }}
    >

      {/* ── Left — form ───────────────────────────────────────────── */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12 sm:px-8">

        {/* Decorative blurred orbs — echo the right panel's depth language */}
        <div
          className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full blur-3xl"
          style={{ background: `${PRIMARY}1f` }}
        />
        <div
          className="pointer-events-none absolute -bottom-24 -right-10 h-80 w-80 rounded-full blur-3xl"
          style={{ background: `${PRIMARY}17` }}
        />

        {/* Pyramid watermark — 4 bands, one per level of the catalog hierarchy */}
        <svg
          className="pointer-events-none absolute -bottom-16 -right-20 h-[440px] w-[440px] opacity-[0.05]"
          viewBox="0 0 100 100"
          fill="none"
        >
          <path d="M50 5 L95 92 L5 92 Z" stroke={PRIMARY} strokeWidth="1.2" />
          <line x1="38.8" y1="26.8" x2="61.2" y2="26.8" stroke={PRIMARY} strokeWidth="1.2" />
          <line x1="27.5" y1="48.5" x2="72.5" y2="48.5" stroke={PRIMARY} strokeWidth="1.2" />
          <line x1="16.3" y1="70.3" x2="83.7" y2="70.3" stroke={PRIMARY} strokeWidth="1.2" />
        </svg>

        <div className="relative w-full max-w-md space-y-8">

          {/* Header */}
          <div className="text-center">
            <div className="mb-5 flex justify-center">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-extrabold text-white"
                style={{
                  background: `linear-gradient(135deg, ${PRIMARY} 0%, #1E4B21 100%)`,
                  boxShadow: `0 10px 24px -8px ${PRIMARY}80`,
                }}
              >
                P
              </div>
            </div>
            <h1 className="text-4xl font-bold tracking-tight" style={{ color: PRIMARY }}>Pyramprod</h1>
            <p className="mt-2 text-sm text-gray-500">Laboratorio de Compras</p>
          </div>

          {/* Card */}
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-black/5 bg-white"
            style={{ boxShadow: '0 1px 2px rgba(16,24,40,0.04), 0 20px 40px -16px rgba(16,24,40,0.14)' }}
          >
            <div className="px-6 pt-6 pb-2">
              <h2 className="text-2xl font-bold text-gray-900">Iniciar sesión</h2>
              <p className="mt-1 text-sm text-gray-500">
                Ingresá tus credenciales para acceder al sistema
              </p>
            </div>

            <div className="space-y-4 px-6 pb-6 pt-4">
              <div className="space-y-1.5">
                <label htmlFor="companyCode" className="block text-sm font-medium text-gray-700">
                  Empresa
                </label>
                <input
                  id="companyCode"
                  type="text"
                  placeholder="Código de empresa"
                  value={form.companyCode}
                  onChange={handleChange('companyCode')}
                  required
                  autoFocus
                  autoComplete="organization"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 transition"
                  style={{ background: PRIMARY_LIGHT }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = PRIMARY; e.currentTarget.style.boxShadow = `0 0 0 2px ${PRIMARY}20` }}
                  onBlur={(e)  => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none' }}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  Nombre de usuario
                </label>
                <input
                  id="username"
                  type="text"
                  placeholder="Ingresá tu usuario"
                  value={form.username}
                  onChange={handleChange('username')}
                  required
                  autoComplete="username"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 transition"
                  style={{ background: PRIMARY_LIGHT }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = PRIMARY; e.currentTarget.style.boxShadow = `0 0 0 2px ${PRIMARY}20` }}
                  onBlur={(e)  => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none' }}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPwd ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={handleChange('password')}
                    required
                    autoComplete="current-password"
                    className="w-full rounded-lg border border-gray-200 py-2 pl-3 pr-10 text-sm text-gray-900 outline-none placeholder:text-gray-400 transition"
                    style={{ background: PRIMARY_LIGHT }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = PRIMARY; e.currentTarget.style.boxShadow = `0 0 0 2px ${PRIMARY}20` }}
                    onBlur={(e)  => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none' }}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600"
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-sm text-red-600">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                onMouseEnter={() => setBtnHover(true)}
                onMouseLeave={() => setBtnHover(false)}
                className="mt-2 w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  background: btnHover && !loading ? '#1E4B21' : PRIMARY,
                  fontSize: '0.9375rem',
                  boxShadow: btnHover && !loading ? `0 8px 16px -4px ${PRIMARY}66` : `0 2px 6px -1px ${PRIMARY}40`,
                  transform: btnHover && !loading ? 'translateY(-1px)' : 'none',
                }}
              >
                {loading ? 'Ingresando...' : 'Iniciar sesión'}
              </button>
            </div>
          </form>

          <p className="text-center text-xs text-gray-400">
            Gestioná tu empresa de forma eficiente y segura
          </p>
        </div>
      </div>

      {/* ── Right — decorative panel ───────────────────────────────── */}
      <div
        className="relative hidden lg:flex lg:w-[480px] xl:w-[560px] shrink-0 items-center justify-center overflow-hidden p-12 text-white"
        style={{ background: `linear-gradient(160deg, #1E4B21 0%, ${PRIMARY} 55%, #35802f 100%)` }}
      >
        {/* Decorative blurred orbs for depth */}
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full blur-3xl"
          style={{ background: 'rgba(255,255,255,0.10)' }}
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full blur-3xl"
          style={{ background: 'rgba(0,0,0,0.15)' }}
        />
        {/* Subtle dot-grid texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        />

        <div className="relative max-w-sm space-y-8">
          <div className="space-y-2">
            <h2 className="text-4xl font-bold tracking-tight">Bienvenido a Pyramprod</h2>
            <p className="text-lg" style={{ color: 'rgba(255,255,255,0.75)' }}>
              La solución completa para la gestión de tu empresa industrial
            </p>
          </div>

          <div className="mt-10 space-y-5">
            {features.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="flex items-start gap-4 rounded-xl p-2.5 transition-colors duration-150 hover:bg-white/[0.06]"
              >
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: 'rgba(255,255,255,0.12)',
                    border: '1px solid rgba(255,255,255,0.14)',
                    boxShadow: '0 4px 10px -2px rgba(0,0,0,0.25)',
                  }}
                >
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-[15px]">{title}</h3>
                  <p className="mt-0.5 text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}
