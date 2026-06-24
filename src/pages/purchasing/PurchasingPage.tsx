import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShoppingCart, Search, Plus, X, FileText, Truck, Receipt } from 'lucide-react'
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
  PurchaseOrderResponse,
  PurchaseOrderStatus,
  PurchaseOrderRequest,
  DeliveryNoteResponse,
  DeliveryNoteStatus,
  SupplierInvoiceResponse,
  InvoiceType,
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

// ─── Purchase Orders Status Badge ─────────────────────────────────────────────

const ORDER_STATUS_LABEL: Record<PurchaseOrderStatus, string> = {
  DRAFT: 'Borrador',
  ISSUED: 'Emitida',
  SENT: 'Enviada',
  RECEIVED: 'Recibida',
  CANCELLED: 'Cancelada',
}

const ORDER_STATUS_CLASS: Record<PurchaseOrderStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-500',
  ISSUED: 'bg-blue-50 text-blue-600',
  SENT: 'bg-amber-50 text-amber-600',
  RECEIVED: 'bg-emerald-50 text-emerald-600',
  CANCELLED: 'bg-red-50 text-red-500',
}

// ─── New Purchase Order Dialog ────────────────────────────────────────────────

function NewOrderDialog({ open, onClose, onCreated }: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const [supplierId, setSupplierId] = useState('')
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10))
  const [currency, setCurrency] = useState('ARS')
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('')
  const [lines, setLines] = useState([{ itemId: '', orderedQuantity: '1', unitPrice: '', currency: 'ARS' }])
  const [error, setError] = useState<string | null>(null)
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: (req: PurchaseOrderRequest) =>
      apiClient.post<PurchaseOrderResponse>('/purchasing/orders', req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] })
      setSupplierId(''); setOrderDate(new Date().toISOString().slice(0, 10)); setCurrency('ARS')
      setExpectedDeliveryDate(''); setLines([{ itemId: '', orderedQuantity: '1', unitPrice: '', currency: 'ARS' }])
      setError(null); onCreated(); onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'No se pudo crear la orden.')
    },
  })

  function addLine() { setLines(prev => [...prev, { itemId: '', orderedQuantity: '1', unitPrice: '', currency: 'ARS' }]) }
  function removeLine(i: number) { setLines(prev => prev.filter((_, idx) => idx !== i)) }
  function updateLine(i: number, field: string, val: string) { setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: val } : l)) }

  function handleSubmit() {
    setError(null)
    if (!supplierId) { setError('El ID de proveedor es requerido.'); return }
    for (const l of lines) {
      if (!l.itemId || !l.unitPrice) { setError('Completá todos los ítems.'); return }
    }
    const req: PurchaseOrderRequest = {
      supplierId: Number(supplierId),
      orderDate,
      currency,
      expectedDeliveryDate: expectedDeliveryDate || undefined,
      lines: lines.map(l => ({
        itemId: Number(l.itemId),
        orderedQuantity: Number(l.orderedQuantity) || 1,
        unitPrice: Number(l.unitPrice),
        currency: l.currency,
      })),
    }
    mutation.mutate(req)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative w-[560px] max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
          <div>
            <p className="text-[14px] font-semibold text-[#111827]">Nueva Orden de Compra</p>
            <p className="text-[12px] text-slate-400">Completá los datos de la orden</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 text-slate-400 transition hover:bg-gray-100 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>
        <div className="flex flex-col gap-4 px-6 py-5">
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">ID Proveedor *</label>
              <input type="number" value={supplierId} onChange={e => setSupplierId(e.target.value)} placeholder="ID del proveedor"
                className="rounded-xl border border-gray-200 bg-[#f7f8fa] px-4 py-2.5 text-[14px] text-[#374151] placeholder-slate-300 outline-none transition focus:border-[#fbbf24] focus:bg-white" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">Moneda</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)}
                className="rounded-xl border border-gray-200 bg-[#f7f8fa] px-3 py-2.5 text-[14px] text-[#374151] outline-none transition focus:border-[#fbbf24] focus:bg-white">
                <option>ARS</option><option>USD</option><option>EUR</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">Fecha Orden</label>
              <input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)}
                className="rounded-xl border border-gray-200 bg-[#f7f8fa] px-4 py-2.5 text-[14px] text-[#374151] outline-none transition focus:border-[#fbbf24] focus:bg-white" />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">Fecha Entrega</label>
              <input type="date" value={expectedDeliveryDate} onChange={e => setExpectedDeliveryDate(e.target.value)}
                className="rounded-xl border border-gray-200 bg-[#f7f8fa] px-4 py-2.5 text-[14px] text-[#374151] outline-none transition focus:border-[#fbbf24] focus:bg-white" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">Líneas</label>
              <button type="button" onClick={addLine} className="flex items-center gap-1 text-[12px] font-semibold text-[#fbbf24] hover:text-[#f59e0b]">
                <Plus size={12} /> Agregar línea
              </button>
            </div>
            {lines.map((l, i) => (
              <div key={i} className="flex gap-2 rounded-xl border border-gray-100 bg-[#f7f8fa] p-3">
                <div className="flex flex-1 flex-col gap-1">
                  <label className="text-[11px] text-slate-400">ID Artículo</label>
                  <input type="number" value={l.itemId} onChange={e => updateLine(i, 'itemId', e.target.value)} placeholder="ID"
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-[#fbbf24]" />
                </div>
                <div className="flex flex-col gap-1" style={{ width: 72 }}>
                  <label className="text-[11px] text-slate-400">Cant.</label>
                  <input type="number" step="0.001" value={l.orderedQuantity} onChange={e => updateLine(i, 'orderedQuantity', e.target.value)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-[#fbbf24]" />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <label className="text-[11px] text-slate-400">Precio Unit.</label>
                  <input type="number" step="0.0001" value={l.unitPrice} onChange={e => updateLine(i, 'unitPrice', e.target.value)} placeholder="0.00"
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-[#fbbf24]" />
                </div>
                <div className="flex flex-col gap-1" style={{ width: 70 }}>
                  <label className="text-[11px] text-slate-400">Moneda</label>
                  <select value={l.currency} onChange={e => updateLine(i, 'currency', e.target.value)}
                    className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-[13px] outline-none focus:border-[#fbbf24]">
                    <option>ARS</option><option>USD</option><option>EUR</option>
                  </select>
                </div>
                {lines.length > 1 && (
                  <button type="button" onClick={() => removeLine(i)} className="mt-auto rounded-lg p-2 text-slate-300 hover:bg-red-50 hover:text-red-400">
                    <X size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">{error}</div>}
        </div>
        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-gray-100 bg-white px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2 text-[13px] font-medium text-slate-500 hover:border-gray-300">Cancelar</button>
          <button type="button" onClick={handleSubmit} disabled={mutation.isPending}
            className="flex items-center gap-2 rounded-xl bg-[#fbbf24] px-5 py-2 text-[13px] font-semibold text-white hover:bg-[#f59e0b] disabled:opacity-50">
            {mutation.isPending ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Creando...</> : 'Crear OC'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Purchase Orders Tab ──────────────────────────────────────────────────────

function PurchaseOrdersTab() {
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<{ content: PurchaseOrderResponse[] }>({
    queryKey: ['purchase-orders', statusFilter],
    queryFn: () =>
      apiClient.get('/purchasing/orders', {
        params: { status: statusFilter === 'ALL' ? undefined : statusFilter, size: 50 },
      }).then(r => r.data),
  })

  const orders = data?.content ?? []

  const issueMutation = useMutation({
    mutationFn: (id: number) => apiClient.patch(`/purchasing/orders/${id}/issue`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchase-orders'] }),
  })

  const cancelMutation = useMutation({
    mutationFn: (id: number) => apiClient.patch(`/purchasing/orders/${id}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchase-orders'] }),
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">Estado</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="rounded-xl border border-gray-200 bg-[#f7f8fa] px-3 py-2 text-[13px] text-[#374151] outline-none transition focus:border-[#fbbf24] focus:bg-white">
            <option value="ALL">Todos</option>
            <option value="DRAFT">Borrador</option>
            <option value="ISSUED">Emitida</option>
            <option value="SENT">Enviada</option>
            <option value="RECEIVED">Recibida</option>
            <option value="CANCELLED">Cancelada</option>
          </select>
        </div>
        <button onClick={() => setShowNewDialog(true)}
          className="flex items-center gap-2 rounded-xl bg-[#fbbf24] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#f59e0b]">
          <Plus size={13} /> Nueva OC
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center"><Spinner /></div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-slate-300">
          <FileText size={28} strokeWidth={1.2} />
          <p className="text-[13px]">Sin órdenes de compra</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-100">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-gray-100 bg-[#f7f8fa]">
                <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">N° OC</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Proveedor</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Fecha</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Entrega</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Estado</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <>
                  <tr key={o.id} onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}
                    className="cursor-pointer border-b border-gray-50 hover:bg-[#fafafa]">
                    <td className="px-4 py-3 font-mono text-[12px] font-bold text-[#d97706]">#{o.orderNumber}</td>
                    <td className="px-3 py-3">
                      <span className="font-mono text-[12px] text-slate-500">{o.supplierCode}</span>
                      <span className="ml-2 text-slate-700">{o.supplierName}</span>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{o.orderDate}</td>
                    <td className="px-3 py-3 text-slate-500">{o.expectedDeliveryDate ?? '—'}</td>
                    <td className="px-3 py-3">
                      <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-bold', ORDER_STATUS_CLASS[o.status])}>
                        {ORDER_STATUS_LABEL[o.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                        {o.status === 'DRAFT' && (
                          <button onClick={() => issueMutation.mutate(o.id)}
                            className="rounded-lg bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-100">
                            Emitir
                          </button>
                        )}
                        {(o.status === 'DRAFT' || o.status === 'ISSUED') && (
                          <button onClick={() => cancelMutation.mutate(o.id)}
                            className="rounded-lg bg-red-50 px-3 py-1 text-[11px] font-semibold text-red-500 hover:bg-red-100">
                            Cancelar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedId === o.id && o.lines.length > 0 && (
                    <tr key={`${o.id}-lines`} className="border-b border-gray-50 bg-[#fafafa]">
                      <td colSpan={6} className="px-6 pb-4 pt-2">
                        <div className="overflow-hidden rounded-xl border border-gray-100">
                          <table className="w-full text-[12px]">
                            <thead>
                              <tr className="border-b border-gray-100 bg-white">
                                <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Artículo</th>
                                <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">Cant.</th>
                                <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">Precio</th>
                                <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Moneda</th>
                              </tr>
                            </thead>
                            <tbody>
                              {o.lines.map(l => (
                                <tr key={l.id} className="border-b border-gray-50">
                                  <td className="px-3 py-2">
                                    <span className="font-mono text-[11px] text-slate-400">{l.itemCode}</span>
                                    <span className="ml-2 text-slate-700">{l.itemName}</span>
                                  </td>
                                  <td className="px-3 py-2 text-right text-slate-600">{l.orderedQuantity}</td>
                                  <td className="px-3 py-2 text-right font-mono text-slate-600">{Number(l.unitPrice).toFixed(4)}</td>
                                  <td className="px-3 py-2 text-slate-500">{l.currency}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <NewOrderDialog open={showNewDialog} onClose={() => setShowNewDialog(false)} onCreated={() => {}} />
    </div>
  )
}

// ─── Delivery Note Status Badge ───────────────────────────────────────────────

const NOTE_STATUS_LABEL: Record<DeliveryNoteStatus, string> = { OPEN: 'Abierto', CLOSED: 'Cerrado' }
const NOTE_STATUS_CLASS: Record<DeliveryNoteStatus, string> = { OPEN: 'bg-amber-50 text-amber-600', CLOSED: 'bg-emerald-50 text-emerald-600' }

// ─── New Delivery Note Dialog ─────────────────────────────────────────────────

function NewDeliveryNoteDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [noteNumber, setNoteNumber] = useState('')
  const [noteDate, setNoteDate] = useState(new Date().toISOString().slice(0, 10))
  const [supplierId, setSupplierId] = useState('')
  const [purchaseOrderId, setPurchaseOrderId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => apiClient.post<DeliveryNoteResponse>('/purchasing/delivery-notes', {
      noteNumber, noteDate, supplierId: Number(supplierId),
      purchaseOrderId: purchaseOrderId ? Number(purchaseOrderId) : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['delivery-notes'] })
      setNoteNumber(''); setNoteDate(new Date().toISOString().slice(0, 10)); setSupplierId(''); setPurchaseOrderId('')
      setError(null); onCreated(); onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'No se pudo crear el remito.')
    },
  })

  function handleSubmit() {
    setError(null)
    if (!noteNumber.trim()) { setError('El número de remito es requerido.'); return }
    if (!supplierId) { setError('El ID de proveedor es requerido.'); return }
    mutation.mutate()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative w-[440px] rounded-2xl border border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <p className="text-[14px] font-semibold text-[#111827]">Nuevo Remito</p>
            <p className="text-[12px] text-slate-400">Registrá el remito del proveedor</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 text-slate-400 hover:bg-gray-100 hover:text-slate-600"><X size={16} /></button>
        </div>
        <div className="flex flex-col gap-3 px-6 py-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">N° Remito *</label>
            <input type="text" value={noteNumber} onChange={e => setNoteNumber(e.target.value)} placeholder="Ej: R-0001-00001234"
              className="rounded-xl border border-gray-200 bg-[#f7f8fa] px-4 py-2.5 text-[14px] text-[#374151] placeholder-slate-300 outline-none focus:border-[#fbbf24] focus:bg-white" />
          </div>
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">Fecha</label>
              <input type="date" value={noteDate} onChange={e => setNoteDate(e.target.value)}
                className="rounded-xl border border-gray-200 bg-[#f7f8fa] px-4 py-2.5 text-[14px] text-[#374151] outline-none focus:border-[#fbbf24] focus:bg-white" />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">ID Proveedor *</label>
              <input type="number" value={supplierId} onChange={e => setSupplierId(e.target.value)} placeholder="ID"
                className="rounded-xl border border-gray-200 bg-[#f7f8fa] px-4 py-2.5 text-[14px] text-[#374151] placeholder-slate-300 outline-none focus:border-[#fbbf24] focus:bg-white" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">OC Asociada (opcional)</label>
            <input type="number" value={purchaseOrderId} onChange={e => setPurchaseOrderId(e.target.value)} placeholder="ID de la orden de compra"
              className="rounded-xl border border-gray-200 bg-[#f7f8fa] px-4 py-2.5 text-[14px] text-[#374151] placeholder-slate-300 outline-none focus:border-[#fbbf24] focus:bg-white" />
          </div>
          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">{error}</div>}
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2 text-[13px] font-medium text-slate-500 hover:border-gray-300">Cancelar</button>
          <button type="button" onClick={handleSubmit} disabled={mutation.isPending}
            className="flex items-center gap-2 rounded-xl bg-[#fbbf24] px-5 py-2 text-[13px] font-semibold text-white hover:bg-[#f59e0b] disabled:opacity-50">
            {mutation.isPending ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Creando...</> : 'Crear Remito'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Add Note Line Dialog ─────────────────────────────────────────────────────

function AddNoteLineDialog({ open, noteId, onClose, onCreated }: { open: boolean; noteId: number; onClose: () => void; onCreated: () => void }) {
  const [itemId, setItemId] = useState('')
  const [statedQty, setStatedQty] = useState('')
  const [verifiedQty, setVerifiedQty] = useState('')
  const [error, setError] = useState<string | null>(null)
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => apiClient.post(`/purchasing/delivery-notes/${noteId}/lines`, {
      itemId: Number(itemId), statedQuantity: Number(statedQty), verifiedQuantity: Number(verifiedQty),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['delivery-notes'] })
      setItemId(''); setStatedQty(''); setVerifiedQty(''); setError(null); onCreated(); onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'No se pudo agregar la línea.')
    },
  })

  function handleSubmit() {
    setError(null)
    if (!itemId || !statedQty || !verifiedQty) { setError('Todos los campos son requeridos.'); return }
    mutation.mutate()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative w-[400px] rounded-2xl border border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <p className="text-[14px] font-semibold text-[#111827]">Agregar Línea al Remito</p>
          <button onClick={onClose} className="rounded-xl p-1.5 text-slate-400 hover:bg-gray-100"><X size={16} /></button>
        </div>
        <div className="flex flex-col gap-3 px-6 py-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">ID Artículo *</label>
            <input type="number" value={itemId} onChange={e => setItemId(e.target.value)} placeholder="ID"
              className="rounded-xl border border-gray-200 bg-[#f7f8fa] px-4 py-2.5 text-[14px] outline-none focus:border-[#fbbf24] focus:bg-white" />
          </div>
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">Cant. Declarada</label>
              <input type="number" step="0.001" value={statedQty} onChange={e => setStatedQty(e.target.value)}
                className="rounded-xl border border-gray-200 bg-[#f7f8fa] px-4 py-2.5 text-[14px] outline-none focus:border-[#fbbf24] focus:bg-white" />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">Cant. Verificada</label>
              <input type="number" step="0.001" value={verifiedQty} onChange={e => setVerifiedQty(e.target.value)}
                className="rounded-xl border border-gray-200 bg-[#f7f8fa] px-4 py-2.5 text-[14px] outline-none focus:border-[#fbbf24] focus:bg-white" />
            </div>
          </div>
          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">{error}</div>}
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2 text-[13px] font-medium text-slate-500">Cancelar</button>
          <button type="button" onClick={handleSubmit} disabled={mutation.isPending}
            className="flex items-center gap-2 rounded-xl bg-[#fbbf24] px-5 py-2 text-[13px] font-semibold text-white hover:bg-[#f59e0b] disabled:opacity-50">
            {mutation.isPending ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Guardando...</> : 'Agregar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Delivery Notes Tab ───────────────────────────────────────────────────────

function DeliveryNotesTab() {
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [addLineNoteId, setAddLineNoteId] = useState<number | null>(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<{ content: DeliveryNoteResponse[] }>({
    queryKey: ['delivery-notes'],
    queryFn: () => apiClient.get('/purchasing/delivery-notes', { params: { size: 50 } }).then(r => r.data),
  })

  const notes = data?.content ?? []

  const closeMutation = useMutation({
    mutationFn: (id: number) => apiClient.patch(`/purchasing/delivery-notes/${id}/close`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['delivery-notes'] }),
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <button onClick={() => setShowNewDialog(true)}
          className="flex items-center gap-2 rounded-xl bg-[#fbbf24] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#f59e0b]">
          <Plus size={13} /> Nuevo Remito
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center"><Spinner /></div>
      ) : notes.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-slate-300">
          <Truck size={28} strokeWidth={1.2} />
          <p className="text-[13px]">Sin remitos registrados</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-100">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-gray-100 bg-[#f7f8fa]">
                <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">N° Remito</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Proveedor</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Fecha</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Estado</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">OC Asociada</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {notes.map(n => (
                <>
                  <tr key={n.id} onClick={() => setExpandedId(expandedId === n.id ? null : n.id)}
                    className="cursor-pointer border-b border-gray-50 hover:bg-[#fafafa]">
                    <td className="px-4 py-3 font-mono text-[12px] font-semibold text-slate-700">{n.noteNumber}</td>
                    <td className="px-3 py-3">
                      <span className="font-mono text-[12px] text-slate-500">{n.supplierCode}</span>
                      <span className="ml-2 text-slate-700">{n.supplierName}</span>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{n.noteDate}</td>
                    <td className="px-3 py-3">
                      <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-bold', NOTE_STATUS_CLASS[n.status])}>
                        {NOTE_STATUS_LABEL[n.status]}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-mono text-[12px] text-slate-500">{n.purchaseOrderId ? `#${n.purchaseOrderId}` : '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                        {n.status === 'OPEN' && (
                          <>
                            <button onClick={() => setAddLineNoteId(n.id)}
                              className="rounded-lg bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-100">
                              Agregar Línea
                            </button>
                            <button onClick={() => closeMutation.mutate(n.id)}
                              className="rounded-lg bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-600 hover:bg-emerald-100">
                              Cerrar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedId === n.id && n.lines.length > 0 && (
                    <tr key={`${n.id}-lines`} className="border-b border-gray-50 bg-[#fafafa]">
                      <td colSpan={6} className="px-6 pb-4 pt-2">
                        <div className="overflow-hidden rounded-xl border border-gray-100">
                          <table className="w-full text-[12px]">
                            <thead>
                              <tr className="border-b border-gray-100 bg-white">
                                <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Artículo</th>
                                <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">Cant. Declarada</th>
                                <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">Cant. Verificada</th>
                              </tr>
                            </thead>
                            <tbody>
                              {n.lines.map(l => (
                                <tr key={l.id} className="border-b border-gray-50">
                                  <td className="px-3 py-2">
                                    <span className="font-mono text-[11px] text-slate-400">{l.itemCode}</span>
                                    <span className="ml-2 text-slate-700">{l.itemName}</span>
                                  </td>
                                  <td className="px-3 py-2 text-right text-slate-600">{l.statedQuantity}</td>
                                  <td className="px-3 py-2 text-right text-slate-600">{l.verifiedQuantity}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <NewDeliveryNoteDialog open={showNewDialog} onClose={() => setShowNewDialog(false)} onCreated={() => {}} />
      {addLineNoteId != null && (
        <AddNoteLineDialog
          open={true}
          noteId={addLineNoteId}
          onClose={() => setAddLineNoteId(null)}
          onCreated={() => setAddLineNoteId(null)}
        />
      )}
    </div>
  )
}

// ─── Invoice Type Badge ───────────────────────────────────────────────────────

const INVOICE_TYPE_LABEL: Record<InvoiceType, string> = { INVOICE: 'Factura', CREDIT_NOTE: 'NC', DEBIT_NOTE: 'ND' }
const INVOICE_TYPE_CLASS: Record<InvoiceType, string> = {
  INVOICE: 'bg-blue-50 text-blue-600',
  CREDIT_NOTE: 'bg-purple-50 text-purple-600',
  DEBIT_NOTE: 'bg-amber-50 text-amber-600',
}

// ─── New Invoice Dialog ───────────────────────────────────────────────────────

function NewInvoiceDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [supplierId, setSupplierId] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10))
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('INVOICE')
  const [vatAmount21, setVatAmount21] = useState('')
  const [vatAmount10, setVatAmount10] = useState('')
  const [vatAmount27, setVatAmount27] = useState('')
  const [perceptions, setPerceptions] = useState('')
  const [withholdings, setWithholdings] = useState('')
  const [error, setError] = useState<string | null>(null)
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => apiClient.post<SupplierInvoiceResponse>('/purchasing/invoices', {
      supplierId: Number(supplierId), invoiceDate, invoiceType,
      vatAmount21: vatAmount21 ? Number(vatAmount21) : undefined,
      vatAmount10: vatAmount10 ? Number(vatAmount10) : undefined,
      vatAmount27: vatAmount27 ? Number(vatAmount27) : undefined,
      perceptions: perceptions ? Number(perceptions) : undefined,
      withholdings: withholdings ? Number(withholdings) : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplier-invoices'] })
      setSupplierId(''); setInvoiceDate(new Date().toISOString().slice(0, 10)); setInvoiceType('INVOICE')
      setVatAmount21(''); setVatAmount10(''); setVatAmount27(''); setPerceptions(''); setWithholdings('')
      setError(null); onCreated(); onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'No se pudo crear la factura.')
    },
  })

  function handleSubmit() {
    setError(null)
    if (!supplierId) { setError('El ID de proveedor es requerido.'); return }
    mutation.mutate()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative w-[500px] rounded-2xl border border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <p className="text-[14px] font-semibold text-[#111827]">Nueva Factura</p>
            <p className="text-[12px] text-slate-400">Registrá la factura del proveedor</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 text-slate-400 hover:bg-gray-100"><X size={16} /></button>
        </div>
        <div className="flex flex-col gap-3 px-6 py-5">
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">ID Proveedor *</label>
              <input type="number" value={supplierId} onChange={e => setSupplierId(e.target.value)} placeholder="ID"
                className="rounded-xl border border-gray-200 bg-[#f7f8fa] px-4 py-2.5 text-[14px] outline-none focus:border-[#fbbf24] focus:bg-white" />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">Tipo</label>
              <select value={invoiceType} onChange={e => setInvoiceType(e.target.value as InvoiceType)}
                className="rounded-xl border border-gray-200 bg-[#f7f8fa] px-3 py-2.5 text-[14px] outline-none focus:border-[#fbbf24] focus:bg-white">
                <option value="INVOICE">Factura</option>
                <option value="CREDIT_NOTE">Nota de Crédito</option>
                <option value="DEBIT_NOTE">Nota de Débito</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">Fecha</label>
            <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)}
              className="rounded-xl border border-gray-200 bg-[#f7f8fa] px-4 py-2.5 text-[14px] outline-none focus:border-[#fbbf24] focus:bg-white" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'IVA 21%', value: vatAmount21, set: setVatAmount21 },
              { label: 'IVA 10.5%', value: vatAmount10, set: setVatAmount10 },
              { label: 'IVA 27%', value: vatAmount27, set: setVatAmount27 },
            ].map(f => (
              <div key={f.label} className="flex flex-col gap-1.5">
                <label className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">{f.label}</label>
                <input type="number" step="0.01" value={f.value} onChange={e => f.set(e.target.value)} placeholder="0.00"
                  className="rounded-xl border border-gray-200 bg-[#f7f8fa] px-4 py-2.5 text-[14px] outline-none focus:border-[#fbbf24] focus:bg-white" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Percepciones', value: perceptions, set: setPerceptions },
              { label: 'Retenciones', value: withholdings, set: setWithholdings },
            ].map(f => (
              <div key={f.label} className="flex flex-col gap-1.5">
                <label className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">{f.label}</label>
                <input type="number" step="0.01" value={f.value} onChange={e => f.set(e.target.value)} placeholder="0.00"
                  className="rounded-xl border border-gray-200 bg-[#f7f8fa] px-4 py-2.5 text-[14px] outline-none focus:border-[#fbbf24] focus:bg-white" />
              </div>
            ))}
          </div>
          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">{error}</div>}
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2 text-[13px] font-medium text-slate-500">Cancelar</button>
          <button type="button" onClick={handleSubmit} disabled={mutation.isPending}
            className="flex items-center gap-2 rounded-xl bg-[#fbbf24] px-5 py-2 text-[13px] font-semibold text-white hover:bg-[#f59e0b] disabled:opacity-50">
            {mutation.isPending ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Creando...</> : 'Crear Factura'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Add Invoice Line Dialog ──────────────────────────────────────────────────

function AddInvoiceLineDialog({ open, invoiceId, onClose, onCreated }: { open: boolean; invoiceId: number; onClose: () => void; onCreated: () => void }) {
  const [itemId, setItemId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [vatRate, setVatRate] = useState('21')
  const [error, setError] = useState<string | null>(null)
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => apiClient.post(`/purchasing/invoices/${invoiceId}/lines`, {
      itemId: Number(itemId), quantity: Number(quantity), unitPrice: Number(unitPrice), vatRate: Number(vatRate),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['supplier-invoices'] })
      setItemId(''); setQuantity(''); setUnitPrice(''); setVatRate('21'); setError(null); onCreated(); onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'No se pudo agregar la línea.')
    },
  })

  function handleSubmit() {
    setError(null)
    if (!itemId || !quantity || !unitPrice) { setError('Todos los campos son requeridos.'); return }
    mutation.mutate()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative w-[400px] rounded-2xl border border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <p className="text-[14px] font-semibold text-[#111827]">Agregar Línea a Factura</p>
          <button onClick={onClose} className="rounded-xl p-1.5 text-slate-400 hover:bg-gray-100"><X size={16} /></button>
        </div>
        <div className="flex flex-col gap-3 px-6 py-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">ID Artículo *</label>
            <input type="number" value={itemId} onChange={e => setItemId(e.target.value)}
              className="rounded-xl border border-gray-200 bg-[#f7f8fa] px-4 py-2.5 text-[14px] outline-none focus:border-[#fbbf24] focus:bg-white" />
          </div>
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">Cantidad</label>
              <input type="number" step="0.001" value={quantity} onChange={e => setQuantity(e.target.value)}
                className="rounded-xl border border-gray-200 bg-[#f7f8fa] px-4 py-2.5 text-[14px] outline-none focus:border-[#fbbf24] focus:bg-white" />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">Precio Unit.</label>
              <input type="number" step="0.0001" value={unitPrice} onChange={e => setUnitPrice(e.target.value)}
                className="rounded-xl border border-gray-200 bg-[#f7f8fa] px-4 py-2.5 text-[14px] outline-none focus:border-[#fbbf24] focus:bg-white" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">IVA %</label>
              <select value={vatRate} onChange={e => setVatRate(e.target.value)}
                className="rounded-xl border border-gray-200 bg-[#f7f8fa] px-3 py-2.5 text-[14px] outline-none focus:border-[#fbbf24] focus:bg-white">
                <option value="21">21</option>
                <option value="10.5">10.5</option>
                <option value="27">27</option>
                <option value="0">0</option>
              </select>
            </div>
          </div>
          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">{error}</div>}
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2 text-[13px] font-medium text-slate-500">Cancelar</button>
          <button type="button" onClick={handleSubmit} disabled={mutation.isPending}
            className="flex items-center gap-2 rounded-xl bg-[#fbbf24] px-5 py-2 text-[13px] font-semibold text-white hover:bg-[#f59e0b] disabled:opacity-50">
            {mutation.isPending ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Guardando...</> : 'Agregar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Invoices Tab ─────────────────────────────────────────────────────────────

function InvoicesTab() {
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [addLineInvoiceId, setAddLineInvoiceId] = useState<number | null>(null)
  const [confirmPostId, setConfirmPostId] = useState<number | null>(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<{ content: SupplierInvoiceResponse[] }>({
    queryKey: ['supplier-invoices'],
    queryFn: () => apiClient.get('/purchasing/invoices', { params: { size: 50 } }).then(r => r.data),
  })

  const invoices = data?.content ?? []

  const postMutation = useMutation({
    mutationFn: (id: number) => apiClient.patch(`/purchasing/invoices/${id}/post`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['supplier-invoices'] }); setConfirmPostId(null) },
  })

  const totalVat = (inv: SupplierInvoiceResponse) =>
    Number(inv.vatAmount21) + Number(inv.vatAmount10) + Number(inv.vatAmount27)

  return (
    <div className="flex flex-col gap-4">
      {/* Confirm post dialog */}
      {confirmPostId != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[360px] rounded-2xl border border-gray-200 bg-white shadow-xl p-6">
            <p className="text-[15px] font-semibold text-[#111827]">¿Confirmar contabilización?</p>
            <p className="mt-2 text-[13px] text-slate-500">Esta acción es irreversible. ¿Confirmás?</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setConfirmPostId(null)} className="rounded-xl border border-gray-200 px-4 py-2 text-[13px] text-slate-500">Cancelar</button>
              <button onClick={() => postMutation.mutate(confirmPostId!)} disabled={postMutation.isPending}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                Contabilizar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end">
        <button onClick={() => setShowNewDialog(true)}
          className="flex items-center gap-2 rounded-xl bg-[#fbbf24] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#f59e0b]">
          <Plus size={13} /> Nueva Factura
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center"><Spinner /></div>
      ) : invoices.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-slate-300">
          <Receipt size={28} strokeWidth={1.2} />
          <p className="text-[13px]">Sin facturas registradas</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-100">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-gray-100 bg-[#f7f8fa]">
                <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Proveedor</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Fecha</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Tipo</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">IVA 21%</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">Total IVA</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Estado</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <>
                  <tr key={inv.id} onClick={() => setExpandedId(expandedId === inv.id ? null : inv.id)}
                    className="cursor-pointer border-b border-gray-50 hover:bg-[#fafafa]">
                    <td className="px-4 py-3">
                      <span className="font-mono text-[12px] text-slate-500">{inv.supplierCode}</span>
                      <span className="ml-2 text-slate-700">{inv.supplierName}</span>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{inv.invoiceDate}</td>
                    <td className="px-3 py-3">
                      <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-bold', INVOICE_TYPE_CLASS[inv.invoiceType])}>
                        {INVOICE_TYPE_LABEL[inv.invoiceType]}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-slate-600">{Number(inv.vatAmount21).toFixed(2)}</td>
                    <td className="px-3 py-3 text-right font-mono font-semibold text-[#374151]">{totalVat(inv).toFixed(2)}</td>
                    <td className="px-3 py-3">
                      <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-bold',
                        inv.posted ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500')}>
                        {inv.posted ? 'Contabilizada' : 'Borrador'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                        {!inv.posted && (
                          <>
                            <button onClick={() => setAddLineInvoiceId(inv.id)}
                              className="rounded-lg bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-100">
                              Agregar Línea
                            </button>
                            <button onClick={() => setConfirmPostId(inv.id)}
                              className="rounded-lg bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-600 hover:bg-emerald-100">
                              Contabilizar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedId === inv.id && inv.lines.length > 0 && (
                    <tr key={`${inv.id}-lines`} className="border-b border-gray-50 bg-[#fafafa]">
                      <td colSpan={7} className="px-6 pb-4 pt-2">
                        <div className="overflow-hidden rounded-xl border border-gray-100">
                          <table className="w-full text-[12px]">
                            <thead>
                              <tr className="border-b border-gray-100 bg-white">
                                <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Artículo</th>
                                <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">Cant.</th>
                                <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">Precio</th>
                                <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">IVA %</th>
                                <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">Monto IVA</th>
                                <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {inv.lines.map(l => (
                                <tr key={l.id} className="border-b border-gray-50">
                                  <td className="px-3 py-2">
                                    <span className="font-mono text-[11px] text-slate-400">{l.itemCode}</span>
                                    <span className="ml-2 text-slate-700">{l.itemName}</span>
                                  </td>
                                  <td className="px-3 py-2 text-right text-slate-600">{l.quantity}</td>
                                  <td className="px-3 py-2 text-right font-mono text-slate-600">{Number(l.unitPrice).toFixed(4)}</td>
                                  <td className="px-3 py-2 text-right text-slate-500">{l.vatRate}%</td>
                                  <td className="px-3 py-2 text-right font-mono text-slate-600">{Number(l.vatAmount).toFixed(2)}</td>
                                  <td className="px-3 py-2 text-right font-mono font-semibold text-[#374151]">{Number(l.lineTotal).toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <NewInvoiceDialog open={showNewDialog} onClose={() => setShowNewDialog(false)} onCreated={() => {}} />
      {addLineInvoiceId != null && (
        <AddInvoiceLineDialog
          open={true}
          invoiceId={addLineInvoiceId}
          onClose={() => setAddLineInvoiceId(null)}
          onCreated={() => setAddLineInvoiceId(null)}
        />
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type TopTab = 'proveedores' | 'ordenes' | 'remitos' | 'facturas'

const TOP_TAB_LABELS: Record<TopTab, string> = {
  proveedores: 'Proveedores',
  ordenes: 'Órdenes de Compra',
  remitos: 'Remitos',
  facturas: 'Facturas',
}

export function PurchasingPage() {
  const [selected, setSelected] = useState<Supplier | null>(null)
  const [topTab, setTopTab] = useState<TopTab>('proveedores')

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#f7f8fa]">
      <header className="relative flex h-12 shrink-0 items-center border-b border-gray-200 bg-white px-6">
        <span className="absolute inset-x-0 top-0 h-[3px] bg-[#fbbf24]" />
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
          <span className="text-sm text-slate-400">Compras</span>
          {topTab !== 'proveedores' && (
            <>
              <span className="text-slate-300">/</span>
              <span className="text-sm font-semibold text-[#d97706]">{TOP_TAB_LABELS[topTab]}</span>
            </>
          )}
          {topTab === 'proveedores' && selected && (
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
          <p className="mt-0.5 text-[13px] text-slate-400">Proveedores, cotizaciones, órdenes de compra y facturas</p>
        </div>
      </div>

      {/* Top-level tab bar */}
      <div className="mx-6 mb-2 flex gap-1 border-b border-gray-200">
        {(['proveedores', 'ordenes', 'remitos', 'facturas'] as TopTab[]).map(t => (
          <button
            key={t}
            onClick={() => setTopTab(t)}
            className={cn(
              'flex items-center gap-2 px-4 pb-3 pt-1 text-[13px] font-semibold transition',
              topTab === t
                ? 'border-b-2 border-[#fbbf24] text-[#d97706]'
                : 'text-slate-400 hover:text-slate-600',
            )}
          >
            {t === 'proveedores' && <ShoppingCart size={13} />}
            {t === 'ordenes' && <FileText size={13} />}
            {t === 'remitos' && <Truck size={13} />}
            {t === 'facturas' && <Receipt size={13} />}
            {TOP_TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {topTab === 'proveedores' && (
        <div className="mx-6 mb-6 flex min-h-0 flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <SupplierList selected={selected} onSelect={setSelected} />
          {selected ? <DetailPanel supplier={selected} /> : <EmptyPanel />}
        </div>
      )}

      {topTab === 'ordenes' && (
        <div className="mx-6 mb-6 min-h-0 flex-1 overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <PurchaseOrdersTab />
        </div>
      )}

      {topTab === 'remitos' && (
        <div className="mx-6 mb-6 min-h-0 flex-1 overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <DeliveryNotesTab />
        </div>
      )}

      {topTab === 'facturas' && (
        <div className="mx-6 mb-6 min-h-0 flex-1 overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <InvoicesTab />
        </div>
      )}
    </div>
  )
}
