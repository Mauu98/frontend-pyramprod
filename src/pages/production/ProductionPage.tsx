import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Cog, Search, Plus, X, ChevronDown, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import { apiClient } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import type {
  ProductionOrderResponse,
  ProductionOrderRequest,
  SimulationResult,
  SimulationLine,
  ProductionOrderLineResponse,
  ProductionOrderStatus,
  PageResponse,
} from '@/types/api.types'

interface LineAdvanceRequest {
  inProcessQty?: number
  finishedQty?: number
  extraQty?: number
  currentLot?: string
  destinationLot?: string
  launchName?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<ProductionOrderStatus, string> = {
  PRE_LAUNCH: 'Pre-Lanzamiento',
  ACTIVE:     'Activa',
  COMPLETED:  'Completada',
  CANCELLED:  'Cancelada',
}

const STATUS_COLORS: Record<ProductionOrderStatus, string> = {
  PRE_LAUNCH: 'bg-blue-100 text-blue-700',
  ACTIVE:     'bg-emerald-100 text-emerald-700',
  COMPLETED:  'bg-slate-100 text-slate-500',
  CANCELLED:  'bg-red-100 text-red-600',
}

const CLASSIFICATION_COLORS: Record<string, string> = {
  RESERVE:  'bg-emerald-100 text-emerald-700',
  BUY:      'bg-amber-100 text-amber-700',
  FABRICATE:'bg-purple-100 text-purple-700',
}

const CLASSIFICATION_LABELS: Record<string, string> = {
  RESERVE:  'Reservar',
  BUY:      'Comprar',
  FABRICATE:'Fabricar',
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#fbbf24] border-t-transparent" />
  )
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ProductionOrderStatus }) {
  return (
    <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-bold', STATUS_COLORS[status])}>
      {STATUS_LABELS[status]}
    </span>
  )
}

// ─── New order dialog ─────────────────────────────────────────────────────────

interface ItemRow {
  itemId: string
  quantity: string
}

