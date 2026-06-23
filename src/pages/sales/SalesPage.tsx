import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShoppingBag, Search, Plus, X, FileText } from 'lucide-react'
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
  useQuery<{ rate: number }>({
    queryKey: ['exchange-rate', currency],
    queryFn: () =>
      apiClient.get<{ rate: number }>(`/exchange-rates/current/${currency}`).then(r => r.data),
    enabled: currency !== 'ARS',
    onSuccess: (data: { rate: number }) => {
      setLines(prev => prev.map(l => ({ ...l, exchangeRate: String(data.rate) })))
    },
  } as Parameters<typeof useQuery>[0])

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export function SalesPage() {
  const [selected, setSelected] = useState<Customer | null>(null)

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#f7f8fa]">
      <header className="relative flex h-12 shrink-0 items-center border-b border-gray-200 bg-white px-6">
        <span className="absolute inset-x-0 top-0 h-[3px] bg-[#fbbf24]" />
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
          <span className="text-sm text-slate-400">Ventas</span>
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
          <ShoppingBag size={20} className="text-[#fbbf24]" />
        </div>
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-[#111827]">Ventas</h1>
          <p className="mt-0.5 text-[13px] text-slate-400">Clientes y presupuestos con IVA y percepciones</p>
        </div>
      </div>

      <div className="mx-6 mb-6 flex min-h-0 flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <CustomerList selected={selected} onSelect={setSelected} />

        {selected ? (
          <DetailPanel customer={selected} />
        ) : (
          <EmptyPanel />
        )}
      </div>
    </div>
  )
}
