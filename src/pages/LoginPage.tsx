import { useState, type FormEvent } from 'react'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth.store'
import type { LoginResponse } from '@/types/api.types'

const ACCENT = '#2C6B2F'
const ACCENT_STRONG = '#1E4B21'
const INK = '#13231A'
const MUTED = '#6E7D73'
const LINE = 'rgba(20,60,25,.22)'
const BG = '#F5F8F5'
const GRID_LINE = 'rgba(20,60,25,.14)'

const MONO = "'IBM Plex Mono', ui-monospace, monospace"

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

  const focusField = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = ACCENT
    e.currentTarget.style.boxShadow = `0 0 0 3px ${ACCENT}1f`
  }
  const blurField = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = LINE
    e.currentTarget.style.boxShadow = 'none'
  }

  return (
    <div
      className="flex h-full w-full items-center justify-center overflow-y-auto px-6 py-12"
      style={{
        background:
          `linear-gradient(${GRID_LINE} 1px, transparent 1px) 0 0 / 28px 28px, ` +
          `linear-gradient(90deg, ${GRID_LINE} 1px, transparent 1px) 0 0 / 28px 28px, ` +
          `${BG}`,
      }}
    >
      <div className="relative w-full max-w-[460px]">
        {/* Corner brackets — blueprint frame */}
        <span className="absolute -left-2.5 -top-2.5 h-[22px] w-[22px] border-l-2 border-t-2 opacity-55" style={{ borderColor: ACCENT }} />
        <span className="absolute -right-2.5 -top-2.5 h-[22px] w-[22px] border-r-2 border-t-2 opacity-55" style={{ borderColor: ACCENT }} />
        <span className="absolute -left-2.5 -bottom-2.5 h-[22px] w-[22px] border-b-2 border-l-2 opacity-55" style={{ borderColor: ACCENT }} />
        <span className="absolute -right-2.5 -bottom-2.5 h-[22px] w-[22px] border-b-2 border-r-2 opacity-55" style={{ borderColor: ACCENT }} />

        {/* Dimensioned pyramid diagram + wordmark */}
        <div className="mb-7 flex flex-col items-center">
          <svg viewBox="0 0 220 150" fill="none" className="h-[150px] w-[220px]">
            <path d="M110 12 L200 130 L20 130 Z" stroke={ACCENT} strokeWidth="1.3" opacity=".5" />
            <line x1="86" y1="55" x2="134" y2="55" stroke={ACCENT} strokeWidth="1" opacity=".5" />
            <line x1="66" y1="88" x2="154" y2="88" stroke={ACCENT} strokeWidth="1" opacity=".5" />
            <line x1="46" y1="118" x2="174" y2="118" stroke={ACCENT} strokeWidth="1" opacity=".5" />
            <line x1="20" y1="140" x2="200" y2="140" stroke={INK} strokeWidth="1" opacity=".3" />
            <line x1="20" y1="136" x2="20" y2="144" stroke={INK} strokeWidth="1" opacity=".3" />
            <line x1="200" y1="136" x2="200" y2="144" stroke={INK} strokeWidth="1" opacity=".3" />
            <text x="110" y="148" textAnchor="middle" fill={ACCENT} fontSize="10.5" fontFamily={MONO}>180mm</text>
            <text x="145" y="52" fill={ACCENT} fontSize="10.5" fontFamily={MONO}>H4</text>
            <text x="160" y="85" fill={ACCENT} fontSize="10.5" fontFamily={MONO}>H3</text>
            <text x="180" y="115" fill={ACCENT} fontSize="10.5" fontFamily={MONO}>H2</text>
          </svg>
          <div className="mt-2.5 text-center">
            <div className="text-[21px] font-extrabold tracking-wide" style={{ color: INK }}>
              PYRAM<span style={{ color: ACCENT }}>PROD</span>
            </div>
            <div
              className="mt-1 text-[10.5px] uppercase tracking-[0.1em]"
              style={{ color: MUTED, fontFamily: MONO }}
            >
              Sistema de Gestión Industrial
            </div>
          </div>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="rounded border bg-white"
          style={{ borderColor: GRID_LINE, boxShadow: '0 1px 2px rgba(20,40,25,.04), 0 24px 48px -20px rgba(20,40,25,.16)' }}
        >
          <div className="border-b px-6 py-5" style={{ borderColor: GRID_LINE }}>
            <h2 className="text-lg font-bold" style={{ color: INK }}>Iniciar sesión</h2>
            <p className="mt-1.5 text-[11px]" style={{ color: MUTED, fontFamily: MONO }}>
              // ingresá tus credenciales para acceder
            </p>
          </div>

          <div className="flex flex-col gap-4 px-6 py-5">
            <div>
              <label
                htmlFor="companyCode"
                className="mb-1.5 block text-[10.5px] font-medium uppercase tracking-[0.06em]"
                style={{ color: MUTED, fontFamily: MONO }}
              >
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
                className="h-[42px] w-full rounded-sm px-3.5 text-sm outline-none transition"
                style={{ background: BG, color: INK, border: `1px solid ${LINE}` }}
                onFocus={focusField}
                onBlur={blurField}
              />
            </div>

            <div>
              <label
                htmlFor="username"
                className="mb-1.5 block text-[10.5px] font-medium uppercase tracking-[0.06em]"
                style={{ color: MUTED, fontFamily: MONO }}
              >
                Usuario
              </label>
              <input
                id="username"
                type="text"
                placeholder="Ingresá tu usuario"
                value={form.username}
                onChange={handleChange('username')}
                required
                autoComplete="username"
                className="h-[42px] w-full rounded-sm px-3.5 text-sm outline-none transition"
                style={{ background: BG, color: INK, border: `1px solid ${LINE}` }}
                onFocus={focusField}
                onBlur={blurField}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-[10.5px] font-medium uppercase tracking-[0.06em]"
                style={{ color: MUTED, fontFamily: MONO }}
              >
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
                  className="h-[42px] w-full rounded-sm py-0 pl-3.5 pr-10 text-sm outline-none transition"
                  style={{ background: BG, color: INK, border: `1px solid ${LINE}` }}
                  onFocus={focusField}
                  onBlur={blurField}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition hover:opacity-70"
                  style={{ color: MUTED }}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-sm border border-red-100 bg-red-50 px-3 py-2.5 text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              onMouseEnter={() => setBtnHover(true)}
              onMouseLeave={() => setBtnHover(false)}
              className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-sm text-[12.5px] font-semibold uppercase tracking-[0.08em] text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                background: btnHover && !loading ? ACCENT_STRONG : INK,
                fontFamily: MONO,
              }}
            >
              {loading ? 'Ingresando...' : 'Iniciar sesión'}
              {!loading && <ArrowRight className="h-3.5 w-3.5" />}
            </button>
          </div>
        </form>

        <p
          className="mt-4 text-center text-[10px] tracking-[0.04em]"
          style={{ color: MUTED, fontFamily: MONO }}
        >
          REV. 2026 — PYRAMPROD/LOGIN/001
        </p>
      </div>
    </div>
  )
}