function NewOrderDialog({ open, onClose, onCreated }: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const [name, setName] = useState('')
  const [rows, setRows] = useState<ItemRow[]>([{ itemId: '', quantity: '' }])
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (req: ProductionOrderRequest) =>
      apiClient.post<ProductionOrderResponse>('/production/orders', req),
    onSuccess: () => {
      setName('')
      setRows([{ itemId: '', quantity: '' }])
      setError(null)
      onCreated()
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'No se pudo crear la orden.')
    },
  })

  function addRow() {
    setRows(r => [...r, { itemId: '', quantity: '' }])
  }

  function removeRow(idx: number) {
    setRows(r => r.filter((_, i) => i !== idx))
  }

  function updateRow(idx: number, field: keyof ItemRow, value: string) {
    setRows(r => r.map((row, i) => i === idx ? { ...row, [field]: value } : row))
  }

  function handleSubmit() {
    setError(null)
    if (!name.trim()) { setError('El nombre es requerido.'); return }
    const items = rows
      .filter(r => r.itemId && r.quantity)
      .map(r => ({ itemId: Number(r.itemId), quantity: Number(r.quantity) }))
    if (items.length === 0) { setError('Ingresá al menos un artículo con ID y cantidad.'); return }
    mutation.mutate({ name: name.trim(), items })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative w-[520px] rounded-2xl border border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fbbf24]/10">
              <Cog size={16} className="text-[#fbbf24]" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-[#111827]">Nueva Orden de Producción</p>
              <p className="text-[12px] text-slate-400">Definí el nombre y los artículos a producir</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 text-slate-400 transition hover:bg-gray-100 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-6 py-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">Nombre</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: OT-Agosto-001"
              className="rounded-xl border border-gray-200 bg-[#f7f8fa] px-4 py-2.5 text-[14px] text-[#374151] placeholder-slate-300 outline-none transition focus:border-[#fbbf24] focus:bg-white"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">Artículos</label>
              <button
                type="button"
                onClick={addRow}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-semibold text-[#fbbf24] transition hover:bg-[#fbbf24]/10"
              >
                <Plus size={12} /> Agregar fila
              </button>
            </div>
            {rows.map((row, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="ID del artículo"
                  value={row.itemId}
                  onChange={e => updateRow(idx, 'itemId', e.target.value)}
                  className="w-36 rounded-xl border border-gray-200 bg-[#f7f8fa] px-3 py-2 text-[13px] outline-none transition focus:border-[#fbbf24] focus:bg-white"
                />
                <input
                  type="number"
                  placeholder="Cantidad"
                  step="0.001"
                  min="0.001"
                  value={row.quantity}
                  onChange={e => updateRow(idx, 'quantity', e.target.value)}
                  className="w-28 rounded-xl border border-gray-200 bg-[#f7f8fa] px-3 py-2 text-[13px] outline-none transition focus:border-[#fbbf24] focus:bg-white"
                />
                {rows.length > 1 && (
                  <button onClick={() => removeRow(idx)} className="rounded-lg p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-400">
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

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
            {mutation.isPending ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Creando...</> : 'Crear Orden'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Simulation tab ───────────────────────────────────────────────────────────

function SimulacionTab({ order }: { order: ProductionOrderResponse }) {
  const qc = useQueryClient()
  const [simResult, setSimResult] = useState<SimulationResult | null>(null)
  const [simError, setSimError] = useState<string | null>(null)
  const [simLoading, setSimLoading] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)

  async function runSimulation() {
    setSimLoading(true)
    setSimError(null)
    try {
      const res = await apiClient.get<SimulationResult>(`/production/orders/${order.id}/simulate`)
      setSimResult(res.data)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setSimError(msg ?? 'Error al ejecutar la simulación.')
    } finally {
      setSimLoading(false)
    }
  }

  const confirmMutation = useMutation({
    mutationFn: () => apiClient.post<ProductionOrderResponse>(`/production/orders/${order.id}/confirm`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['production-orders'] })
      setConfirmError(null)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setConfirmError(msg ?? 'Error al confirmar el lanzamiento.')
    },
  })

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <button
          onClick={runSimulation}
          disabled={simLoading}
          className="flex items-center gap-2 rounded-xl bg-[#fbbf24] px-5 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#f59e0b] disabled:opacity-50"
        >
          {simLoading ? <Spinner /> : <Cog size={14} />}
          Simular BOM
        </button>

        {order.status === 'PRE_LAUNCH' && simResult && (
          <button
            onClick={() => confirmMutation.mutate()}
            disabled={confirmMutation.isPending}
            className="flex items-center gap-2 rounded-xl border border-emerald-400 bg-emerald-50 px-5 py-2.5 text-[13px] font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
          >
            {confirmMutation.isPending ? <Spinner /> : null}
            Confirmar Lanzamiento
          </button>
        )}
      </div>

      {simError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">{simError}</div>
      )}
      {confirmError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">{confirmError}</div>
      )}

      {simResult && (
        <div className="flex flex-col gap-4">
          <div className="flex gap-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-center">
              <p className="text-[22px] font-bold text-emerald-600">{simResult.reserveCount}</p>
              <p className="text-[11px] text-emerald-600">Reservar</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-center">
              <p className="text-[22px] font-bold text-amber-600">{simResult.buyCount}</p>
              <p className="text-[11px] text-amber-600">Comprar</p>
            </div>
            <div className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-2.5 text-center">
              <p className="text-[22px] font-bold text-purple-600">{simResult.fabricateCount}</p>
              <p className="text-[11px] text-purple-600">Fabricar</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-100">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-gray-100 bg-[#f7f8fa]">
                  <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Código</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Nombre</th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">Requerido</th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">Disponible</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Clasificación</th>
                </tr>
              </thead>
              <tbody>
                {simResult.lines.map((line: SimulationLine) => (
                  <tr key={line.componentId} className="border-b border-gray-50 hover:bg-[#fafafa]">
                    <td className="px-4 py-3 font-mono text-[12px] text-slate-500">{line.code}</td>
                    <td className="px-3 py-3 text-slate-700">{line.name}</td>
                    <td className="px-3 py-3 text-right font-mono font-semibold text-[#374151]">{line.requiredQty.toFixed(3)}</td>
                    <td className="px-3 py-3 text-right font-mono text-slate-500">{line.availableQty.toFixed(3)}</td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-bold', CLASSIFICATION_COLORS[line.classification])}>
                        {CLASSIFICATION_LABELS[line.classification] ?? line.classification}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Advance line dialog ──────────────────────────────────────────────────────

function AdvanceLineDialog({ open, line, orderId, onClose, onSuccess }: {
  open: boolean
  line: ProductionOrderLineResponse
  orderId: number
  onClose: () => void
  onSuccess: () => void
}) {
  const [finishedQty, setFinishedQty] = useState('')
  const [inProcessQty, setInProcessQty] = useState('')
  const [currentLot, setCurrentLot] = useState('')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (req: LineAdvanceRequest) =>
      apiClient.patch<ProductionOrderLineResponse>(
        `/production/orders/${orderId}/lines/${line.id}/advance`,
        req,
      ),
    onSuccess: () => {
      setFinishedQty('')
      setInProcessQty('')
      setCurrentLot('')
      setError(null)
      onSuccess()
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'No se pudo avanzar la línea.')
    },
  })

  function handleSubmit() {
    setError(null)
    const req: LineAdvanceRequest = {}
    if (finishedQty) req.finishedQty = Number(finishedQty)
    if (inProcessQty) req.inProcessQty = Number(inProcessQty)
    if (currentLot.trim()) req.currentLot = currentLot.trim()
    if (Object.keys(req).length === 0) {
      setError('Ingresá al menos un valor para avanzar.')
      return
    }
    mutation.mutate(req)
  }

  if (!open) return null

  const itemName = line.materialName ?? line.productName ?? '—'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative w-[420px] rounded-2xl border border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <p className="text-[14px] font-semibold text-[#111827]">Avanzar Línea</p>
            <p className="text-[12px] text-slate-400 truncate max-w-[300px]">{itemName}</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 text-slate-400 transition hover:bg-gray-100 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-6 py-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">Cant. Terminada</label>
            <input
              type="number"
              step="0.001"
              min="0"
              value={finishedQty}
              onChange={e => setFinishedQty(e.target.value)}
              placeholder={`Requerido: ${line.requiredQty.toFixed(3)}`}
              className="rounded-xl border border-gray-200 bg-[#f7f8fa] px-4 py-2.5 text-[14px] text-[#374151] placeholder-slate-300 outline-none transition focus:border-[#fbbf24] focus:bg-white"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">Cant. En Proceso</label>
            <input
              type="number"
              step="0.001"
              min="0"
              value={inProcessQty}
              onChange={e => setInProcessQty(e.target.value)}
              className="rounded-xl border border-gray-200 bg-[#f7f8fa] px-4 py-2.5 text-[14px] text-[#374151] placeholder-slate-300 outline-none transition focus:border-[#fbbf24] focus:bg-white"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">Lote Actual</label>
            <input
              type="text"
              value={currentLot}
              onChange={e => setCurrentLot(e.target.value)}
              className="rounded-xl border border-gray-200 bg-[#f7f8fa] px-4 py-2.5 text-[14px] text-[#374151] placeholder-slate-300 outline-none transition focus:border-[#fbbf24] focus:bg-white"
            />
          </div>

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
            {mutation.isPending ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Guardando...</> : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Lines tab ────────────────────────────────────────────────────────────────

const LINE_STATUS_LABELS: Record<string, string> = {
  PENDING:      'Pendiente',
  RESERVED:     'Reservado',
  IN_PRODUCTION:'En Proceso',
  COMPLETED:    'Completado',
}

function LineasTab({ order }: { order: ProductionOrderResponse }) {
  const orderId = order.id
  const qc = useQueryClient()
  const [advancingLine, setAdvancingLine] = useState<ProductionOrderLineResponse | null>(null)

  const { data: lines = [], isLoading } = useQuery<ProductionOrderLineResponse[]>({
    queryKey: ['production-lines', orderId],
    queryFn: () => apiClient.get<ProductionOrderLineResponse[]>(`/production/orders/${orderId}/lines`).then(r => r.data),
  })

  function handleAdvanceSuccess() {
    qc.invalidateQueries({ queryKey: ['production-lines', orderId] })
    qc.invalidateQueries({ queryKey: ['production-orders'] })
  }

  function exportXls() {
    const rows = lines.map(line => ({
      'Tipo':          line.lineType === 'MATERIAL' ? 'Material' : 'Producción',
      'Estado':        LINE_STATUS_LABELS[line.lineStatus] ?? line.lineStatus,
      'Descripción':   line.partDescription ?? '',
      'Código Material': line.materialCode ?? line.productCode ?? '',
      'Nombre Material': line.materialName ?? line.productName ?? '',
      'Cant. Requerida': line.requiredQty,
      'Cant. En Proceso': line.inProcessQty,
      'Cant. Terminada':  line.finishedQty,
      'Cant. Extra':      line.extraQty,
      'Lote Actual':      line.currentLot ?? '',
      'Lote Destino':     line.destinationLot ?? '',
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Líneas')
    XLSX.writeFile(wb, `produccion-orden-${order.orderNumber}.xlsx`)
  }

  if (isLoading) return <div className="flex h-24 items-center justify-center"><Spinner /></div>

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-slate-300">
        <ChevronDown size={28} strokeWidth={1.2} />
        <p className="text-[13px]">Sin líneas — confirme el lanzamiento para generarlas</p>
      </div>
    )
  }

  return (
    <>
      <div className="mb-3 flex justify-end">
        <button
          onClick={exportXls}
          className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-[13px] font-medium text-slate-600 transition hover:border-gray-300 hover:bg-[#f7f8fa]"
        >
          <Download size={13} />
          Exportar XLS
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-gray-100 bg-[#f7f8fa]">
              <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Tipo</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Estado</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Material / Producto</th>
              <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">Requerido</th>
              <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">En Proceso</th>
              <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">Terminado</th>
              {order.status === 'ACTIVE' && (
                <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400" />
              )}
            </tr>
          </thead>
          <tbody>
            {lines.map(line => {
              const itemCode = line.materialCode ?? line.productCode ?? '—'
              const itemName = line.materialName ?? line.productName ?? '—'
              const canAdvance = order.status === 'ACTIVE' && line.lineStatus !== 'COMPLETED'
              return (
                <tr key={line.id} className="border-b border-gray-50 hover:bg-[#fafafa]">
                  <td className="px-4 py-3">
                    <span className={cn(
                      'rounded-full px-2.5 py-0.5 text-[11px] font-bold',
                      line.lineType === 'MATERIAL' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700',
                    )}>
                      {line.lineType === 'MATERIAL' ? 'Material' : 'Producción'}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={cn(
                      'rounded-full px-2.5 py-0.5 text-[11px] font-bold',
                      line.lineStatus === 'RESERVED' ? 'bg-emerald-100 text-emerald-700'
                      : line.lineStatus === 'PENDING' ? 'bg-amber-100 text-amber-700'
                      : line.lineStatus === 'IN_PRODUCTION' ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-slate-100 text-slate-500',
                    )}>
                      {LINE_STATUS_LABELS[line.lineStatus] ?? line.lineStatus}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="font-mono text-[12px] text-slate-500">{itemCode}</span>
                    <span className="ml-2 text-slate-700">{itemName}</span>
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-semibold text-[#374151]">{line.requiredQty.toFixed(3)}</td>
                  <td className="px-3 py-3 text-right font-mono text-slate-500">{line.inProcessQty.toFixed(3)}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-500">{line.finishedQty.toFixed(3)}</td>
                  {order.status === 'ACTIVE' && (
                    <td className="px-3 py-3 text-right">
                      {canAdvance && (
                        <button
                          onClick={() => setAdvancingLine(line)}
                          className="rounded-lg border border-[#fbbf24] px-3 py-1 text-[12px] font-semibold text-[#d97706] transition hover:bg-[#fbbf24]/10"
                        >
                          Avanzar
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {advancingLine && (
        <AdvanceLineDialog
          open
          line={advancingLine}
          orderId={orderId}
          onClose={() => setAdvancingLine(null)}
          onSuccess={handleAdvanceSuccess}
        />
      )}
    </>
  )
}

// ─── Detail panel (right side) ────────────────────────────────────────────────

type DetailTab = 'simulacion' | 'lineas'

function DetailPanel({ order }: { order: ProductionOrderResponse }) {
  const [tab, setTab] = useState<DetailTab>('simulacion')

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#f7f8fa]">
      <div className="shrink-0 border-b border-gray-100 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#fbbf24]/10">
            <Cog size={15} className="text-[#fbbf24]" />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#fbbf24]">
              #{order.orderNumber}
            </p>
            <p className="truncate text-[16px] font-bold text-[#111827]">{order.name}</p>
          </div>
          <div className="ml-auto">
            <StatusBadge status={order.status} />
          </div>
        </div>

        <div className="mt-4 flex gap-1 border-b border-gray-100">
          {(['simulacion', 'lineas'] as DetailTab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-4 pb-3 pt-1 text-[13px] font-semibold capitalize transition',
                tab === t
                  ? 'border-b-2 border-[#fbbf24] text-[#d97706]'
                  : 'text-slate-400 hover:text-slate-600',
              )}
            >
              {t === 'simulacion' ? 'Simulación' : 'Líneas'}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        {tab === 'simulacion' ? (
          <SimulacionTab order={order} />
        ) : (
          <LineasTab order={order} />
        )}
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyPanel() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 bg-[#f7f8fa] p-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-sm">
        <Cog size={26} strokeWidth={1.2} className="text-slate-300" />
      </div>
      <div>
        <p className="text-[15px] font-semibold text-slate-300">Seleccioná una orden</p>
        <p className="mt-1 text-[13px] text-slate-200">La simulación y las líneas aparecerán aquí</p>
      </div>
    </div>
  )
}

// ─── Left panel — order list ──────────────────────────────────────────────────

function OrderList({
  orders,
  isLoading,
  selected,
  onSelect,
}: {
  orders: ProductionOrderResponse[]
  isLoading: boolean
  selected: ProductionOrderResponse | null
  onSelect: (o: ProductionOrderResponse) => void
}) {
  const [q, setQ] = useState('')
  const filtered = orders.filter(o =>
    !q ||
    String(o.orderNumber).includes(q) ||
    o.name.toLowerCase().includes(q.toLowerCase()),
  )

  return (
    <div className="flex w-[320px] shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-gray-100 bg-[#f7f8fa] pl-5 pr-5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#fbbf24]/10">
          <Cog size={14} className="text-[#fbbf24]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-[#374151]">Órdenes</p>
          <p className="text-[11px] text-slate-400">{orders.length} órdenes</p>
        </div>
      </div>

      <div className="shrink-0 border-b border-gray-100 px-4 py-2.5">
        <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-[#f7f8fa] px-3 py-2 transition focus-within:border-[#fbbf24] focus-within:bg-white">
          <Search size={12} className="shrink-0 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar número o nombre..."
            value={q}
            onChange={e => setQ(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-[13px] text-slate-700 placeholder-slate-400 focus:outline-none"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
        {isLoading ? (
          <div className="flex h-28 items-center justify-center"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <div className="flex h-28 flex-col items-center justify-center gap-2">
            <Search size={20} strokeWidth={1.2} className="text-slate-200" />
            <p className="text-[13px] text-slate-300">Sin resultados</p>
          </div>
        ) : (
          filtered.map(order => {
            const isSel = selected?.id === order.id
            return (
              <div
                key={order.id}
                onClick={() => onSelect(order)}
                className={cn(
                  'group relative flex cursor-pointer flex-col gap-1.5 border-b border-gray-50 px-5 py-3.5 transition-colors duration-100',
                  isSel ? 'bg-[#fbbf24]/8' : 'hover:bg-[#fafafa]',
                )}
              >
                {isSel && <span className="absolute inset-y-0 left-0 w-0.5 rounded-r bg-[#fbbf24]" />}

                <div className="flex items-center gap-2">
                  <span className={cn(
                    'shrink-0 rounded-md px-2 py-0.5 font-mono text-[11px] font-bold',
                    isSel ? 'bg-[#fbbf24]/12 text-[#d97706]' : 'bg-slate-100 text-slate-500',
                  )}>
                    #{order.orderNumber}
                  </span>
                  <span className={cn(
                    'min-w-0 flex-1 truncate text-[13px] leading-snug',
                    isSel ? 'font-semibold text-[#92400e]' : 'font-medium text-[#374151]',
                  )}>
                    {order.name}
                  </span>
                </div>

                <div className="flex items-center justify-between pl-0.5">
                  <span className="text-[11px] text-slate-400">{order.entryDate}</span>
                  <StatusBadge status={order.status} />
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ProductionPage() {
  const [selected, setSelected] = useState<ProductionOrderResponse | null>(null)
  const [showNewOrder, setShowNewOrder] = useState(false)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<PageResponse<ProductionOrderResponse>>({
    queryKey: ['production-orders'],
    queryFn: () =>
      apiClient
        .get<PageResponse<ProductionOrderResponse>>('/production/orders', { params: { size: 100 } })
        .then(r => r.data),
  })

  const orders = data?.content ?? []

  function handleOrderCreated() {
    qc.invalidateQueries({ queryKey: ['production-orders'] })
  }

  function handleSelect(order: ProductionOrderResponse) {
    setSelected(order)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#f7f8fa]">
      <header className="relative flex h-12 shrink-0 items-center border-b border-gray-200 bg-white px-6">
        <span className="absolute inset-x-0 top-0 h-[3px] bg-[#fbbf24]" />
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
          <span className="text-sm text-slate-400">Producción</span>
          {selected && (
            <>
              <span className="text-slate-300">/</span>
              <span className="text-sm font-semibold text-[#d97706]">#{selected.orderNumber}</span>
            </>
          )}
        </div>
      </header>

      <div className="flex shrink-0 items-center gap-4 px-6 py-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#fbbf24]/10">
          <Cog size={20} className="text-[#fbbf24]" />
        </div>
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-[#111827]">Producción</h1>
          <p className="mt-0.5 text-[13px] text-slate-400">Órdenes de producción y simulación de BOM</p>
        </div>
        <div className="ml-auto">
          <button
            onClick={() => setShowNewOrder(true)}
            className="flex items-center gap-2 rounded-xl bg-[#fbbf24] px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[#f59e0b]"
          >
            <Plus size={14} />
            Nueva Orden
          </button>
        </div>
      </div>

      <div className="mx-6 mb-6 flex min-h-0 flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <OrderList
          orders={orders}
          isLoading={isLoading}
          selected={selected}
          onSelect={handleSelect}
        />

        {selected ? (
          <DetailPanel order={selected} />
        ) : (
          <EmptyPanel />
        )}
      </div>

      <NewOrderDialog
        open={showNewOrder}
        onClose={() => setShowNewOrder(false)}
        onCreated={handleOrderCreated}
      />
    </div>
  )
}
