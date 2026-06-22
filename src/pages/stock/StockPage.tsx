import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import {
  Search, Warehouse, Package, TrendingUp, TrendingDown,
  AlertTriangle, ArrowDownCircle, ArrowUpCircle, ChevronLeft, ChevronRight,
  FileSpreadsheet, X,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { apiClient } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { FormField, ErrorBanner } from '@/components/ui/form-field'
import { inputBase, inputError, textareaBase } from '@/components/ui/form-field'
import type {
  StockLevel, StockMovementRequest, StockMovementResponse, StockPage,
  StockVariable, StockMovementType,
} from '@/types/api.types'

// ─── Constants ────────────────────────────────────────────────────────────────

const VARIABLE_LABELS: Record<string, string> = {
  AVAILABLE:             'Disponible',
  FUTURE:                'Futuro',
  RESERVED_SALES:        'Reservado Ventas',
  SHORTAGE_SALES:        'Faltante Ventas',
  RESERVED_STOCK:        'Reservado Stock',
  SHORTAGE_STOCK:        'Faltante Stock',
  MAX:                   'Máximo',
  MIN:                   'Mínimo',
  MANAGE_SHORTAGE_SALES: 'Gestiona Falt. Ventas',
  MANAGE_SHORTAGE_STOCK: 'Gestiona Falt. Stock',
}

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  ENTRY_INVENTORY:                'Inventario',
  ENTRY_MANUFACTURING_ORDER:      'OT Fabricación',
  ENTRY_REMIT_FROM_THIRD:         'Remito de 3ros.',
  ENTRY_DELIVERY_NOTE_FROM_THIRD: 'Nota Entrega de 3ros.',
  ENTRY_UNPLANNED_STOCK:          'Stock No Planificado',
  ENTRY_UNEXPECTED_APPEARANCE:    'Aparición Imprevista',
  ENTRY_INVENTORY_ERROR:          'Error de Inventario',
  ENTRY_LOANED_STOCK:             'Stock en Préstamo',
  ENTRY_CONSIGNMENT_STOCK:        'Stock en Consignación',
  ENTRY_SAFETY_ADJUSTMENT:        'Ajuste Stock Seguridad',
  EXIT_REMIT_TO_THIRD:            'Remito a 3ros.',
  EXIT_DELIVERY_NOTE_TO_THIRD:    'Nota Entrega a 3ros.',
  EXIT_SALES_ORDER_BACKUP:        'Respaldo OT Venta',
  EXIT_STOCK_ORDER_BACKUP:        'Respaldo OT Stock',
  EXIT_PLANNED_OT_FAILURE:        'Fallo Cantidad OT',
  EXIT_UNEXPECTED_DISAPPEARANCE:  'Desaparición Imprevista',
  EXIT_QUALITY_REJECTION:         'Rechazo Calidad',
  EXIT_INVENTORY_ERROR:           'Error de Inventario',
  EXIT_LOANED_STOCK:              'Stock en Préstamo',
  EXIT_CONSIGNMENT_STOCK:         'Stock en Consignación',
  EXIT_SAFETY_ADJUSTMENT:         'Ajuste Stock Seguridad',
}

const BALANCE_VARIABLES: StockVariable[] = [
  'AVAILABLE', 'FUTURE', 'RESERVED_SALES', 'SHORTAGE_SALES',
  'RESERVED_STOCK', 'SHORTAGE_STOCK', 'MAX', 'MIN',
]

const ENTRY_TYPES: StockMovementType[] = [
  'ENTRY_INVENTORY', 'ENTRY_MANUFACTURING_ORDER', 'ENTRY_REMIT_FROM_THIRD',
  'ENTRY_DELIVERY_NOTE_FROM_THIRD', 'ENTRY_UNPLANNED_STOCK', 'ENTRY_UNEXPECTED_APPEARANCE',
  'ENTRY_INVENTORY_ERROR', 'ENTRY_LOANED_STOCK', 'ENTRY_CONSIGNMENT_STOCK',
  'ENTRY_SAFETY_ADJUSTMENT',
]

