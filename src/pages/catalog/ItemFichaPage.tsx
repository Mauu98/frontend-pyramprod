import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  ArrowLeft, Package2, AlertTriangle, Pencil, Trash2, Plus, Check, X, Search,
  Image as ImageIcon, Download,
} from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import type { ItemDetail } from '@/types/api.types'
import { cn } from '@/lib/utils'
import { FormDialog } from '@/components/ui/form-dialog'
import { FormActions, ErrorBanner } from '@/components/ui/form-field'
import { inputBase } from '@/components/ui/form-tokens'

// ─── Local types ──────────────────────────────────────────────────────────────

interface FormulaLine {
  id: number
  componentId: number
  componentCode: string
  componentName: string
  componentUnit: string | null
  quantity: number
  sortOrder: number
  memo: string | null
}

interface ItemSearchResult {
  id: number
  fullCode: string
  fullName: string
  abbreviation: string | null
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined, dec = 2) {
  if (n == null) return '—'
  return n.toLocaleString('es-AR', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

function fmtDate(d: string | null | undefined) {
  if (!d) return null
  return new Date(d).toLocaleDateString('es-AR')
}

// ─── Shared UI atoms ──────────────────────────────────────────────────────────

function StatCard({ label, value, sub, variant = 'default' }: {
  label: string
  value: string | number
  sub?: string
  variant?: 'default' | 'success' | 'warning' | 'danger'
}) {
  const colors: Record<string, string> = {
    default: 'text-[#101828]',
    success: 'text-[#2C6B2F]',
    warning: 'text-amber-600',
    danger: 'text-red-600',
  }
  return (
    <div className="rounded-xl border border-[#E4E7EC] bg-white px-5 py-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#98A2B3]">{label}</p>
      <p className={cn('mt-1.5 text-[24px] font-bold leading-none', colors[variant])}>
        {typeof value === 'number' ? fmt(value) : value}
      </p>
      {sub && <p className="mt-1 text-[12px] text-[#667085]">{sub}</p>}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (value == null || value === '' || value === '—') return null
  return (
    <div className="flex items-baseline gap-3 border-b border-[#F2F4F7] py-2.5 last:border-0">
      <span className="w-[148px] shrink-0 text-[13px] text-[#98A2B3]">{label}</span>
      <span className="text-[14px] font-medium text-[#344054]">{value}</span>
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#E4E7EC] bg-white">
      <div className="border-b border-[#F2F4F7] px-6 py-4">
        <h3 className="text-[12px] font-bold uppercase tracking-[0.1em] text-[#667085]">{title}</h3>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}

// ─── BOM row (view / edit / delete states) ────────────────────────────────────

function FormulaRow({
  line, isEditing, isDeleting,
  onEdit, onCancelEdit, onSaveEdit,
  onDelete, onConfirmDelete, onCancelDelete,
  savePending, deletePending,
}: {
  line: FormulaLine
  isEditing: boolean
  isDeleting: boolean
  onEdit: () => void
  onCancelEdit: () => void
  onSaveEdit: (qty: number, memo: string) => void
  onDelete: () => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
  savePending: boolean
  deletePending: boolean
}) {
  const [qty, setQty] = useState(String(line.quantity))
  const [memo, setMemo] = useState(line.memo ?? '')

  useEffect(() => {
    if (isEditing) {
      setQty(String(line.quantity))
      setMemo(line.memo ?? '')
    }
  }, [isEditing, line.quantity, line.memo])

  if (isDeleting) {
    return (
      <tr className="border-b border-red-100 bg-red-50/60">
        <td colSpan={7} className="px-6 py-3">
          <div className="flex items-center gap-3">
            <AlertTriangle size={14} className="shrink-0 text-red-500" />
            <span className="text-[13px] text-red-700">
              ¿Eliminar <strong>{line.componentCode}</strong>?
            </span>
            <div className="ml-auto flex gap-2">
              <button onClick={onCancelDelete} className="text-[13px] text-[#667085] hover:text-[#344054]">
                Cancelar
              </button>
              <button
                onClick={onConfirmDelete}
                disabled={deletePending}
                className="rounded-lg bg-red-600 px-3 py-1 text-[13px] font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deletePending ? '...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </td>
      </tr>
    )
  }

  if (isEditing) {
    return (
      <tr className="border-b border-[#E4E7EC] bg-[#F9FAFB]">
        <td className="px-6 py-2 text-[13px] text-[#98A2B3]">{line.sortOrder}</td>
        <td className="px-3 py-2 font-mono text-[13px] text-[#344054]">{line.componentCode}</td>
        <td className="px-3 py-2 text-[13px] text-[#667085]">{line.componentName}</td>
        <td className="px-3 py-2 text-[13px] text-[#98A2B3]">{line.componentUnit ?? '—'}</td>
        <td className="px-3 py-2">
          <input
            type="number"
            step="0.001"
            min="0.001"
            value={qty}
            onChange={e => setQty(e.target.value)}
            className="w-28 rounded-lg border border-[#2C6B2F] px-2 py-1.5 text-right text-[14px] focus:outline-none focus:ring-2 focus:ring-[#2C6B2F]/20"
          />
        </td>
        <td className="px-3 py-2">
          <input
            value={memo}
            onChange={e => setMemo(e.target.value)}
            className="w-full rounded-lg border border-[#D0D5DD] px-2 py-1.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#2C6B2F]/20"
            placeholder="memo"
          />
        </td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onSaveEdit(Number(qty), memo)}
              disabled={savePending || !qty || Number(qty) <= 0}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2C6B2F] text-white hover:bg-[#245A27] disabled:opacity-40"
            >
              <Check size={13} strokeWidth={2.5} />
            </button>
            <button
              onClick={onCancelEdit}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#E4E7EC] text-[#98A2B3] hover:text-[#344054]"
            >
              <X size={13} strokeWidth={2} />
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className="border-b border-[#F2F4F7] hover:bg-[#F9FAFB]">
      <td className="px-6 py-3 text-[13px] text-[#98A2B3]">{line.sortOrder}</td>
      <td className="px-3 py-3 font-mono text-[13px] text-[#344054]">{line.componentCode}</td>
      <td className="px-3 py-3 text-[14px] text-[#101828]">{line.componentName}</td>
      <td className="px-3 py-3 text-[13px] text-[#667085]">{line.componentUnit ?? '—'}</td>
      <td className="px-3 py-3 text-right text-[14px] font-semibold text-[#101828]">{fmt(line.quantity, 3)}</td>
      <td className="px-3 py-3 text-[13px] text-[#667085]">{line.memo ?? '—'}</td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#98A2B3] hover:bg-[#F2F4F7] hover:text-[#344054]"
          >
            <Pencil size={13} strokeWidth={2} />
          </button>
          <button
            onClick={onDelete}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#98A2B3] hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 size={13} strokeWidth={2} />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ─── Add formula dialog ────────────────────────────────────────────────────────

function AddFormulaDialog({ open, onClose, productId, onSaved }: {
  open: boolean
  onClose: () => void
  productId: number
  onSaved: () => void
}) {
  const [searchText, setSearchText] = useState('')
  const [results, setResults] = useState<ItemSearchResult[]>([])
  const [selected, setSelected] = useState<ItemSearchResult | null>(null)
  const [showDrop, setShowDrop] = useState(false)
  const [quantity, setQuantity] = useState('')
  const [memo, setMemo] = useState('')
  const [apiError, setApiError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (!open) {
      setSearchText(''); setResults([]); setSelected(null)
      setShowDrop(false); setQuantity(''); setMemo(''); setApiError(null)
    }
  }, [open])

  const handleSearch = (text: string) => {
    setSearchText(text)
    setSelected(null)
    clearTimeout(debounceRef.current)
    if (text.length < 2) { setResults([]); setShowDrop(false); return }
    debounceRef.current = setTimeout(async () => {
      const res = await apiClient.get(`/items/search?q=${encodeURIComponent(text)}`)
      setResults(res.data)
      setShowDrop(true)
    }, 300)
  }

  const mut = useMutation({
    mutationFn: (_: undefined) => apiClient.post('/formulas', {
      productId,
      componentId: selected!.id,
      quantity: Number(quantity),
      memo: memo || null,
    }),
    onSuccess: () => { onSaved(); onClose() },
    onError: () => setApiError('No se pudo agregar la línea.'),
  })

  const canSubmit = selected && quantity && Number(quantity) > 0

  return (
    <FormDialog open={open} title="Agregar línea a fórmula" onClose={onClose} width="w-[500px]">
      <form
        onSubmit={e => { e.preventDefault(); if (canSubmit) mut.mutate(undefined) }}
        className="flex flex-col gap-7"
      >
        {/* Component search */}
        <div className="flex flex-col gap-2">
          <label className="text-[14px] font-medium text-[#344054]">
            Componente <span className="ml-1 text-red-500">*</span>
          </label>
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
            <input
              value={selected ? `${selected.fullCode} — ${selected.fullName}` : searchText}
              onChange={e => handleSearch(e.target.value)}
              onFocus={() => {
                if (selected) { setSelected(null); setSearchText('') }
                if (results.length) setShowDrop(true)
              }}
              className={cn(inputBase, 'pl-9')}
              placeholder="Buscar por código o nombre..."
            />
            {showDrop && results.length > 0 && (
              <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-xl border border-[#E4E7EC] bg-white shadow-xl">
                {results.slice(0, 8).map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => { setSelected(r); setShowDrop(false) }}
                    className="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-[#F9FAFB]"
                  >
                    <span className="shrink-0 font-mono text-[12px] text-[#667085]">{r.fullCode}</span>
                    <span className="text-[14px] text-[#101828]">{r.fullName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-medium text-[#344054]">
              Cantidad <span className="ml-1 text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.001"
              min="0.001"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              className={cn(inputBase, 'text-right')}
              placeholder="1.000"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-medium text-[#344054]">
              Memo <span className="ml-2 text-[13px] font-normal text-[#98A2B3]">opcional</span>
            </label>
            <input
              value={memo}
              onChange={e => setMemo(e.target.value)}
              className={inputBase}
              placeholder="Nota..."
            />
          </div>
        </div>

        {apiError && <ErrorBanner message={apiError} />}
        <FormActions pending={mut.isPending} isEdit={false} label="Agregar línea" onClose={onClose} />
      </form>
    </FormDialog>
  )
}

// ─── Image section ────────────────────────────────────────────────────────────

function ImageSection({ itemId }: { itemId: number }) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [hasImage, setHasImage] = useState<boolean | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let url: string | null = null
    setHasImage(null)
    apiClient.get<Blob>(`/items/${itemId}/image`, { responseType: 'blob' })
      .then(res => {
        url = URL.createObjectURL(res.data)
        setObjectUrl(url)
        setHasImage(true)
      })
      .catch(() => { setObjectUrl(null); setHasImage(false) })
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [itemId, reloadKey])

  const uploadMut = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData()
      fd.append('file', file)
      return apiClient.post(`/items/${itemId}/image`, fd)
    },
    onSuccess: () => setReloadKey(k => k + 1),
  })

  return (
    <SectionCard title="Imagen">
      <div className="flex flex-col gap-4">
        {hasImage === null ? (
          <div className="h-44 animate-pulse rounded-lg bg-[#F2F4F7]" />
        ) : hasImage && objectUrl ? (
          <img src={objectUrl} alt="" className="h-44 w-full rounded-lg object-contain" />
        ) : (
          <div className="flex h-44 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#E4E7EC] text-[#98A2B3]">
            <ImageIcon size={26} strokeWidth={1.5} />
            <p className="text-[13px]">Sin imagen</p>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadMut.mutate(f); e.target.value = '' }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploadMut.isPending}
          className="w-full rounded-lg border border-[#E4E7EC] py-2 text-[13px] font-medium text-[#344054] transition hover:bg-[#F9FAFB] disabled:opacity-50"
        >
          {uploadMut.isPending ? 'Subiendo...' : hasImage ? 'Cambiar imagen' : 'Subir imagen'}
        </button>
      </div>
    </SectionCard>
  )
}

// ─── BOM section ──────────────────────────────────────────────────────────────

function FormulaSection({ itemId }: { itemId: number }) {
  const qc = useQueryClient()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  const { data: lines = [] } = useQuery<FormulaLine[]>({
    queryKey: ['formulas', itemId],
    queryFn: () => apiClient.get<FormulaLine[]>(`/formulas?productId=${itemId}`).then(r => r.data),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['formulas', itemId] })

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/formulas/${id}`),
    onSuccess: () => { setDeletingId(null); invalidate() },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, quantity, memo }: { id: number; quantity: number; memo: string }) =>
      apiClient.put(`/formulas/${id}`, { quantity, memo: memo || null }),
    onSuccess: () => { setEditingId(null); invalidate() },
  })

  return (
    <div className="rounded-xl border border-[#E4E7EC] bg-white">
      <div className="flex items-center justify-between border-b border-[#F2F4F7] px-6 py-4">
        <h3 className="text-[12px] font-bold uppercase tracking-[0.1em] text-[#667085]">
          Fórmula / BOM
        </h3>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-[#2C6B2F] px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-[#245A27] transition-colors"
        >
          <Plus size={14} strokeWidth={2.5} />
          Agregar
        </button>
      </div>

      {lines.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-[#98A2B3]">
          <Package2 size={28} strokeWidth={1.5} />
          <p className="text-[14px]">Sin líneas de fórmula</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b border-[#F2F4F7] text-left">
                <th className="w-12 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-[#98A2B3]">#</th>
                <th className="px-3 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-[#98A2B3]">Código</th>
                <th className="px-3 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-[#98A2B3]">Nombre</th>
                <th className="px-3 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-[#98A2B3]">Unid.</th>
                <th className="px-3 py-3 text-right text-[11px] font-bold uppercase tracking-[0.1em] text-[#98A2B3]">Cantidad</th>
                <th className="px-3 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-[#98A2B3]">Memo</th>
                <th className="w-20 px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map(line => (
                <FormulaRow
                  key={line.id}
                  line={line}
                  isEditing={editingId === line.id}
                  isDeleting={deletingId === line.id}
                  onEdit={() => setEditingId(line.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onSaveEdit={(qty, memo) => updateMut.mutate({ id: line.id, quantity: qty, memo })}
                  onDelete={() => setDeletingId(line.id)}
                  onConfirmDelete={() => deleteMut.mutate(line.id)}
                  onCancelDelete={() => setDeletingId(null)}
                  savePending={updateMut.isPending}
                  deletePending={deleteMut.isPending}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddFormulaDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        productId={itemId}
        onSaved={invalidate}
      />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ItemFichaPage({ itemId }: { itemId: number }) {
  const { data: item, isLoading } = useQuery<ItemDetail>({
    queryKey: ['item-detail', itemId],
    queryFn: () => apiClient.get<ItemDetail>(`/items/${itemId}`).then(r => r.data),
  })

  if (isLoading) {
    return <div className="flex h-full items-center justify-center text-[14px] text-[#98A2B3]">Cargando ficha...</div>
  }

  if (!item) {
    return <div className="flex h-full items-center justify-center text-[14px] text-[#98A2B3]">Item no encontrado</div>
  }

  const stockVariant =
    item.stockAvailable <= 0 ? 'danger'
    : item.stockAvailable < item.stockMin ? 'warning'
    : 'success'

  const hasNotes = item.productionMemo || item.observations || item.operationComplement

  const downloadDestinos = async () => {
    const res = await apiClient.get<Blob>(`/items/${itemId}/export/used-in`, { responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url
    a.download = `destinos-${item.fullCode}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#f4f5f7]">
      {/* Sticky header */}
      <div className="flex shrink-0 items-center gap-4 border-b border-[#E4E7EC] bg-white px-6 py-4">
        <Link
          to="/app/catalog"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E4E7EC] text-[#667085] transition hover:bg-[#F9FAFB] hover:text-[#344054]"
        >
          <ArrowLeft size={16} strokeWidth={2} />
        </Link>
        <div className="h-5 w-px shrink-0 bg-[#E4E7EC]" />
        <span className="shrink-0 rounded-lg bg-[#F2F4F7] px-3 py-1.5 font-mono text-[13px] font-bold text-[#344054]">
          {item.fullCode}
        </span>
        <h1 className="truncate text-[16px] font-bold text-[#101828]">{item.fullName}</h1>
        {item.abbreviation && (
          <span className="shrink-0 text-[14px] text-[#667085]">({item.abbreviation})</span>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button
            onClick={downloadDestinos}
            className="flex items-center gap-1.5 rounded-lg border border-[#E4E7EC] px-3 py-2 text-[13px] font-medium text-[#344054] transition hover:bg-[#F9FAFB]"
            title="Exportar destinos (usado en)"
          >
            <Download size={14} strokeWidth={2} />
            Destinos
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-6">

          {/* Stock row */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard label="Disponible" value={item.stockAvailable} variant={stockVariant} />
            <StatCard label="Reservado" value={item.stockReserved} />
            <StatCard label="Total" value={item.stockTotal} />
            <StatCard label="Futuro" value={item.stockFuture} />
            <StatCard
              label="Mínimo / Máximo"
              value={`${fmt(item.stockMin)} / ${fmt(item.stockMax)}`}
            />
          </div>

          {item.stockShortage > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
              <AlertTriangle size={16} className="shrink-0 text-amber-600" />
              <p className="text-[14px] text-amber-800">
                Faltante de <strong>{fmt(item.stockShortage)}</strong> unidades para cubrir la demanda futura.
              </p>
            </div>
          )}

          {/* Technical + Pricing + Image */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <SectionCard title="Datos Técnicos">
              <InfoRow label="Dimensión 2" value={item.dim2 != null ? String(item.dim2) : null} />
              <InfoRow label="Dimensión 3" value={item.dim3 != null ? String(item.dim3) : null} />
              <InfoRow label="Peso (kg)" value={item.weight != null ? fmt(item.weight, 4) : null} />
              <InfoRow label="Material" value={item.material} />
              <InfoRow label="Desarrollo mat." value={item.materialDevelopment != null ? fmt(item.materialDevelopment, 4) : null} />
              <InfoRow label="Unid. Consumo" value={item.unitConsumption} />
              <InfoRow label="Unid. Compra" value={item.unitPurchase} />
              <InfoRow label="Factor Convers." value={item.unitConversionFactor !== 1 ? fmt(item.unitConversionFactor, 4) : null} />
              <InfoRow label="Unid. Emisión" value={item.unitIssueItem} />
              <InfoRow label="Fracc. Piezas" value={item.piecesFraction != null ? fmt(item.piecesFraction, 3) : null} />
            </SectionCard>

            <SectionCard title="Precio & Compras">
              <InfoRow
                label="Precio Venta"
                value={item.salePrice != null ? `${fmt(item.salePrice)} ${item.currency}` : null}
              />
              <InfoRow label="Fecha Precio V." value={fmtDate(item.salePriceDate)} />
              <InfoRow
                label="Precio Costo"
                value={item.costPrice != null ? `${fmt(item.costPrice)} ${item.currency}` : null}
              />
              <InfoRow label="Fecha Precio C." value={fmtDate(item.costPriceDate)} />
              <InfoRow label="Cotización" value={item.exchangeRate != null ? fmt(item.exchangeRate, 4) : null} />
              <InfoRow
                label="Días Compra"
                value={item.daysLeadTime ? `${item.daysLeadTime} días` : null}
              />
              <InfoRow
                label="Margen Factura"
                value={item.invoiceSaleMargin != null ? `${fmt(item.invoiceSaleMargin)} %` : null}
              />
              <InfoRow
                label="Margen Stock"
                value={item.invoiceStockMargin != null ? `${fmt(item.invoiceStockMargin)} %` : null}
              />
            </SectionCard>

            <ImageSection itemId={itemId} />
          </div>

          {/* Warehouse + Notes */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SectionCard title="Depósito">
              {!item.warehouseZone && !item.warehouseRack && !item.warehouseSlot ? (
                <p className="text-[13px] text-[#98A2B3]">Sin ubicación asignada</p>
              ) : (
                <>
                  <InfoRow label="Zona" value={item.warehouseZone} />
                  <InfoRow label="Rack" value={item.warehouseRack} />
                  <InfoRow label="Casilla" value={item.warehouseSlot} />
                </>
              )}
            </SectionCard>

            {hasNotes ? (
              <SectionCard title="Notas">
                <InfoRow label="Memo Producción" value={item.productionMemo} />
                <InfoRow label="Observaciones" value={item.observations} />
                <InfoRow label="Complemento Op." value={item.operationComplement} />
                <InfoRow label="Complemento Op." value={item.operationComplement} />
              </SectionCard>
            ) : (
              <div /> // grid placeholder so warehouse stays half-width
            )}
          </div>

          {/* BOM */}
          <FormulaSection itemId={itemId} />

        </div>
      </div>
    </div>
  )
}
