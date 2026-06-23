import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShoppingCart, Search, Plus, X } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import type {
  Supplier,
  SupplierQuote,
  SupplierItemCode,
  PriceComparisonLine,
  SupplierRequest,
  SupplierQuoteRequest,
  PageResponse,
} from '@/types/api.types'

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#fbbf24] border-t-transparent" />
  )
}

// ─── New Supplier Dialog ──────────────────────────────────────────────────────

function NewSupplierDialog({ open, onClose, onCreated }: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (req: SupplierRequest) =>
      apiClient.post<Supplier>('/purchasing/suppliers', req),
    onSuccess: () => {
      setCode('')
      setName('')
      setEmail('')
      setError(null)
      onCreated()
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'No se pudo crear el proveedor.')
    },
  })

  function handleSubmit() {
    setError(null)
    if (!code.trim()) { setError('El código es requerido.'); return }
    if (!name.trim()) { setError('El nombre es requerido.'); return }
    mutation.mutate({ code: code.trim(), name: name.trim(), email: email.trim() || undefined })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative w-[440px] rounded-2xl border border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fbbf24]/10">
              <ShoppingCart size={16} className="text-[#fbbf24]" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-[#111827]">Nuevo Proveedor</p>
              <p className="text-[12px] text-slate-400">Completá los datos básicos del proveedor</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 text-slate-400 transition hover:bg-gray-100 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-6 py-5">
          {[
            { label: 'Código', value: code, onChange: setCode, placeholder: 'Ej: PROV001' },
            { label: 'Nombre', value: name, onChange: setName, placeholder: 'Razón social del proveedor' },
            { label: 'Email', value: email, onChange: setEmail, placeholder: 'contacto@proveedor.com' },
          ].map(field => (
            <div key={field.label} className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">
                {field.label}
              </label>
              <input
                type="text"
                value={field.value}
                onChange={e => field.onChange(e.target.value)}
                placeholder={field.placeholder}
                className="rounded-xl border border-gray-200 bg-[#f7f8fa] px-4 py-2.5 text-[14px] text-[#374151] placeholder-slate-300 outline-none transition focus:border-[#fbbf24] focus:bg-white"
              />
            </div>
          ))}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2 text-[13px] font-medium text-slate-500 transition hover:border-gray-300"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={mutation.isPending}
            className="flex items-center gap-2 rounded-xl bg-[#fbbf24] px-5 py-2 text-[13px] font-semibold text-white transition hover:bg-[#f59e0b] disabled:opacity-50"
          >
            {mutation.isPending
              ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Creando...</>
              : 'Crear Proveedor'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── New Quote Dialog ─────────────────────────────────────────────────────────

function NewQuoteDialog({ open, supplierId, onClose, onCreated }: {
  open: boolean
  supplierId: number
  onClose: () => void
  onCreated: () => void
}) {
  const [itemId, setItemId] = useState('')
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState('ARS')
  const [exchangeRate, setExchangeRate] = useState('')
  const [bonus, setBonus] = useState('')
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().slice(0, 10))
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (req: SupplierQuoteRequest) =>
      apiClient.post<SupplierQuote>('/purchasing/quotes', req),
    onSuccess: () => {
      setItemId('')
      setPrice('')
      setCurrency('ARS')
      setExchangeRate('')
      setBonus('')
      setError(null)
      onCreated()
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'No se pudo crear la cotización.')
    },
  })

  function handleSubmit() {
    setError(null)
    if (!itemId) { setError('El ID de artículo es requerido.'); return }
    if (!price || Number(price) <= 0) { setError('El precio debe ser mayor a 0.'); return }

    const req: SupplierQuoteRequest = {
      supplierId,
      itemId: Number(itemId),
      quoteDate,
      price: Number(price),
      currency,
    }

    if (exchangeRate) req.exchangeRate = Number(exchangeRate)
    if (bonus) req.bonus = Number(bonus)

    mutation.mutate(req)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative w-[440px] rounded-2xl border border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <p className="text-[14px] font-semibold text-[#111827]">Nueva Cotización</p>
            <p className="text-[12px] text-slate-400">Registrá el precio del proveedor para un artículo</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 text-slate-400 transition hover:bg-gray-100 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-3 px-6 py-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">ID Artículo</label>
            <input type="number" value={itemId} onChange={e => setItemId(e.target.value)} placeholder="ID del artículo en el catálogo"
              className="rounded-xl border border-gray-200 bg-[#f7f8fa] px-4 py-2.5 text-[14px] text-[#374151] placeholder-slate-300 outline-none transition focus:border-[#fbbf24] focus:bg-white" />
          </div>

          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">Precio</label>
              <input type="number" step="0.01" min="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00"
                className="rounded-xl border border-gray-200 bg-[#f7f8fa] px-4 py-2.5 text-[14px] text-[#374151] placeholder-slate-300 outline-none transition focus:border-[#fbbf24] focus:bg-white" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">Moneda</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)}
                className="rounded-xl border border-gray-200 bg-[#f7f8fa] px-3 py-2.5 text-[14px] text-[#374151] outline-none transition focus:border-[#fbbf24] focus:bg-white">
                <option>ARS</option>
                <option>USD</option>
                <option>EUR</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">Tipo de Cambio</label>
              <input type="number" step="0.000001" min="0" value={exchangeRate} onChange={e => setExchangeRate(e.target.value)} placeholder="Opcional"
                className="rounded-xl border border-gray-200 bg-[#f7f8fa] px-4 py-2.5 text-[14px] text-[#374151] placeholder-slate-300 outline-none transition focus:border-[#fbbf24] focus:bg-white" />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">Bonificación %</label>
              <input type="number" step="0.01" min="0" max="100" value={bonus} onChange={e => setBonus(e.target.value)} placeholder="0"
                className="rounded-xl border border-gray-200 bg-[#f7f8fa] px-4 py-2.5 text-[14px] text-[#374151] placeholder-slate-300 outline-none transition focus:border-[#fbbf24] focus:bg-white" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">Fecha de Cotización</label>
            <input type="date" value={quoteDate} onChange={e => setQuoteDate(e.target.value)}
              className="rounded-xl border border-gray-200 bg-[#f7f8fa] px-4 py-2.5 text-[14px] text-[#374151] outline-none transition focus:border-[#fbbf24] focus:bg-white" />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">{error}</div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button type="button" onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2 text-[13px] font-medium text-slate-500 transition hover:border-gray-300">
            Cancelar
          </button>
          <button type="button" onClick={handleSubmit} disabled={mutation.isPending}
            className="flex items-center gap-2 rounded-xl bg-[#fbbf24] px-5 py-2 text-[13px] font-semibold text-white transition hover:bg-[#f59e0b] disabled:opacity-50">
            {mutation.isPending
              ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Guardando...</>
              : 'Crear Cotización'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Quotes Tab ───────────────────────────────────────────────────────────────

function QuotesTab({ supplier }: { supplier: Supplier }) {
  const [showDialog, setShowDialog] = useState(false)
  const qc = useQueryClient()

  const { data: quotes = [], isLoading } = useQuery<SupplierQuote[]>({
    queryKey: ['purchasing-quotes', supplier.id],
    queryFn: () =>
      apiClient
        .get<SupplierQuote[]>('/purchasing/quotes', { params: { supplierId: supplier.id } })
        .then(r => r.data),
  })

  const activeQuotes = quotes.filter(q => q.status === 'ACTIVE')

  function handleCreated() {
    qc.invalidateQueries({ queryKey: ['purchasing-quotes', supplier.id] })
  }

  if (isLoading) return <div className="flex h-24 items-center justify-center"><Spinner /></div>

  return (
    <>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowDialog(true)}
          className="flex items-center gap-2 rounded-xl bg-[#fbbf24] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#f59e0b]"
        >
          <Plus size={13} />
          Nueva Cotización
        </button>
      </div>

      {activeQuotes.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-slate-300">
          <ShoppingCart size={28} strokeWidth={1.2} />
          <p className="text-[13px]">Sin cotizaciones activas para este proveedor</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-100">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-gray-100 bg-[#f7f8fa]">
                <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Artículo</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">Precio</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Moneda</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">Bonif. %</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {activeQuotes.map(q => (
                <tr key={q.id} className="border-b border-gray-50 hover:bg-[#fafafa]">
                  <td className="px-4 py-3">
                    <span className="font-mono text-[12px] text-slate-500">{q.itemCode}</span>
                    <span className="ml-2 text-slate-700">{q.itemName}</span>
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-semibold text-[#374151]">
                    {Number(q.price).toFixed(4)}
                  </td>
                  <td className="px-3 py-3 text-slate-600">{q.currency}</td>
                  <td className="px-3 py-3 text-right text-slate-500">
                    {q.bonus != null ? `${Number(q.bonus).toFixed(2)}%` : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{q.quoteDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <NewQuoteDialog
        open={showDialog}
        supplierId={supplier.id}
        onClose={() => setShowDialog(false)}
        onCreated={handleCreated}
      />
    </>
  )
}

// ─── Compare Prices Tab ───────────────────────────────────────────────────────

function ComparePricesTab() {
  const [itemIdInput, setItemIdInput] = useState('')
  const [searchItemId, setSearchItemId] = useState<number | null>(null)

  const { data: lines = [], isLoading } = useQuery<PriceComparisonLine[]>({
    queryKey: ['purchasing-compare', searchItemId],
    queryFn: () =>
      apiClient
        .get<PriceComparisonLine[]>(`/purchasing/items/${searchItemId}/quotes/compare`)
        .then(r => r.data),
    enabled: searchItemId != null,
  })

  function handleSearch() {
    const parsed = parseInt(itemIdInput, 10)
    if (!isNaN(parsed) && parsed > 0) {
      setSearchItemId(parsed)
    }
  }

  const bestPrice = lines.length > 0
    ? Math.min(...lines.map(l => Number(l.effectivePrice)))
    : null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-[#f7f8fa] px-3 py-2 transition focus-within:border-[#fbbf24] focus-within:bg-white">
          <Search size={13} className="shrink-0 text-slate-400" />
          <input
            type="number"
            placeholder="ID del artículo a comparar..."
            value={itemIdInput}
            onChange={e => setItemIdInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="min-w-0 flex-1 bg-transparent text-[13px] text-slate-700 placeholder-slate-400 focus:outline-none"
          />
        </div>
        <button
          onClick={handleSearch}
          className="rounded-xl bg-[#fbbf24] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#f59e0b]"
        >
          Comparar
        </button>
      </div>

      {isLoading && (
        <div className="flex h-24 items-center justify-center"><Spinner /></div>
      )}

      {!isLoading && searchItemId != null && lines.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-8 text-slate-300">
          <p className="text-[13px]">Sin cotizaciones activas para el artículo {searchItemId}</p>
        </div>
      )}

      {lines.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-100">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-gray-100 bg-[#f7f8fa]">
                <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Proveedor</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">Precio</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Moneda</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">Bonif. %</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">Precio Efectivo</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => {
                const isBest = bestPrice != null && Number(line.effectivePrice) === bestPrice
                return (
                  <tr
                    key={idx}
                    className={cn(
                      'border-b border-gray-50',
                      isBest ? 'bg-emerald-50' : 'hover:bg-[#fafafa]',
                    )}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-[12px] text-slate-500">{line.supplierCode}</span>
                      <span className="ml-2 text-slate-700">{line.supplierName}</span>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-slate-600">
                      {Number(line.price).toFixed(4)}
                    </td>
                    <td className="px-3 py-3 text-slate-600">{line.currency}</td>
                    <td className="px-3 py-3 text-right text-slate-500">
                      {line.bonus != null ? `${Number(line.bonus).toFixed(2)}%` : '—'}
                    </td>
                    <td className={cn(
                      'px-4 py-3 text-right font-mono font-bold',
                      isBest ? 'text-emerald-700' : 'text-[#374151]',
                    )}>
                      {Number(line.effectivePrice).toFixed(4)}
                      {isBest && (
                        <span className="ml-2 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
                          mejor
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Item Codes Tab ───────────────────────────────────────────────────────────

function ItemCodesTab({ supplier }: { supplier: Supplier }) {
  const { data: codes = [], isLoading } = useQuery<SupplierItemCode[]>({
    queryKey: ['purchasing-item-codes', supplier.id],
    queryFn: () =>
      apiClient
        .get<SupplierItemCode[]>('/purchasing/item-codes', { params: { supplierId: supplier.id } })
        .then(r => r.data),
  })

  if (isLoading) return <div className="flex h-24 items-center justify-center"><Spinner /></div>

  if (codes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-slate-300">
        <ShoppingCart size={28} strokeWidth={1.2} />
        <p className="text-[13px]">Sin códigos de equivalencia para este proveedor</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-gray-100 bg-[#f7f8fa]">
            <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Código Proveedor</th>
            <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Nombre Proveedor</th>
            <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Artículo</th>
          </tr>
        </thead>
        <tbody>
          {codes.map(c => (
            <tr key={c.id} className="border-b border-gray-50 hover:bg-[#fafafa]">
              <td className="px-4 py-3 font-mono text-[12px] text-slate-600">{c.supplierCode}</td>
              <td className="px-3 py-3 text-slate-600">{c.supplierName ?? '—'}</td>
              <td className="px-4 py-3">
                <span className="font-mono text-[12px] text-slate-500">{c.itemCode}</span>
                <span className="ml-2 text-slate-700">{c.itemName}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

type DetailTab = 'cotizaciones' | 'comparar' | 'codigos'

function DetailPanel({ supplier }: { supplier: Supplier }) {
  const [tab, setTab] = useState<DetailTab>('cotizaciones')

  const tabLabels: Record<DetailTab, string> = {
    cotizaciones: 'Cotizaciones',
    comparar: 'Comparar Precios',
    codigos: 'Códigos Equiv.',
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#f7f8fa]">
      <div className="shrink-0 border-b border-gray-100 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#fbbf24]/10">
            <ShoppingCart size={15} className="text-[#fbbf24]" />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#fbbf24]">
              {supplier.code}
            </p>
            <p className="truncate text-[16px] font-bold text-[#111827]">{supplier.name}</p>
          </div>
        </div>

        <div className="mt-4 flex gap-1 border-b border-gray-100">
          {(['cotizaciones', 'comparar', 'codigos'] as DetailTab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-4 pb-3 pt-1 text-[13px] font-semibold transition',
                tab === t
                  ? 'border-b-2 border-[#fbbf24] text-[#d97706]'
                  : 'text-slate-400 hover:text-slate-600',
              )}
            >
              {tabLabels[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        {tab === 'cotizaciones' && <QuotesTab supplier={supplier} />}
        {tab === 'comparar' && <ComparePricesTab />}
        {tab === 'codigos' && <ItemCodesTab supplier={supplier} />}
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyPanel() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 bg-[#f7f8fa] p-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-sm">
        <ShoppingCart size={26} strokeWidth={1.2} className="text-slate-300" />
      </div>
      <div>
        <p className="text-[15px] font-semibold text-slate-300">Seleccioná un proveedor</p>
        <p className="mt-1 text-[13px] text-slate-200">Las cotizaciones y comparativas aparecerán aquí</p>
      </div>
    </div>
  )
}

// ─── Left Panel — Supplier List ───────────────────────────────────────────────

function SupplierList({
  selected,
  onSelect,
}: {
  selected: Supplier | null
  onSelect: (s: Supplier) => void
}) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showNewDialog, setShowNewDialog] = useState(false)
  const qc = useQueryClient()

  function handleSearchChange(value: string) {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), 300)
  }

  const { data, isLoading } = useQuery<PageResponse<Supplier>>({
    queryKey: ['purchasing-suppliers', debouncedSearch],
    queryFn: () =>
      apiClient
        .get<PageResponse<Supplier>>('/purchasing/suppliers', {
          params: { search: debouncedSearch || undefined, size: 100 },
        })
        .then(r => r.data),
  })

  const suppliers = data?.content ?? []

  function handleCreated() {
    qc.invalidateQueries({ queryKey: ['purchasing-suppliers'] })
  }

  return (
    <div className="flex w-[300px] shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-gray-100 bg-[#f7f8fa] pl-5 pr-5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#fbbf24]/10">
          <ShoppingCart size={14} className="text-[#fbbf24]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-[#374151]">Proveedores</p>
          <p className="text-[11px] text-slate-400">{suppliers.length} registros</p>
        </div>
      </div>

      <div className="shrink-0 border-b border-gray-100 px-4 py-2.5">
        <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-[#f7f8fa] px-3 py-2 transition focus-within:border-[#fbbf24] focus-within:bg-white">
          <Search size={12} className="shrink-0 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, código o ciudad..."
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-[13px] text-slate-700 placeholder-slate-400 focus:outline-none"
          />
        </label>
      </div>

      <div className="shrink-0 border-b border-gray-100 px-4 py-2">
        <button
          onClick={() => setShowNewDialog(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-200 py-2 text-[12px] font-semibold text-[#fbbf24] transition hover:border-[#fbbf24] hover:bg-[#fbbf24]/5"
        >
          <Plus size={12} />
          Nuevo Proveedor
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
        {isLoading ? (
          <div className="flex h-28 items-center justify-center"><Spinner /></div>
        ) : suppliers.length === 0 ? (
          <div className="flex h-28 flex-col items-center justify-center gap-2">
            <Search size={20} strokeWidth={1.2} className="text-slate-200" />
            <p className="text-[13px] text-slate-300">Sin resultados</p>
          </div>
        ) : (
          suppliers.map(s => {
            const isSel = selected?.id === s.id
            return (
              <div
                key={s.id}
                onClick={() => onSelect(s)}
                className={cn(
                  'group relative flex cursor-pointer flex-col gap-1 border-b border-gray-50 px-5 py-3 transition-colors duration-100',
                  isSel ? 'bg-[#fbbf24]/8' : 'hover:bg-[#fafafa]',
                )}
              >
                {isSel && <span className="absolute inset-y-0 left-0 w-0.5 rounded-r bg-[#fbbf24]" />}

                <div className="flex items-center gap-2">
                  <span className={cn(
                    'shrink-0 rounded-md px-2 py-0.5 font-mono text-[11px] font-bold',
                    isSel ? 'bg-[#fbbf24]/12 text-[#d97706]' : 'bg-slate-100 text-slate-500',
                  )}>
                    {s.code}
                  </span>
                  <span className={cn(
                    'min-w-0 flex-1 truncate text-[13px] leading-snug',
                    isSel ? 'font-semibold text-[#92400e]' : 'font-medium text-[#374151]',
                  )}>
                    {s.name}
                  </span>
                </div>

                {s.city && (
                  <p className="pl-0.5 text-[11px] text-slate-400">{s.city}</p>
                )}
              </div>
            )
          })
        )}
      </div>

      <NewSupplierDialog
        open={showNewDialog}
        onClose={() => setShowNewDialog(false)}
        onCreated={handleCreated}
      />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function PurchasingPage() {
  const [selected, setSelected] = useState<Supplier | null>(null)

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#f7f8fa]">
      <header className="relative flex h-12 shrink-0 items-center border-b border-gray-200 bg-white px-6">
        <span className="absolute inset-x-0 top-0 h-[3px] bg-[#fbbf24]" />
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
          <span className="text-sm text-slate-400">Compras</span>
          {selected && (
            <>
              <span className="text-slate-300">/</span>
              <span className="text-sm font-semibold text-[#d97706]">{selected.code}</span>
            </>
          )}
        </div>
      </header>

      <div className="flex shrink-0 items-center gap-4 px-6 py-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#fbbf24]/10">
          <ShoppingCart size={20} className="text-[#fbbf24]" />
        </div>
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-[#111827]">Compras</h1>
          <p className="mt-0.5 text-[13px] text-slate-400">Proveedores, cotizaciones y comparativas de precios</p>
        </div>
      </div>

      <div className="mx-6 mb-6 flex min-h-0 flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <SupplierList selected={selected} onSelect={setSelected} />

        {selected ? (
          <DetailPanel supplier={selected} />
        ) : (
          <EmptyPanel />
        )}
      </div>
    </div>
  )
}