const EXIT_TYPES: StockMovementType[] = [
  'EXIT_REMIT_TO_THIRD', 'EXIT_DELIVERY_NOTE_TO_THIRD', 'EXIT_SALES_ORDER_BACKUP',
  'EXIT_STOCK_ORDER_BACKUP', 'EXIT_PLANNED_OT_FAILURE', 'EXIT_UNEXPECTED_DISAPPEARANCE',
  'EXIT_QUALITY_REJECTION', 'EXIT_INVENTORY_ERROR', 'EXIT_LOANED_STOCK',
  'EXIT_CONSIGNMENT_STOCK', 'EXIT_SAFETY_ADJUSTMENT',
]

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

// ─── Report variables ─────────────────────────────────────────────────────────

interface ReportVar {
  key: keyof StockLevel
  label: string
  boolean?: boolean
}

const REPORT_VARS: ReportVar[] = [
  { key: 'available',           label: 'Disponible' },
  { key: 'future',              label: 'Futuro Disponible' },
  { key: 'reservedSales',       label: 'Reservado Para Ventas' },
  { key: 'shortageSales',       label: 'Faltante Para Ventas' },
  { key: 'reservedStock',       label: 'Reservado Para Stock' },
  { key: 'shortageStock',       label: 'Faltante Para Stock' },
  { key: 'min',                 label: 'Mínimo' },
  { key: 'max',                 label: 'Máximo' },
  { key: 'manageShortageSales', label: 'Gestión De Faltantes Para Ventas', boolean: true },
  { key: 'manageShortageStock', label: 'Gestión De Faltantes Para Stock',  boolean: true },
]

function generateStockXLSX(levels: StockLevel[], selectedKeys: Set<keyof StockLevel>, onlyPositive: boolean) {
  const selected = REPORT_VARS.filter(v => selectedKeys.has(v.key))

  let rows = levels
  if (onlyPositive) {
    rows = levels.filter(l =>
      selected.some(v => {
        const val = l[v.key]
        return typeof val === 'boolean' ? val : (val as number) > 0
      }),
    )
  }

  const headers = ['ID', 'Código', 'Nombre', ...selected.map(v => v.label), 'Repo.Min.', 'Repo.Max.']

  const data = rows.map(l => {
    const repoMin = Math.max(0, l.min - (l.available + l.future))
    const repoMax = Math.max(0, l.max - (l.available + l.future))
    return [
      l.itemId,
      l.itemCode,
      l.itemName,
      ...selected.map(v => {
        const val = l[v.key]
        return v.boolean ? (val ? 'Sí' : 'No') : val
      }),
      +repoMin.toFixed(3),
      +repoMax.toFixed(3),
    ]
  })

  const ws = XLSX.utils.aoa_to_sheet([headers, ...data])
  ws['!cols'] = [
    { wch: 8 }, { wch: 14 }, { wch: 40 },
    ...selected.map(() => ({ wch: 18 })),
    { wch: 12 }, { wch: 12 },
  ]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Stock')
  XLSX.writeFile(wb, `reporte_stock_${todayISO()}.xlsx`)
}

// ─── Report dialog ────────────────────────────────────────────────────────────

