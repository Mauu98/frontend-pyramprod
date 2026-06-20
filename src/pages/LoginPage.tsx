import { useState, type FormEvent } from 'react'
import { Eye, EyeOff, BarChart3, ShoppingCart, Package, FileText, LayoutGrid } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth.store'
import type { LoginResponse } from '@/types/api.types'

const PRIMARY = '#002d80'
const PRIMARY_LIGHT = 'hsl(220, 100%, 98.5%)'

const features = [
  { icon: LayoutGrid,   title: 'Codificación de Artículos', desc: 'Jerarquía de 4 niveles: categoría, familia, tipo e ítem' },
  { icon: ShoppingCart, title: 'Compras y Ventas',           desc: 'Gestión integral de órdenes, proveedores y clientes' },
  { icon: Package,      title: 'Stock en Tiempo Real',       desc: 'Control de inventario con alertas de mínimo y máximo' },
  { icon: FileText,     title: 'Facturación',                desc: 'Emisión y seguimiento de comprobantes en un solo lugar' },
  { icon: BarChart3,    title: 'Reportes Detallados',        desc: 'Estadísticas y análisis de tu operación completa' },
]

export function LoginPage() {
  const login = useAuthStore((s) => s.login)
  const [form, setForm]       = useState({ companyCode: '', username: '', password: '' })
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

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
    <div className="flex h-full w-full" style={{ background: PRIMARY_LIGHT }}>

      {/* ── Left — form ───────────────────────────────────────────── */}
      <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-md space-y-8">

          {/* Header */}
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-extrabold text-white"
                style={{ background: `${PRIMARY}1a` }}
              >
                <span style={{ color: PRIMARY }}>P</span>
              </div>
            </div>
            <h1 className="text-4xl font-bold tracking-tight" style={{ color: PRIMARY }}>Piramide</h1>
            <p className="mt-2 text-sm text-gray-500">Sistema de Gestión Empresarial</p>
          </div>

          {/* Card */}
          <form
            onSubmit={handleSubmit}
            className="rounded-xl border-2 border-gray-200 bg-white shadow-sm"
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
                className="mt-2 w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                style={{ background: PRIMARY, fontSize: '0.9375rem' }}
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
        className="hidden lg:flex lg:w-[480px] xl:w-[560px] shrink-0 items-center justify-center p-12 text-white"
        style={{ background: `linear-gradient(135deg, ${PRIMARY}e6 0%, ${PRIMARY} 100%)` }}
      >
        <div className="max-w-sm space-y-8">
          <div className="space-y-2">
            <h2 className="text-4xl font-bold tracking-tight">Bienvenido a Piramide</h2>
            <p className="text-lg" style={{ color: 'rgba(255,255,255,0.75)' }}>
              La solución completa para la gestión de tu empresa industrial
            </p>
          </div>

          <div className="mt-10 space-y-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                  style={{ background: 'rgba(255,255,255,0.12)' }}
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
