import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShoppingBag, Search, Plus, X, FileText, Package } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import type {
  Customer,
  CustomerRequest,
  SalesQuote,
  SalesQuoteRequest,
  SalesQuoteLineRequest,
  TaxRate,
  PageResponse,
  SalesOrderResponse,
  SalesOrderStatus,
  SalesOrderStockCrossReferenceRequest,
  StockMovementResponse,
  SalesOrderLineResponse,
  SalesOrderStockTransferRequest,
  StockTransferCandidateResponse,
} from '@/types/api.types'

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#fbbf24] border-t-transparent" />
  )
}

// ─── New Customer Dialog ──────────────────────────────────────────────────────

function NewCustomerDialog({ open, onClose, onCreated }: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [cuit, setCuit] = useState('')
  const [email, setEmail] = useState('')
  const [taxCategory, setTaxCategory] = useState('')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (req: CustomerRequest) =>
      apiClient.post<Customer>('/sales/customers', req),
    onSuccess: () => {
      setCode(''); setName(''); setCuit(''); setEmail(''); setTaxCategory('')
      setError(null)
      onCreated()
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'No se pudo crear el cliente.')
    },
  })

  function handleSubmit() {
    setError(null)
    if (!code.trim()) { setError('El código es requerido.'); return }
    if (!name.trim()) { setError('El nombre es requerido.'); return }
    mutation.mutate({
      code: code.trim(),
      name: name.trim(),
      cuit: cuit.trim() || undefined,
      email: email.trim() || undefined,
      taxCategory: taxCategory.trim() || undefined,
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative w-[440px] rounded-2xl border border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fbbf24]/10">
              <ShoppingBag size={16} className="text-[#fbbf24]" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-[#111827]">Nuevo Cliente</p>
              <p className="text-[12px] text-slate-400">Completá los datos básicos del cliente</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 text-slate-400 transition hover:bg-gray-100 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-6 py-5">
          {[
            { label: 'Código', value: code, onChange: setCode, placeholder: 'Ej: C001' },
            { label: 'Nombre', value: name, onChange: setName, placeholder: 'Razón social del cliente' },
            { label: 'CUIT', value: cuit, onChange: setCuit, placeholder: '20-12345678-1' },
            { label: 'Categoría Fiscal', value: taxCategory, onChange: setTaxCategory, placeholder: 'RESPONSABLE_INSCRIPTO' },
            { label: 'Email', value: email, onChange: setEmail, placeholder: 'contacto@cliente.com' },
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
          <button type="button" onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2 text-[13px] font-medium text-slate-500 transition hover:border-gray-300">
            Cancelar
          </button>
          <button type="button" onClick={handleSubmit} disabled={mutation.isPending}
            className="flex items-center gap-2 rounded-xl bg-[#fbbf24] px-5 py-2 text-[13px] font-semibold text-white transition hover:bg-[#f59e0b] disabled:opacity-50">
            {mutation.isPending
              ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Creando...</>
              : 'Crear Cliente'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── New Quote Dialog ─────────────────────────────────────────────────────────

function NewQuoteDialog({ open, customer, onClose, onCreated }: {
  open: boolean
  customer: Customer
  onClose: () => void
  onCreated: () => void
}) {
  const [currency, setCurrency] = useState('ARS')
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().slice(0, 10))
  const [ivaRateValue, setIvaRateValue] = useState('')
  const [perceptionRateValue, setPerceptionRateValue] = useState('')
  const [comments, setComments] = useState('')
  const [lines, setLines] = useState<Array<{
    itemId: string
    quantity: string
    unitPrice: string
    exchangeRate: string
  }>>([{ itemId: '', quantity: '1', unitPrice: '', exchangeRate: '' }])
  const [error, setError] = useState<string | null>(null)

  const { data: taxRates = [] } = useQuery<TaxRate[]>({
    queryKey: ['sales-tax-rates'],
    queryFn: () => apiClient.get<TaxRate[]>('/sales/tax-rates').then(r => r.data),
  })

  const ivaRates = taxRates.filter(r => r.type === 'IVA')
  const perceptionRates = taxRates.filter(r => r.type === 'PERCEPTION')

  // Auto-fetch exchange rate when currency changes (non-ARS)
  const { data: exchangeRateData } = useQuery<{ rate: number }>({
    queryKey: ['exchange-rate', currency],
    queryFn: () =>
      apiClient.get<{ rate: number }>(`/exchange-rates/current/${currency}`).then(r => r.data),
    enabled: currency !== 'ARS',
  })

  useEffect(() => {
    if (exchangeRateData) {
      setLines(prev => prev.map(l => ({ ...l, exchangeRate: String(exchangeRateData.rate) })))
    }
  }, [exchangeRateData])

  const mutation = useMutation({
    mutationFn: (req: SalesQuoteRequest) =>
      apiClient.post<SalesQuote>('/sales/quotes', req),
    onSuccess: () => {
      onCreated()
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'No se pudo crear el presupuesto.')
    },
  })

  function addLine() {
    setLines(prev => [...prev, { itemId: '', quantity: '1', unitPrice: '', exchangeRate: '' }])
  }

  function removeLine(idx: number) {
    setLines(prev => prev.filter((_, i) => i !== idx))
  }

  function updateLine(idx: number, field: string, value: string) {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l))
  }

  function handleSubmit() {
    setError(null)
    if (!ivaRateValue) { setError('Seleccioná una alícuota de IVA.'); return }

    const lineRequests: SalesQuoteLineRequest[] = []
    for (const line of lines) {
      if (!line.itemId || !line.unitPrice) {
        setError('Completá todos los ítems del presupuesto.')
        return
      }
      const lineReq: SalesQuoteLineRequest = {
        itemId: Number(line.itemId),
        quantity: Number(line.quantity) || 1,
        unitPrice: Number(line.unitPrice),
      }
      if (line.exchangeRate) lineReq.exchangeRate = Number(line.exchangeRate)
      lineRequests.push(lineReq)
    }

    const req: SalesQuoteRequest = {
      customerId: customer.id,
      quoteDate,
      currency,
      ivaRate: Number(ivaRateValue),
      lines: lineRequests,
    }
    if (perceptionRateValue) req.perceptionRate = Number(perceptionRateValue)
    if (comments.trim()) req.comments = comments.trim()

    mutation.mutate(req)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative w-[560px] max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
          <div>
            <p className="text-[14px] font-semibold text-[#111827]">Nuevo Presupuesto</p>
            <p className="text-[12px] text-slate-400">Cliente: {customer.name}</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 text-slate-400 transition hover:bg-gray-100 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-6 py-5">
          {/* Header row */}
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">Fecha</label>
              <input type="date" value={quoteDate} onChange={e => setQuoteDate(e.target.value)}
                className="rounded-xl border border-gray-200 bg-[#f7f8fa] px-4 py-2.5 text-[14px] text-[#374151] outline-none transition focus:border-[#fbbf24] focus:bg-white" />
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

          {/* Tax rates */}
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">IVA *</label>
              <select value={ivaRateValue} onChange={e => setIvaRateValue(e.target.value)}
                className="rounded-xl border border-gray-200 bg-[#f7f8fa] px-3 py-2.5 text-[14px] text-[#374151] outline-none transition focus:border-[#fbbf24] focus:bg-white">
                <option value="">Seleccioná...</option>
                {ivaRates.map(r => (
                  <option key={r.id} value={String(r.rate)}>{r.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">Percepción</label>
              <select value={perceptionRateValue} onChange={e => setPerceptionRateValue(e.target.value)}
                className="rounded-xl border border-gray-200 bg-[#f7f8fa] px-3 py-2.5 text-[14px] text-[#374151] outline-none transition focus:border-[#fbbf24] focus:bg-white">
                <option value="">Sin percepción</option>
                {perceptionRates.map(r => (
                  <option key={r.id} value={String(r.rate)}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Lines */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">Ítems</label>
              <button type="button" onClick={addLine}
                className="flex items-center gap-1 text-[12px] font-semibold text-[#fbbf24] transition hover:text-[#f59e0b]">
                <Plus size={12} /> Agregar ítem
              </button>
            </div>

            {lines.map((line, idx) => (
              <div key={idx} className="flex gap-2 rounded-xl border border-gray-100 bg-[#f7f8fa] p-3">
                <div className="flex flex-1 flex-col gap-1.5">
                  <label className="text-[11px] text-slate-400">ID Artículo</label>
                  <input type="number" value={line.itemId} onChange={e => updateLine(idx, 'itemId', e.target.value)}
                    placeholder="ID"
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] text-[#374151] outline-none transition focus:border-[#fbbf24]" />
                </div>
                <div className="flex flex-col gap-1.5" style={{ width: 72 }}>
                  <label className="text-[11px] text-slate-400">Cant.</label>
                  <input type="number" step="0.001" min="0.001" value={line.quantity} onChange={e => updateLine(idx, 'quantity', e.target.value)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] text-[#374151] outline-none transition focus:border-[#fbbf24]" />
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <label className="text-[11px] text-slate-400">Precio Unit.</label>
                  <input type="number" step="0.0001" min="0" value={line.unitPrice} onChange={e => updateLine(idx, 'unitPrice', e.target.value)}
                    placeholder="0.00"
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] text-[#374151] outline-none transition focus:border-[#fbbf24]" />
                </div>
                {currency !== 'ARS' && (
                  <div className="flex flex-col gap-1.5" style={{ width: 90 }}>
                    <label className="text-[11px] text-slate-400">T. Cambio</label>
                    <input type="number" step="0.000001" min="0" value={line.exchangeRate} onChange={e => updateLine(idx, 'exchangeRate', e.target.value)}
                      placeholder="auto"
                      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] text-[#374151] outline-none transition focus:border-[#fbbf24]" />
                  </div>
                )}
                {lines.length > 1 && (
                  <button type="button" onClick={() => removeLine(idx)}
                    className="mt-auto rounded-lg p-2 text-slate-300 transition hover:bg-red-50 hover:text-red-400">
                    <X size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Comments */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">Observaciones</label>
            <textarea value={comments} onChange={e => setComments(e.target.value)} rows={2}
              className="rounded-xl border border-gray-200 bg-[#f7f8fa] px-4 py-2.5 text-[14px] text-[#374151] placeholder-slate-300 outline-none transition focus:border-[#fbbf24] focus:bg-white resize-none"
              placeholder="Condiciones, notas..." />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">{error}</div>
          )}
        </div>

        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-gray-100 bg-white px-6 py-4">
          <button type="button" onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2 text-[13px] font-medium text-slate-500 transition hover:border-gray-300">
            Cancelar
          </button>
          <button type="button" onClick={handleSubmit} disabled={mutation.isPending}
            className="flex items-center gap-2 rounded-xl bg-[#fbbf24] px-5 py-2 text-[13px] font-semibold text-white transition hover:bg-[#f59e0b] disabled:opacity-50">
            {mutation.isPending
              ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Guardando...</>
              : 'Crear Presupuesto'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Quote row ────────────────────────────────────────────────────────────────

function QuoteRow({ quote, onConfirm, onCancel }: {
  quote: SalesQuote
  onConfirm: (id: number) => void
  onCancel: (id: number) => void
}) {
  const [expanded, setExpanded] = useState(false)

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-500',
    CONFIRMED: 'bg-emerald-100 text-emerald-600',
    CANCELLED: 'bg-red-100 text-red-500',
  }

  const statusLabels: Record<string, string> = {
    DRAFT: 'Borrador',
    CONFIRMED: 'Confirmado',
    CANCELLED: 'Cancelado',
  }

  return (
    <>
      <tr
        onClick={() => setExpanded(e => !e)}
        className="cursor-pointer border-b border-gray-50 hover:bg-[#fafafa]"
      >
        <td className="px-4 py-3 font-mono text-[12px] font-bold text-[#d97706]">
          #{quote.quoteNumber}
        </td>
        <td className="px-3 py-3 text-[13px] text-slate-600">{quote.quoteDate}</td>
        <td className="px-3 py-3">
          <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-bold', statusColors[quote.status])}>
            {statusLabels[quote.status]}
          </span>
        </td>
        <td className="px-3 py-3 text-right font-mono text-[13px] font-semibold text-[#374151]">
          {quote.currency} {Number(quote.total).toFixed(2)}
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
            {quote.status === 'DRAFT' && (
              <>
                <button onClick={() => onConfirm(quote.id)}
                  className="rounded-lg bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-600 transition hover:bg-emerald-100">
                  Confirmar
                </button>
                <button onClick={() => onCancel(quote.id)}
                  className="rounded-lg bg-red-50 px-3 py-1 text-[11px] font-semibold text-red-500 transition hover:bg-red-100">
                  Cancelar
                </button>
              </>
            )}
            {quote.status === 'CONFIRMED' && (
              <button onClick={() => onCancel(quote.id)}
                className="rounded-lg bg-red-50 px-3 py-1 text-[11px] font-semibold text-red-500 transition hover:bg-red-100">
                Cancelar
              </button>
            )}
          </div>
        </td>
      </tr>

      {expanded && (
        <tr className="border-b border-gray-50 bg-[#fafafa]">
          <td colSpan={5} className="px-6 pb-4 pt-2">
            <div className="overflow-hidden rounded-xl border border-gray-100">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-gray-100 bg-white">
                    <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Artículo</th>
                    <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">Cant.</th>
                    <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">Precio</th>
                    <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">T.C.</th>
                    <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">Total línea</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.lines.map((line, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="px-3 py-2">
                        <span className="font-mono text-[11px] text-slate-400">{line.itemCode}</span>
                        <span className="ml-2 text-slate-700">{line.itemName}</span>
                      </td>
                      <td className="px-3 py-2 text-right text-slate-600">{Number(line.quantity).toFixed(3)}</td>
                      <td className="px-3 py-2 text-right font-mono text-slate-600">{Number(line.unitPrice).toFixed(4)}</td>
                      <td className="px-3 py-2 text-right text-slate-500">{Number(line.exchangeRate).toFixed(6)}</td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-[#374151]">{Number(line.lineTotal).toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex justify-end">
              <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-[12px]">
                <span className="text-slate-400">Subtotal</span>
                <span className="text-right font-mono text-[#374151]">{Number(quote.subtotal).toFixed(2)}</span>
                <span className="text-slate-400">IVA {Number(quote.ivaRate).toFixed(1)}%</span>
                <span className="text-right font-mono text-[#374151]">{Number(quote.ivaAmount).toFixed(2)}</span>
                {quote.perceptionRate && (
                  <>
                    <span className="text-slate-400">Percepción {Number(quote.perceptionRate).toFixed(1)}%</span>
                    <span className="text-right font-mono text-[#374151]">{Number(quote.perceptionAmount).toFixed(2)}</span>
                  </>
                )}
                <span className="font-semibold text-slate-600">Total</span>
                <span className="text-right font-mono font-bold text-[#111827]">
                  {quote.currency} {Number(quote.total).toFixed(2)}
                </span>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── Quotes Tab ───────────────────────────────────────────────────────────────

function QuotesTab({ customer }: { customer: Customer }) {
  const [showDialog, setShowDialog] = useState(false)
  const qc = useQueryClient()

  const { data: quotes = [], isLoading } = useQuery<SalesQuote[]>({
    queryKey: ['sales-quotes', customer.id],
    queryFn: () =>
      apiClient
        .get<SalesQuote[]>('/sales/quotes', { params: { customerId: customer.id } })
        .then(r => r.data),
  })

  const confirmMutation = useMutation({
    mutationFn: (id: number) => apiClient.post<SalesQuote>(`/sales/quotes/${id}/confirm`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sales-quotes', customer.id] }),
  })

  const cancelMutation = useMutation({
    mutationFn: (id: number) => apiClient.post<SalesQuote>(`/sales/quotes/${id}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sales-quotes', customer.id] }),
  })

  function handleCreated() {
    qc.invalidateQueries({ queryKey: ['sales-quotes', customer.id] })
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
          Nuevo Presupuesto
        </button>
      </div>

      {quotes.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-slate-300">
          <FileText size={28} strokeWidth={1.2} />
          <p className="text-[13px]">Sin presupuestos para este cliente</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-100">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-gray-100 bg-[#f7f8fa]">
                <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Nro.</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Fecha</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Estado</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">Total</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map(q => (
                <QuoteRow
                  key={q.id}
                  quote={q}
                  onConfirm={id => confirmMutation.mutate(id)}
                  onCancel={id => cancelMutation.mutate(id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <NewQuoteDialog
        open={showDialog}
        customer={customer}
        onClose={() => setShowDialog(false)}
        onCreated={handleCreated}
      />
    </>
  )
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({ customer }: { customer: Customer }) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#f7f8fa]">
      <div className="shrink-0 border-b border-gray-100 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#fbbf24]/10">
            <ShoppingBag size={15} className="text-[#fbbf24]" />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#fbbf24]">
              {customer.code}
            </p>
            <p className="truncate text-[16px] font-bold text-[#111827]">{customer.name}</p>
            {customer.cuit && (
              <p className="text-[11px] text-slate-400">CUIT: {customer.cuit}</p>
            )}
          </div>
        </div>

        <div className="mt-4 border-b border-gray-100">
          <span className="inline-block border-b-2 border-[#fbbf24] px-4 pb-3 pt-1 text-[13px] font-semibold text-[#d97706]">
            Presupuestos
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <QuotesTab customer={customer} />
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyPanel() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 bg-[#f7f8fa] p-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-sm">
        <ShoppingBag size={26} strokeWidth={1.2} className="text-slate-300" />
      </div>
      <div>
        <p className="text-[15px] font-semibold text-slate-300">Seleccioná un cliente</p>
        <p className="mt-1 text-[13px] text-slate-200">Los presupuestos aparecerán aquí</p>
      </div>
    </div>
  )
}

// ─── Left Panel — Customer List ───────────────────────────────────────────────

function CustomerList({
  selected,
  onSelect,
}: {
  selected: Customer | null
  onSelect: (c: Customer) => void
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

  const { data, isLoading } = useQuery<PageResponse<Customer>>({
    queryKey: ['sales-customers', debouncedSearch],
    queryFn: () =>
      apiClient
        .get<PageResponse<Customer>>('/sales/customers', {
          params: { search: debouncedSearch || undefined, size: 100 },
        })
        .then(r => r.data),
  })

  const customers = data?.content ?? []

  function handleCreated() {
    qc.invalidateQueries({ queryKey: ['sales-customers'] })
  }

  return (
    <div className="flex w-[300px] shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-gray-100 bg-[#f7f8fa] pl-5 pr-5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#fbbf24]/10">
          <ShoppingBag size={14} className="text-[#fbbf24]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-[#374151]">Clientes</p>
          <p className="text-[11px] text-slate-400">{customers.length} registros</p>
        </div>
      </div>

      <div className="shrink-0 border-b border-gray-100 px-4 py-2.5">
        <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-[#f7f8fa] px-3 py-2 transition focus-within:border-[#fbbf24] focus-within:bg-white">
          <Search size={12} className="shrink-0 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o código..."
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
          Nuevo Cliente
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
        {isLoading ? (
          <div className="flex h-28 items-center justify-center"><Spinner /></div>
        ) : customers.length === 0 ? (
          <div className="flex h-28 flex-col items-center justify-center gap-2">
            <Search size={20} strokeWidth={1.2} className="text-slate-200" />
            <p className="text-[13px] text-slate-300">Sin resultados</p>
          </div>
        ) : (
          customers.map(c => {
            const isSel = selected?.id === c.id
            return (
              <div
                key={c.id}
                onClick={() => onSelect(c)}
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
                    {c.code}
                  </span>
                  <span className={cn(
                    'min-w-0 flex-1 truncate text-[13px] leading-snug',
                    isSel ? 'font-semibold text-[#92400e]' : 'font-medium text-[#374151]',
                  )}>
                    {c.name}
                  </span>
                </div>

                {c.cuit && (
                  <p className="pl-0.5 text-[11px] text-slate-400">CUIT: {c.cuit}</p>
                )}
              </div>
            )
          })
        )}
      </div>

      <NewCustomerDialog
        open={showNewDialog}
        onClose={() => setShowNewDialog(false)}
        onCreated={handleCreated}
      />
    </div>
  )
}

// ─── Sales Orders Status ──────────────────────────────────────────────────────

const ORDER_STATUS_LABEL: Record<SalesOrderStatus, string> = {
  PENDING_STOCK: 'Sin stock',
  PARTIALLY_RESERVED: 'Parcial',
  FULLY_RESERVED: 'Reservado',
  CANCELLED: 'Cancelada',
}

const ORDER_STATUS_CLASS: Record<SalesOrderStatus, string> = {
  PENDING_STOCK: 'bg-red-50 text-red-500',
  PARTIALLY_RESERVED: 'bg-amber-50 text-amber-600',
  FULLY_RESERVED: 'bg-emerald-50 text-emerald-600',
  CANCELLED: 'bg-slate-100 text-slate-500',
}

// ─── New Sales Order Dialog ───────────────────────────────────────────────────

function NewSalesOrderDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [customerId, setCustomerId] = useState('')
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10))
  const [currency, setCurrency] = useState('ARS')
  const [ivaRate, setIvaRate] = useState('21')
  const [lines, setLines] = useState([{ itemId: '', quantityOrdered: '1', unitPrice: '' }])
  const [error, setError] = useState<string | null>(null)
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => apiClient.post<SalesOrderResponse>('/sales/orders', {
      customerId: Number(customerId),
      orderDate,
      currency,
      ivaRate: Number(ivaRate),
      lines: lines.map(l => ({
        itemId: Number(l.itemId),
        quantityOrdered: Number(l.quantityOrdered) || 1,
        unitPrice: Number(l.unitPrice),
      })),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-orders'] })
      setCustomerId(''); setOrderDate(new Date().toISOString().slice(0, 10)); setCurrency('ARS'); setIvaRate('21')
      setLines([{ itemId: '', quantityOrdered: '1', unitPrice: '' }]); setError(null); onCreated(); onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'No se pudo crear la nota de venta.')
    },
  })

  function addLine() { setLines(prev => [...prev, { itemId: '', quantityOrdered: '1', unitPrice: '' }]) }
  function removeLine(i: number) { setLines(prev => prev.filter((_, idx) => idx !== i)) }
  function updateLine(i: number, field: string, val: string) { setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: val } : l)) }

  function handleSubmit() {
    setError(null)
    if (!customerId) { setError('El ID de cliente es requerido.'); return }
    for (const l of lines) {
      if (!l.itemId || !l.unitPrice) { setError('Completá todos los ítems.'); return }
    }
    mutation.mutate()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative w-[560px] max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
          <div>
            <p className="text-[14px] font-semibold text-[#111827]">Nueva Nota de Venta</p>
            <p className="text-[12px] text-slate-400">Completá los datos del pedido</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 text-slate-400 hover:bg-gray-100"><X size={16} /></button>
        </div>
        <div className="flex flex-col gap-4 px-6 py-5">
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">ID Cliente *</label>
              <input type="number" value={customerId} onChange={e => setCustomerId(e.target.value)} placeholder="ID del cliente"
                className="rounded-xl border border-gray-200 bg-[#f7f8fa] px-4 py-2.5 text-[14px] outline-none focus:border-[#fbbf24] focus:bg-white" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">Moneda</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)}
                className="rounded-xl border border-gray-200 bg-[#f7f8fa] px-3 py-2.5 text-[14px] outline-none focus:border-[#fbbf24] focus:bg-white">
                <option>ARS</option><option>USD</option><option>EUR</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">Fecha</label>
              <input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)}
                className="rounded-xl border border-gray-200 bg-[#f7f8fa] px-4 py-2.5 text-[14px] outline-none focus:border-[#fbbf24] focus:bg-white" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">IVA %</label>
              <select value={ivaRate} onChange={e => setIvaRate(e.target.value)}
                className="rounded-xl border border-gray-200 bg-[#f7f8fa] px-3 py-2.5 text-[14px] outline-none focus:border-[#fbbf24] focus:bg-white">
                <option value="21">21%</option>
                <option value="10.5">10.5%</option>
                <option value="27">27%</option>
                <option value="0">0%</option>
              </select>
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
                  <input type="number" step="0.001" value={l.quantityOrdered} onChange={e => updateLine(i, 'quantityOrdered', e.target.value)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-[#fbbf24]" />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <label className="text-[11px] text-slate-400">Precio Unit.</label>
                  <input type="number" step="0.0001" value={l.unitPrice} onChange={e => updateLine(i, 'unitPrice', e.target.value)} placeholder="0.00"
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-[#fbbf24]" />
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
          <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2 text-[13px] font-medium text-slate-500">Cancelar</button>
          <button type="button" onClick={handleSubmit} disabled={mutation.isPending}
            className="flex items-center gap-2 rounded-xl bg-[#fbbf24] px-5 py-2 text-[13px] font-semibold text-white hover:bg-[#f59e0b] disabled:opacity-50">
            {mutation.isPending ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Creando...</> : 'Crear NV'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Manual stock cross-reference (mirrors Python's Ingre_Stk, ingrestk_nv.py) ────

const CROSS_REF_MOVEMENT_TYPES: { value: string; label: string }[] = [
  { value: 'ENTRY_INVENTORY', label: 'Inventario' },
  { value: 'ENTRY_REMIT_FROM_THIRD', label: 'Remito de 3ros.' },
  { value: 'ENTRY_DELIVERY_NOTE_FROM_THIRD', label: 'Nota Entrega de 3ros.' },
  { value: 'ENTRY_UNPLANNED_STOCK', label: 'Stock No Planificado' },
  { value: 'ENTRY_UNEXPECTED_APPEARANCE', label: 'Aparición Imprevista' },
]

interface CrossRefLineState {
  itemId: number
  itemCode: string
  itemName: string
  include: boolean
  amount: string
}

/**
 * Lets the user post stock entries for items already on this order, without needing to
 * search/paste codes — the order's own lines are the only selectable source, so there's no
 * need to re-validate "does this code belong to the order" the way Python's Ingre_Stk did by
 * checking substring membership against pasted text (ingrestk_nv.py:157-160); the backend
 * still re-validates server-side regardless of what this UI restricts to.
 */
function ManualStockLoadDialog({ order, onClose, onDone }: {
  order: SalesOrderResponse | null
  onClose: () => void
  onDone: () => void
}) {
  const [movementType, setMovementType] = useState('ENTRY_INVENTORY')
  const [targetVariable, setTargetVariable] = useState<'AVAILABLE' | 'FUTURE'>('AVAILABLE')
  const [memo, setMemo] = useState('')
  // Lazy-initialized from `order` — the parent remounts this component (via `key`) each time
  // a different order opens, so this only ever runs once per order, no effect needed.
  const [lines, setLines] = useState<CrossRefLineState[]>(() =>
    (order?.lines ?? []).map(l => ({
      itemId: l.itemId, itemCode: l.itemCode, itemName: l.itemName, include: false, amount: '',
    })),
  )
  const [error, setError] = useState<string | null>(null)
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => {
      const body: SalesOrderStockCrossReferenceRequest = {
        movementType: movementType as SalesOrderStockCrossReferenceRequest['movementType'],
        targetVariable,
        memo: memo || undefined,
        lines: lines
          .filter(l => l.include)
          .map(l => ({ itemId: l.itemId, amount: parseFloat(l.amount) })),
      }
      return apiClient.post<StockMovementResponse[]>(`/sales/orders/${order!.id}/stock-cross-reference`, body)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-orders'] })
      // This posts real stock movements (changes Item.stockAvailable/stockFuture), so the
      // Stock module's own views and the catalog ficha's cached item detail go stale too.
      qc.invalidateQueries({ queryKey: ['stock-levels'] })
      qc.invalidateQueries({ queryKey: ['stock-level'] })
      qc.invalidateQueries({ queryKey: ['item-detail'] })
      onDone()
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'No se pudo cargar el stock manualmente.')
    },
  })

  function toggleLine(itemId: number) {
    setLines(prev => prev.map(l => l.itemId === itemId ? { ...l, include: !l.include } : l))
  }

  function updateAmount(itemId: number, val: string) {
    setLines(prev => prev.map(l => l.itemId === itemId ? { ...l, amount: val } : l))
  }

  function handleSubmit() {
    setError(null)
    const selected = lines.filter(l => l.include)
    if (selected.length === 0) {
      setError('Seleccioná al menos un ítem de la nota de venta.')
      return
    }
    if (selected.some(l => !l.amount || parseFloat(l.amount) <= 0)) {
      setError('Todas las cantidades seleccionadas deben ser mayores a 0.')
      return
    }
    mutation.mutate()
  }

  if (!order) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative w-[560px] max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
          <div>
            <p className="text-[14px] font-semibold text-[#111827]">Carga manual de stock — NV #{order.orderNumber}</p>
            <p className="text-[12px] text-slate-400">Solo se pueden cargar ítems que ya pertenecen a esta nota de venta</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 text-slate-400 hover:bg-gray-100"><X size={16} /></button>
        </div>
        <div className="flex flex-col gap-4 px-6 py-5">
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">Tipo de ingreso</label>
              <select value={movementType} onChange={e => setMovementType(e.target.value)}
                className="rounded-xl border border-gray-200 bg-[#f7f8fa] px-3 py-2.5 text-[14px] outline-none focus:border-[#fbbf24] focus:bg-white">
                {CROSS_REF_MOVEMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">Destino</label>
              <select value={targetVariable} onChange={e => setTargetVariable(e.target.value as 'AVAILABLE' | 'FUTURE')}
                className="rounded-xl border border-gray-200 bg-[#f7f8fa] px-3 py-2.5 text-[14px] outline-none focus:border-[#fbbf24] focus:bg-white">
                <option value="AVAILABLE">Disponible</option>
                <option value="FUTURE">Futuro</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">Ítems de la nota de venta</label>
            {lines.map(l => (
              <div key={l.itemId} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-[#f7f8fa] p-3">
                <input type="checkbox" checked={l.include} onChange={() => toggleLine(l.itemId)}
                  className="h-4 w-4 rounded accent-[#fbbf24]" />
                <div className="min-w-0 flex-1">
                  <span className="font-mono text-[11px] text-slate-400">{l.itemCode}</span>
                  <span className="ml-2 text-[13px] text-slate-700">{l.itemName}</span>
                </div>
                <input type="number" step="0.001" min="0.001" value={l.amount}
                  onChange={e => updateAmount(l.itemId, e.target.value)}
                  disabled={!l.include}
                  placeholder="Cant."
                  className="w-24 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-[#fbbf24] disabled:opacity-40" />
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">Memo</label>
            <textarea value={memo} onChange={e => setMemo(e.target.value)} rows={2}
              className="rounded-xl border border-gray-200 bg-[#f7f8fa] px-4 py-2.5 text-[14px] outline-none focus:border-[#fbbf24] focus:bg-white" />
          </div>

          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">{error}</div>}
        </div>
        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-gray-100 bg-white px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2 text-[13px] font-medium text-slate-500">Cancelar</button>
          <button type="button" onClick={handleSubmit} disabled={mutation.isPending}
            className="flex items-center gap-2 rounded-xl bg-[#fbbf24] px-5 py-2 text-[13px] font-semibold text-white hover:bg-[#f59e0b] disabled:opacity-50">
            {mutation.isPending ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Cargando...</> : 'Cargar stock'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Reserved stock transfer between orders (mirrors Python's TransfiNv) ──────

/**
 * Lets the user redistribute one line's reserved stock to other orders still waiting on the
 * same item. Unlike Python's sele_transfi_stk.py — whose confirmation dialog warns that an
 * over-requested transfer will be capped in list order, but whose code then transfers the full
 * amount to every checked destination anyway — this always caps each destination at
 * min(remaining, its own gap), server-side, so the warning shown here is actually true.
 */
function TransferStockDialog({ order, line, onClose, onDone }: {
  order: SalesOrderResponse | null
  line: SalesOrderLineResponse | null
  onClose: () => void
  onDone: () => void
}) {
  const qc = useQueryClient()
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)

  const { data: candidates = [], isLoading } = useQuery<StockTransferCandidateResponse[]>({
    queryKey: ['transfer-candidates', order?.id, line?.itemId],
    queryFn: () =>
      apiClient.get<StockTransferCandidateResponse[]>(
        `/sales/orders/${order!.id}/items/${line!.itemId}/transfer-candidates`,
      ).then(r => r.data),
    enabled: !!order && !!line,
  })

  const mutation = useMutation({
    mutationFn: () => {
      const body: SalesOrderStockTransferRequest = { targetOrderIds: Array.from(checkedIds) }
      return apiClient.post(`/sales/orders/${order!.id}/items/${line!.itemId}/transfer-reserved-stock`, body)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-orders'] })
      onDone()
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'No se pudo transferir el stock reservado.')
    },
  })

  function toggle(orderId: number) {
    setCheckedIds(prev => {
      const next = new Set(prev)
      if (next.has(orderId)) next.delete(orderId)
      else next.add(orderId)
      return next
    })
  }

  function handleSubmit() {
    setError(null)
    if (checkedIds.size === 0) {
      setError('Seleccioná al menos una nota de venta destino.')
      return
    }
    mutation.mutate()
  }

  if (!order || !line) return null

  const requestedTotal = candidates
    .filter(c => checkedIds.has(c.orderId))
    .reduce((sum, c) => sum + c.gap, 0)
  const overCommitted = requestedTotal > line.quantityReserved

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative w-[480px] max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
          <div>
            <p className="text-[14px] font-semibold text-[#111827]">
              Transferir {line.quantityReserved} und. reservadas — {line.itemCode}
            </p>
            <p className="text-[12px] text-slate-400">Desde NV #{order.orderNumber}</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 text-slate-400 hover:bg-gray-100"><X size={16} /></button>
        </div>

        <div className="flex flex-col gap-3 px-6 py-5">
          {isLoading ? (
            <div className="flex h-24 items-center justify-center"><Spinner /></div>
          ) : candidates.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-slate-300">
              No hay otras notas de venta esperando este ítem.
            </p>
          ) : (
            candidates.map(c => (
              <label key={c.orderId}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-100 bg-[#f7f8fa] px-4 py-3">
                <input type="checkbox" checked={checkedIds.has(c.orderId)} onChange={() => toggle(c.orderId)}
                  className="h-4 w-4 rounded accent-[#fbbf24]" />
                <span className="flex-1 text-[13px] text-slate-700">NV #{c.orderNumber}</span>
                <span className="font-mono text-[13px] font-semibold text-slate-500">necesita {c.gap.toFixed(2)}</span>
              </label>
            ))
          )}

          {overCommitted && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-700">
              Lo pedido por las NV tildadas ({requestedTotal.toFixed(2)}) supera el stock reservado disponible
              ({line.quantityReserved.toFixed(2)}). Se va a asignar en el orden de la lista hasta agotar la cantidad
              — las últimas pueden recibir menos de lo que necesitan.
            </div>
          )}

          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">{error}</div>}
        </div>

        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-gray-100 bg-white px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2 text-[13px] font-medium text-slate-500">Cancelar</button>
          <button type="button" onClick={handleSubmit} disabled={mutation.isPending || candidates.length === 0}
            className="flex items-center gap-2 rounded-xl bg-[#fbbf24] px-5 py-2 text-[13px] font-semibold text-white hover:bg-[#f59e0b] disabled:opacity-50">
            {mutation.isPending ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Transfiriendo...</> : 'Transferir Stock'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Sales Orders Tab ─────────────────────────────────────────────────────────

function SalesOrdersTab() {
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [manualLoadOrder, setManualLoadOrder] = useState<SalesOrderResponse | null>(null)
  const [transferTarget, setTransferTarget] = useState<{ order: SalesOrderResponse; line: SalesOrderLineResponse } | null>(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<{ content: SalesOrderResponse[] }>({
    queryKey: ['sales-orders', statusFilter],
    queryFn: () =>
      apiClient.get('/sales/orders', {
        params: { status: statusFilter === 'ALL' ? undefined : statusFilter, size: 50 },
      }).then(r => r.data),
  })

  const orders = data?.content ?? []

  const reserveMutation = useMutation({
    mutationFn: (id: number) => apiClient.patch(`/sales/orders/${id}/reserve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sales-orders'] }),
  })

  const cancelMutation = useMutation({
    mutationFn: (id: number) => apiClient.patch(`/sales/orders/${id}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sales-orders'] }),
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">Estado</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="rounded-xl border border-gray-200 bg-[#f7f8fa] px-3 py-2 text-[13px] outline-none focus:border-[#fbbf24] focus:bg-white">
            <option value="ALL">Todos</option>
            <option value="PENDING_STOCK">Sin stock</option>
            <option value="PARTIALLY_RESERVED">Parcial</option>
            <option value="FULLY_RESERVED">Reservado</option>
            <option value="CANCELLED">Cancelada</option>
          </select>
        </div>
        <button onClick={() => setShowNewDialog(true)}
          className="flex items-center gap-2 rounded-xl bg-[#fbbf24] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#f59e0b]">
          <Plus size={13} /> Nueva NV
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center"><Spinner /></div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-slate-300">
          <Package size={28} strokeWidth={1.2} />
          <p className="text-[13px]">Sin notas de venta</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-100">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-gray-100 bg-[#f7f8fa]">
                <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">N° NV</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Cliente</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Fecha</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Estado</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">Total</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <>
                  <tr key={o.id} onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}
                    className="cursor-pointer border-b border-gray-50 hover:bg-[#fafafa]">
                    <td className="px-4 py-3 font-mono text-[12px] font-bold text-[#d97706]">#{o.orderNumber}</td>
                    <td className="px-3 py-3 text-slate-700">{o.customerName}</td>
                    <td className="px-3 py-3 text-slate-600">{o.orderDate}</td>
                    <td className="px-3 py-3">
                      <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-bold', ORDER_STATUS_CLASS[o.status])}>
                        {ORDER_STATUS_LABEL[o.status]}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-semibold text-[#374151]">
                      {o.currency} {Number(o.total).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                        {o.status !== 'CANCELLED' && (
                          <button onClick={() => reserveMutation.mutate(o.id)}
                            className="rounded-lg bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-100">
                            Reservar
                          </button>
                        )}
                        {o.status !== 'CANCELLED' && (
                          <button onClick={() => setManualLoadOrder(o)}
                            className="rounded-lg bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-600 hover:bg-amber-100">
                            Carga manual
                          </button>
                        )}
                        {o.status !== 'CANCELLED' && (
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
                                <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">Pedido</th>
                                <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">Reservado</th>
                                <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">Pendiente</th>
                                <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">Precio</th>
                                <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400" />
                              </tr>
                            </thead>
                            <tbody>
                              {o.lines.map(l => (
                                <tr key={l.id} className="border-b border-gray-50">
                                  <td className="px-3 py-2">
                                    <span className="font-mono text-[11px] text-slate-400">{l.itemCode}</span>
                                    <span className="ml-2 text-slate-700">{l.itemName}</span>
                                  </td>
                                  <td className="px-3 py-2 text-right text-slate-600">{l.quantityOrdered}</td>
                                  <td className="px-3 py-2 text-right text-emerald-600">{l.quantityReserved}</td>
                                  <td className="px-3 py-2 text-right text-amber-600">{l.quantityPending}</td>
                                  <td className="px-3 py-2 text-right font-mono text-slate-600">{Number(l.unitPrice).toFixed(4)}</td>
                                  <td className="px-3 py-2 text-right">
                                    {l.quantityReserved > 0 && (
                                      <button
                                        onClick={() => setTransferTarget({ order: o, line: l })}
                                        className="rounded-lg bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-100"
                                      >
                                        Transferir
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="mt-3 flex justify-end gap-6 text-[12px]">
                          <span className="text-slate-400">Subtotal: <span className="font-mono text-slate-600">{Number(o.subtotal).toFixed(2)}</span></span>
                          <span className="text-slate-400">IVA: <span className="font-mono text-slate-600">{Number(o.ivaAmount).toFixed(2)}</span></span>
                          <span className="font-semibold text-slate-700">Total: <span className="font-mono">{o.currency} {Number(o.total).toFixed(2)}</span></span>
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

      <NewSalesOrderDialog open={showNewDialog} onClose={() => setShowNewDialog(false)} onCreated={() => {}} />
      <ManualStockLoadDialog
        key={manualLoadOrder?.id ?? 'closed'}
        order={manualLoadOrder}
        onClose={() => setManualLoadOrder(null)}
        onDone={() => {}}
      />
      <TransferStockDialog
        key={transferTarget ? `${transferTarget.order.id}-${transferTarget.line.itemId}` : 'closed'}
        order={transferTarget?.order ?? null}
        line={transferTarget?.line ?? null}
        onClose={() => setTransferTarget(null)}
        onDone={() => {}}
      />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type TopTab = 'clientes' | 'notas-venta'

const TOP_TAB_LABELS: Record<TopTab, string> = {
  clientes: 'Clientes',
  'notas-venta': 'Notas de Venta',
}

export function SalesPage() {
  const [selected, setSelected] = useState<Customer | null>(null)
  const [topTab, setTopTab] = useState<TopTab>('clientes')

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#f7f8fa]">
      <header className="relative flex h-12 shrink-0 items-center border-b border-gray-200 bg-white px-6">
        <span className="absolute inset-x-0 top-0 h-[3px] bg-[#fbbf24]" />
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
          <span className="text-sm text-slate-400">Ventas</span>
          {topTab !== 'clientes' && (
            <>
              <span className="text-slate-300">/</span>
              <span className="text-sm font-semibold text-[#d97706]">{TOP_TAB_LABELS[topTab]}</span>
            </>
          )}
          {topTab === 'clientes' && selected && (
            <>
              <span className="text-slate-300">/</span>
              <span className="text-sm font-semibold text-[#d97706]">{selected.code}</span>
            </>
          )}
        </div>
      </header>

      <div className="flex shrink-0 items-center gap-4 px-6 py-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#fbbf24]/10">
          <ShoppingBag size={20} className="text-[#fbbf24]" />
        </div>
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-[#111827]">Ventas</h1>
          <p className="mt-0.5 text-[13px] text-slate-400">Clientes, presupuestos y notas de venta</p>
        </div>
      </div>

      {/* Top-level tab bar */}
      <div className="mx-6 mb-2 flex gap-1 border-b border-gray-200">
        {(['clientes', 'notas-venta'] as TopTab[]).map(t => (
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
            {t === 'clientes' && <ShoppingBag size={13} />}
            {t === 'notas-venta' && <Package size={13} />}
            {TOP_TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {topTab === 'clientes' && (
        <div className="mx-6 mb-6 flex min-h-0 flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <CustomerList selected={selected} onSelect={setSelected} />
          {selected ? <DetailPanel customer={selected} /> : <EmptyPanel />}
        </div>
      )}

      {topTab === 'notas-venta' && (
        <div className="mx-6 mb-6 min-h-0 flex-1 overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <SalesOrdersTab />
        </div>
      )}
    </div>
  )
}