function ReportDialog({ levels, open, onClose }: { levels: StockLevel[]; open: boolean; onClose: () => void }) {
  const [selected, setSelected] = useState<Set<keyof StockLevel>>(new Set())
  const [onlyPositive, setOnlyPositive] = useState(true)

  if (!open) return null

  const allSelected = selected.size === REPORT_VARS.length

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(REPORT_VARS.map(v => v.key)))
    }
  }

  function toggle(key: keyof StockLevel) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function handleDownload() {
    if (selected.size === 0) return
    generateStockXLSX(levels, selected, onlyPositive)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative w-[480px] rounded-2xl border border-gray-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
              <FileSpreadsheet size={16} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-[#111827]">Reporte de Stock</p>
              <p className="text-[12px] text-slate-400">Seleccionar variables a incluir</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 transition hover:bg-gray-100 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        </div>

        {/* Variable list */}
        <div className="px-6 pt-5 pb-2">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Variables</p>
            <label className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-500">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="h-4 w-4 rounded accent-[#2C6B2F]"
              />
              Seleccionar todas
            </label>
          </div>
          <div className="flex flex-col gap-1.5">
            {REPORT_VARS.map(v => (
              <label
                key={v.key}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-2.5 transition',
                  selected.has(v.key)
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-gray-100 bg-gray-50 text-slate-500 hover:border-gray-200',
                )}
              >
                <input
                  type="checkbox"
                  checked={selected.has(v.key)}
                  onChange={() => toggle(v.key)}
                  className="h-4 w-4 rounded accent-[#2C6B2F]"
                />
                <span className="text-[13px] font-medium">{v.label}</span>
                {v.boolean && (
                  <span className="ml-auto text-[11px] text-slate-400">booleano</span>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Options */}
        <div className="px-6 py-3">
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-100 px-4 py-2.5 text-[13px] text-slate-600 hover:border-gray-200">
            <input
              type="checkbox"
              checked={onlyPositive}
              onChange={e => setOnlyPositive(e.target.checked)}
              className="h-4 w-4 rounded accent-[#2C6B2F]"
            />
            Sólo valores stock superiores a cero
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
          <p className="text-[12px] text-slate-400">
            {selected.size === 0
              ? 'Seleccioná al menos una variable'
              : `${selected.size} variable${selected.size > 1 ? 's' : ''} seleccionada${selected.size > 1 ? 's' : ''}`
            }
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 px-4 py-2 text-[13px] font-medium text-slate-500 transition hover:border-gray-300 hover:text-slate-700"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={selected.size === 0}
              className={cn(
                'flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold transition',
                selected.size > 0
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'cursor-not-allowed bg-gray-100 text-slate-400',
              )}
            >
              <FileSpreadsheet size={14} />
              Descargar XLSX
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#2C6B2F] border-t-transparent" />
  )
}

// ─── Stock level card ─────────────────────────────────────────────────────────

function LevelTile({
  label, value, color, warning,
}: {
  label: string
  value: number | boolean
  color: string
  warning?: boolean
}) {
  const display = typeof value === 'boolean'
    ? (value ? 'Sí' : 'No')
    : value.toFixed(2)

  return (
    <div className="flex flex-col gap-1 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <div className="flex items-center gap-1.5 mt-1">
        {warning && <AlertTriangle size={13} className="shrink-0 text-amber-500" />}
        <p className={cn('text-[22px] font-bold leading-none tracking-tight', color)}>{display}</p>
      </div>
    </div>
  )
}

function NivelesTab({ level }: { level: StockLevel }) {
  const belowMin = level.available < level.min

  return (
    <div className="flex flex-col gap-5">
      {belowMin && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
          <AlertTriangle size={15} className="shrink-0 text-amber-600" />
          <p className="text-[14px] text-amber-700">
            Stock disponible por debajo del mínimo configurado
          </p>
        </div>
      )}

      <div>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Balance</p>
        <div className="grid grid-cols-2 gap-3">
          <LevelTile
            label="Disponible"
            value={level.available}
            color={level.available > 0 ? 'text-emerald-600' : 'text-red-500'}
            warning={belowMin}
          />
          <LevelTile label="Futuro" value={level.future} color="text-indigo-500" />
          <LevelTile label="Reservado Ventas" value={level.reservedSales} color="text-indigo-500" />
          <LevelTile
            label="Faltante Ventas"
            value={level.shortageSales}
            color={level.shortageSales > 0 ? 'text-amber-500' : 'text-slate-400'}
          />
          <LevelTile label="Reservado Stock" value={level.reservedStock} color="text-indigo-500" />
          <LevelTile
            label="Faltante Stock"
            value={level.shortageStock}
            color={level.shortageStock > 0 ? 'text-amber-500' : 'text-slate-400'}
          />
        </div>
      </div>

      <div>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Límites</p>
        <div className="grid grid-cols-2 gap-3">
          <LevelTile label="Mínimo" value={level.min} color="text-slate-500" />
          <LevelTile label="Máximo" value={level.max} color="text-slate-500" />
        </div>
      </div>

      <div>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Gestión de faltantes</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-[13px] text-slate-500">Falt. Ventas</p>
            <span className={cn(
              'rounded-full px-2.5 py-1 text-[11px] font-bold',
              level.manageShortageSales
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-slate-100 text-slate-400',
            )}>
              {level.manageShortageSales ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-[13px] text-slate-500">Falt. Stock</p>
            <span className={cn(
              'rounded-full px-2.5 py-1 text-[11px] font-bold',
              level.manageShortageStock
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-slate-100 text-slate-400',
            )}>
              {level.manageShortageStock ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Movement form ────────────────────────────────────────────────────────────

interface MovFormValues {
  entry: boolean
  stockVariable: StockVariable
  movementType: StockMovementType
  amount: string
  movementDate: string
  actorName: string
  relatedDocument: string
  memo: string
  applyRules: boolean
}

function MovimientoForm({ itemId, onSuccess }: { itemId: number; onSuccess: () => void }) {
  const [isEntry, setIsEntry] = useState(true)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<MovFormValues>({
    defaultValues: {
      entry: true,
      stockVariable: 'AVAILABLE',
      movementType: 'ENTRY_INVENTORY',
      amount: '',
      movementDate: todayISO(),
      actorName: '',
      relatedDocument: '',
      memo: '',
      applyRules: false,
    },
  })

  const currentType = watch('movementType')

  const mutation = useMutation({
    mutationFn: (body: StockMovementRequest) =>
      apiClient.post<StockMovementResponse>('/stock/movements', body),
    onSuccess: () => {
      reset({
        entry: isEntry,
        stockVariable: 'AVAILABLE',
        movementType: isEntry ? 'ENTRY_INVENTORY' : 'EXIT_REMIT_TO_THIRD',
        amount: '',
        movementDate: todayISO(),
        actorName: '',
        relatedDocument: '',
        memo: '',
        applyRules: false,
      })
      setSubmitError(null)
      onSuccess()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setSubmitError(msg ?? 'No se pudo registrar el movimiento.')
    },
  })

  function handleToggle(entry: boolean) {
    setIsEntry(entry)
    setValue('entry', entry)
    setValue('movementType', entry ? 'ENTRY_INVENTORY' : 'EXIT_REMIT_TO_THIRD')
  }

  function onSubmit(values: MovFormValues) {
    setSubmitError(null)
    const body: StockMovementRequest = {
      itemId,
      entry: isEntry,
      stockVariable: values.stockVariable,
      amount: parseFloat(values.amount),
      movementType: values.movementType,
      applyRules: values.applyRules,
      movementDate: values.movementDate,
      actorName:       values.actorName || undefined,
      relatedDocument: values.relatedDocument || undefined,
      memo:            values.memo || undefined,
    }
    mutation.mutate(body)
  }

  const directionTypes = isEntry ? ENTRY_TYPES : EXIT_TYPES

  // Keep movementType in sync when direction changes
  const isTypeValid = directionTypes.includes(currentType as StockMovementType)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      {/* Entry / Exit toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleToggle(true)}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-[14px] font-semibold transition',
            isEntry
              ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
              : 'border-gray-200 bg-white text-slate-400 hover:border-gray-300 hover:text-slate-500',
          )}
        >
          <ArrowDownCircle size={16} />
          Entrada
        </button>
        <button
          type="button"
          onClick={() => handleToggle(false)}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-[14px] font-semibold transition',
            !isEntry
              ? 'border-red-400 bg-red-50 text-red-600'
              : 'border-gray-200 bg-white text-slate-400 hover:border-gray-300 hover:text-slate-500',
          )}
        >
          <ArrowUpCircle size={16} />
          Salida
        </button>
      </div>

      {/* Variable + Type */}
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Variable de stock" required>
          <select
            {...register('stockVariable', { required: true })}
            className={cn(inputBase, errors.stockVariable && inputError)}
          >
            {BALANCE_VARIABLES.map(v => (
              <option key={v} value={v}>{VARIABLE_LABELS[v]}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Tipo de movimiento" required>
          <select
            {...register('movementType', { required: true })}
            className={cn(inputBase, errors.movementType && inputError)}
          >
            {!isTypeValid && (
              <option value="" disabled>Seleccionar...</option>
            )}
            {directionTypes.map(t => (
              <option key={t} value={t}>{MOVEMENT_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </FormField>
      </div>

      {/* Amount + Date */}
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Cantidad" required error={errors.amount ? 'Requerido, mayor a 0' : undefined}>
          <input
            type="number"
            step="any"
            min="0.001"
            {...register('amount', { required: true, min: 0.001 })}
            className={cn(inputBase, errors.amount && inputError)}
            placeholder="0.00"
          />
        </FormField>

        <FormField label="Fecha" required error={errors.movementDate ? 'Requerida' : undefined}>
          <input
            type="date"
            {...register('movementDate', { required: true })}
            className={cn(inputBase, errors.movementDate && inputError)}
          />
        </FormField>
      </div>

      {/* Actor + Document */}
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Actor" optional>
          <input
            {...register('actorName')}
            className={inputBase}
            placeholder="Ej: Proveedor SA"
          />
        </FormField>

        <FormField label="Documento" optional>
          <input
            {...register('relatedDocument')}
            className={inputBase}
            placeholder="Ej: REM-00123"
          />
        </FormField>
      </div>

      {/* Memo */}
      <FormField label="Memo" optional>
        <textarea
          {...register('memo')}
          rows={2}
          className={textareaBase}
          placeholder="Observaciones del movimiento..."
        />
      </FormField>

      {/* Apply rules */}
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-[#f7f8fa] px-4 py-3.5 transition hover:bg-white">
        <input
          type="checkbox"
          {...register('applyRules')}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-[#2C6B2F]"
        />
        <div>
          <p className="text-[14px] font-medium text-[#374151]">Aplicar reglas automáticas</p>
          <p className="mt-0.5 text-[12px] text-slate-400">
            Si está activo, el sistema propagará el movimiento según las reglas de faltantes configuradas para este ítem.
          </p>
        </div>
      </label>

      {submitError && <ErrorBanner message={submitError} />}

      <button
        type="submit"
        disabled={mutation.isPending}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#2C6B2F] text-[14px] font-semibold text-white shadow-sm transition hover:bg-[#245A27] active:bg-[#1E4B21] disabled:opacity-50"
      >
        {mutation.isPending ? (
          <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Registrando...</>
        ) : (
          <>
            {isEntry ? <ArrowDownCircle size={15} /> : <ArrowUpCircle size={15} />}
            Registrar movimiento
          </>
        )}
      </button>
    </form>
  )
}

// ─── Movement history table ───────────────────────────────────────────────────

function MovimientosHistory({ itemId }: { itemId: number }) {
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 10

  const { data, isLoading } = useQuery<StockPage>({
    queryKey: ['stock-movements', itemId, page],
    queryFn: () =>
      apiClient
        .get<StockPage>('/stock/movements', {
          params: { itemId, page, size: PAGE_SIZE, sort: 'movementDate,desc' },
        })
        .then(r => r.data),
  })

  const movements: StockMovementResponse[] = data?.content ?? []
  const totalPages = data?.totalPages ?? 0

  if (isLoading) {
    return (
      <div className="flex h-24 items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (movements.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-slate-300">
        <TrendingDown size={28} strokeWidth={1.2} />
        <p className="text-[13px]">Sin movimientos registrados</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-xl border border-gray-100">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-gray-100 bg-[#f7f8fa]">
              <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Fecha</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Dir.</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Variable</th>
              <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">Cant.</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Tipo</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Actor</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Documento</th>
            </tr>
          </thead>
          <tbody>
            {movements.map(mv => (
              <tr key={mv.id} className="border-b border-gray-50 hover:bg-[#fafafa]">
                <td className="px-4 py-3 font-mono text-[12px] text-slate-500">{mv.movementDate}</td>
                <td className="px-3 py-3">
                  {mv.entry ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                      <ArrowDownCircle size={10} /> E
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-600">
                      <ArrowUpCircle size={10} /> S
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {mv.stockVariableLabel || VARIABLE_LABELS[mv.stockVariable] || mv.stockVariable}
                </td>
                <td className="px-3 py-3 text-right font-mono font-semibold text-[#374151]">
                  {mv.amount.toFixed(2)}
                </td>
                <td className="px-3 py-3 text-slate-500">
                  {MOVEMENT_TYPE_LABELS[mv.movementType] || mv.movementType}
                </td>
                <td className="px-3 py-3 text-slate-500">{mv.actorName ?? '—'}</td>
                <td className="px-4 py-3 font-mono text-[12px] text-slate-400">{mv.relatedDocument ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-[12px] text-slate-400">
            Página {page + 1} de {totalPages} — {data?.totalElements} movimientos
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-slate-400 transition hover:border-gray-300 hover:text-slate-600 disabled:opacity-30"
            >
              <ChevronLeft size={13} />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-slate-400 transition hover:border-gray-300 hover:text-slate-600 disabled:opacity-30"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Movements tab (form + history) ──────────────────────────────────────────

function MovimientosTab({ itemId }: { itemId: number }) {
  const qc = useQueryClient()

  function handleSuccess() {
    qc.invalidateQueries({ queryKey: ['stock-movements', itemId] })
    qc.invalidateQueries({ queryKey: ['stock-levels'] })
    qc.invalidateQueries({ queryKey: ['stock-level', itemId] })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-[#f7f8fa] p-5">
        <p className="mb-4 text-[13px] font-semibold uppercase tracking-wide text-slate-400">
          Registrar movimiento
        </p>
        <MovimientoForm itemId={itemId} onSuccess={handleSuccess} />
      </div>

      <div>
        <p className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-slate-400">
          Historial
        </p>
        <MovimientosHistory itemId={itemId} />
      </div>
    </div>
  )
}

// ─── Right panel (detail for selected item) ───────────────────────────────────

type Tab = 'niveles' | 'movimientos'

function DetailPanel({ level }: { level: StockLevel }) {
  const [tab, setTab] = useState<Tab>('niveles')

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#f7f8fa]">
      {/* Item header */}
      <div className="shrink-0 border-b border-gray-100 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2C6B2F]/10">
            <Package size={15} className="text-[#2C6B2F]" />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#2C6B2F]">
              {level.itemCode}
            </p>
            <p className="truncate text-[16px] font-bold text-[#111827]">{level.itemName}</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wider text-slate-400">Disponible</p>
              <p className={cn(
                'text-[22px] font-bold leading-none',
                level.available > 0 ? 'text-emerald-600' : 'text-red-500',
              )}>
                {level.available.toFixed(2)}
              </p>
            </div>
            {level.available < level.min && (
              <AlertTriangle size={18} className="text-amber-500" />
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className="mt-4 flex gap-1 border-b border-gray-100">
          {(['niveles', 'movimientos'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-4 pb-3 pt-1 text-[13px] font-semibold capitalize transition',
                tab === t
                  ? 'border-b-2 border-[#2C6B2F] text-[#2C6B2F]'
                  : 'text-slate-400 hover:text-slate-600',
              )}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        {tab === 'niveles' ? (
          <NivelesTab level={level} />
        ) : (
          <MovimientosTab itemId={level.itemId} />
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
        <Warehouse size={26} strokeWidth={1.2} className="text-slate-300" />
      </div>
      <div>
        <p className="text-[15px] font-semibold text-slate-300">Seleccioná un artículo</p>
        <p className="mt-1 text-[13px] text-slate-200">Los niveles de stock aparecerán aquí</p>
      </div>
    </div>
  )
}

// ─── Left panel — item list ───────────────────────────────────────────────────

function ItemList({
  levels,
  isLoading,
  selected,
  onSelect,
}: {
  levels: StockLevel[]
  isLoading: boolean
  selected: StockLevel | null
  onSelect: (l: StockLevel) => void
}) {
  const [q, setQ] = useState('')
  const filtered = levels.filter(l =>
    !q ||
    l.itemCode.toLowerCase().includes(q) ||
    l.itemName.toLowerCase().includes(q),
  )

  return (
    <div className="flex w-[320px] shrink-0 flex-col border-r border-gray-200 bg-white">
      {/* Header */}
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-gray-100 bg-[#f7f8fa] pl-5 pr-5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#2C6B2F]/10">
          <Warehouse size={14} className="text-[#2C6B2F]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-[#374151]">Artículos</p>
          <p className="text-[11px] text-slate-400">{levels.length} artículos</p>
        </div>
      </div>

      {/* Search */}
      <div className="shrink-0 border-b border-gray-100 px-4 py-2.5">
        <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-[#f7f8fa] px-3 py-2 transition focus-within:border-[#2C6B2F] focus-within:bg-white">
          <Search size={12} className="shrink-0 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar código o nombre..."
            value={q}
            onChange={e => setQ(e.target.value.toLowerCase())}
            className="min-w-0 flex-1 bg-transparent text-[13px] text-slate-700 placeholder-slate-400 focus:outline-none"
          />
        </label>
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
        {isLoading ? (
          <div className="flex h-28 items-center justify-center">
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-28 flex-col items-center justify-center gap-2">
            <Search size={20} strokeWidth={1.2} className="text-slate-200" />
            <p className="text-[13px] text-slate-300">Sin resultados</p>
          </div>
        ) : (
          filtered.map(level => {
            const isSel = selected?.itemId === level.itemId
            const belowMin = level.available < level.min

            return (
              <div
                key={level.itemId}
                onClick={() => onSelect(level)}
                className={cn(
                  'group relative flex cursor-pointer flex-col gap-1.5 border-b border-gray-50 px-5 py-3.5 transition-colors duration-100',
                  isSel ? 'bg-[#2C6B2F]/8' : 'hover:bg-[#fafafa]',
                )}
              >
                {isSel && <span className="absolute inset-y-0 left-0 w-0.5 rounded-r bg-[#2C6B2F]" />}

                <div className="flex items-center gap-2">
                  <span className={cn(
                    'shrink-0 rounded-md px-2 py-0.5 font-mono text-[11px] font-bold',
                    isSel ? 'bg-[#2C6B2F]/12 text-[#2C6B2F]' : 'bg-slate-100 text-slate-500',
                  )}>
                    {level.itemCode}
                  </span>
                  <span className={cn(
                    'min-w-0 flex-1 truncate text-[13px] leading-snug',
                    isSel ? 'font-semibold text-[#1a3d1c]' : 'font-medium text-[#374151]',
                  )}>
                    {level.itemName}
                  </span>
                </div>

                <div className="flex items-center gap-3 pl-0.5">
                  {/* Available */}
                  <div className="flex items-center gap-1">
                    {belowMin && <AlertTriangle size={10} className="text-amber-500" />}
                    <span className={cn(
                      'text-[12px] font-semibold',
                      level.available > 0 && !belowMin ? 'text-emerald-600' : 'text-red-500',
                    )}>
                      {level.available.toFixed(2)}
                    </span>
                    <span className="text-[11px] text-slate-400">disp.</span>
                  </div>

                  {/* Min */}
                  <div className="flex items-center gap-1">
                    <span className="text-[12px] text-slate-400">min {level.min.toFixed(2)}</span>
                  </div>

                  {/* Shortages */}
                  {(level.shortageSales > 0 || level.shortageStock > 0) && (
                    <div className="ml-auto flex gap-1">
                      {level.shortageSales > 0 && (
                        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">
                          FV {level.shortageSales.toFixed(0)}
                        </span>
                      )}
                      {level.shortageStock > 0 && (
                        <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-600">
                          FS {level.shortageStock.toFixed(0)}
                        </span>
                      )}
                    </div>
                  )}
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

export function StockPage() {
  const [selected, setSelected] = useState<StockLevel | null>(null)
  const [showReport, setShowReport] = useState(false)

  const { data: levels = [], isLoading } = useQuery<StockLevel[]>({
    queryKey: ['stock-levels'],
    queryFn: () => apiClient.get<StockLevel[]>('/stock/items/levels').then(r => r.data),
  })

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#f7f8fa]">
      {/* Topbar */}
      <header className="relative flex h-12 shrink-0 items-center border-b border-gray-200 bg-white px-6">
        <span className="absolute inset-x-0 top-0 h-[3px] bg-[#2C6B2F]" />
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
          <span className="text-sm text-slate-400">Stock</span>
          {selected && (
            <>
              <span className="text-slate-300">/</span>
              <span className="text-sm font-semibold text-[#2C6B2F]">{selected.itemCode}</span>
            </>
          )}
        </div>
      </header>

      {/* Page heading */}
      <div className="flex shrink-0 items-center gap-4 px-6 py-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#2C6B2F]/10">
          <Warehouse size={20} className="text-[#2C6B2F]" />
        </div>
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-[#111827]">Stock</h1>
          <p className="mt-0.5 text-[13px] text-slate-400">Niveles y movimientos de inventario</p>
        </div>
        {/* Summary badges + report button */}
        <div className="ml-auto flex items-center gap-3">
          {!isLoading && levels.length > 0 && (
            <>
              <div className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-[12px] font-semibold text-amber-600">
                <AlertTriangle size={12} />
                {levels.filter(l => l.available < l.min).length} bajo mínimo
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[12px] font-semibold text-emerald-600">
                <TrendingUp size={12} />
                {levels.filter(l => l.available > 0).length} con stock
              </div>
            </>
          )}
          <button
            onClick={() => setShowReport(true)}
            className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-[13px] font-semibold text-emerald-700 transition hover:bg-emerald-100"
          >
            <FileSpreadsheet size={14} />
            Reporte XLSX
          </button>
        </div>
      </div>

      {/* Main panel */}
      <div className="mx-6 mb-6 flex min-h-0 flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <ItemList
          levels={levels}
          isLoading={isLoading}
          selected={selected}
          onSelect={setSelected}
        />

        {selected ? (
          <DetailPanel level={selected} />
        ) : (
          <EmptyPanel />
        )}
      </div>

      <ReportDialog
        levels={levels}
        open={showReport}
        onClose={() => setShowReport(false)}
      />
    </div>
  )
}
