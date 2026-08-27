import { useState, useEffect, useRef } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as XLSX from 'xlsx'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { apiClient } from '@/lib/api-client'
import { FormDialog } from '@/components/ui/form-dialog'
import {
  FormField, FormSection, FormActions, ParentBadge, ErrorBanner,
  inputBase, textareaBase, inputError,
} from '@/components/ui/form-field'
import type { Segment, Family, ItemClass, ItemSummary, ItemDetail } from '@/types/api.types'
import { NewItemForm } from '@/components/catalog/NewItemForm'
import { MaterialReferenceGallery } from '@/components/catalog/MaterialReferenceGallery'
import {
  Plus, Search, Pencil, Trash2, ChevronRight, Layers, Copy,
  AlertTriangle, AlertCircle, User, LayoutGrid, FolderOpen, Package, Tag, ListPlus, Replace,
  FileSpreadsheet, ArrowDownUp,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import imgRedondo from '@/assets/materials/redondo.png'
import imgTuboRedondo from '@/assets/materials/tubo_redondo.png'
import imgCuadrado from '@/assets/materials/cuadrado.png'
import imgTuboCuadrado from '@/assets/materials/tubo_cuadrado.png'
import imgPerfilL from '@/assets/materials/perfil_l.png'
import imgPerfilU from '@/assets/materials/perfil_u.png'
import imgPerfilI from '@/assets/materials/perfil_i.png'
import imgPerfilT from '@/assets/materials/perfil_t.png'
import imgKgxm from '@/assets/materials/kgxm.png'

type SheetKind = 'segment' | 'family' | 'item-class' | 'item' | 'batch' | 'rename' | 'family-batch' | 'class-batch' | 'copy-to-family' | null
interface ColRow { id: number; code: string; name: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getErrMsg(err: unknown): string {
  const d = (err as { response?: { data?: { code?: string; message?: string } } })?.response?.data
  if (!d) return 'No se pudo completar la operación. Verificá la conexión.'
  const byCode: Record<string, string> = {
    SEGMENT_HAS_FAMILIES:    'El segmento tiene familias. Eliminá las familias primero.',
    FAMILY_HAS_ITEM_CLASSES: 'La familia tiene clases. Eliminá las clases primero.',
    ITEM_CLASS_HAS_ITEMS:    'La clase tiene ítems. Eliminá los ítems primero.',
  }
  return d.code ? (byCode[d.code] ?? d.message ?? 'Error desconocido.') : (d.message ?? 'No se pudo completar.')
}

function getSaveErrMsg(err: unknown): string | undefined {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message
}

// ─── Stat tile ────────────────────────────────────────────────────────────────
function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-[#f3f4f6] p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-2 text-[26px] font-bold leading-none tracking-tight text-[#111827]">{value}</p>
      {sub && <p className="mt-1 text-[12px] text-slate-400">{sub}</p>}
    </div>
  )
}

// ─── Info row ─────────────────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#F3F4F6] py-3 last:border-0">
      <span className="text-[13px] text-slate-400">{label}</span>
      <span className="text-right text-[13px] font-medium text-[#374151]">{value}</span>
    </div>
  )
}

// ─── Context panel ────────────────────────────────────────────────────────────
function ContextPanel({
  selSeg, selFam, selClass, selItem, onNavigate,
}: {
  selSeg:    Segment | null
  selFam:    Family | null
  selClass:  ItemClass | null
  selItem:   ItemSummary | null
  onNavigate: (r: ItemSummary) => void
}) {
  if (!selSeg) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 bg-[#f7f8fa] p-10 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-sm">
          <Layers size={26} strokeWidth={1.2} className="text-slate-300" />
        </div>
        <div>
          <p className="text-[15px] font-semibold text-slate-300">Seleccioná un segmento</p>
          <p className="mt-1 text-[13px] text-slate-200">Los detalles aparecerán aquí</p>
        </div>
      </div>
    )
  }

  if (selItem) {
    return (
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto bg-[#f7f8fa] p-6">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 bg-[#2C6B2F]/5 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2C6B2F]/15">
                <Tag size={15} className="text-[#2C6B2F]" />
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#2C6B2F]">
                  {selItem.fullCode}
                </p>
                <p className="truncate text-[16px] font-bold text-[#111827]">{selItem.fullName}</p>
              </div>
            </div>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 gap-3">
              <StatTile label="Stock" value={(selItem.stockAvailable ?? 0).toFixed(2)} sub={selItem.unitOfMeasure ?? undefined} />
              <StatTile label="Mínimo" value={(selItem.stockMin ?? 0).toFixed(2)} sub={selItem.unitOfMeasure ?? undefined} />
            </div>
          </div>
        </div>
        <button
          onClick={() => onNavigate(selItem)}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#2C6B2F] text-[14px] font-semibold text-white shadow-sm transition hover:bg-[#245A27] active:bg-[#1E4B21]"
        >
          Ver ficha completa
          <ChevronRight size={15} />
        </button>
      </div>
    )
  }

  if (selClass) {
    return (
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto bg-[#f7f8fa] p-6">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 bg-[#2C6B2F]/5 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2C6B2F]/15">
                <Package size={15} className="text-[#2C6B2F]" />
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {selClass.code}
                </p>
                <p className="truncate text-[16px] font-bold text-[#111827]">{selClass.name}</p>
              </div>
            </div>
          </div>
          <div className="px-5 py-2">
            {selClass.abbreviation && <InfoRow label="Abreviatura" value={selClass.abbreviation} />}
            {selClass.material && (
              <InfoRow label="Material" value={selClass.materialName ?? selClass.material} />
            )}
            {selClass.weightMethod && <InfoRow label="Método de peso" value={selClass.weightMethod} />}
            {selClass.specificWeight != null && (
              <InfoRow label="Peso específico" value={selClass.specificWeight.toString()} />
            )}
            {selClass.nominalDimension != null && (
              <InfoRow label="Dimensión nominal" value={selClass.nominalDimension.toString()} />
            )}
            {selClass.description && (
              <div className="pb-4 pt-3">
                <p className="text-[13px] leading-relaxed text-slate-400">{selClass.description}</p>
              </div>
            )}
          </div>
        </div>
        <p className="text-center text-[12px] text-slate-300">Seleccioná un ítem para ver sus detalles</p>
      </div>
    )
  }

  if (selFam) {
    return (
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto bg-[#f7f8fa] p-6">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 bg-[#2C6B2F]/5 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2C6B2F]/15">
                <FolderOpen size={15} className="text-[#2C6B2F]" />
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {selFam.code}
                </p>
                <p className="truncate text-[16px] font-bold text-[#111827]">{selFam.name}</p>
              </div>
            </div>
          </div>
          <div className="px-5 py-2">
            {selFam.abbreviation && <InfoRow label="Abreviatura" value={selFam.abbreviation} />}
            {selFam.description && (
              <div className="pb-4 pt-3">
                <p className="text-[13px] leading-relaxed text-slate-400">{selFam.description}</p>
              </div>
            )}
          </div>
        </div>
        <p className="text-center text-[12px] text-slate-300">Seleccioná una clase para ver sus detalles</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto bg-[#f7f8fa] p-6">
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 bg-[#2C6B2F]/5 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2C6B2F]/15">
              <LayoutGrid size={15} className="text-[#2C6B2F]" />
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {selSeg.code}
              </p>
              <p className="truncate text-[16px] font-bold text-[#111827]">{selSeg.name}</p>
            </div>
          </div>
        </div>
        <div className="px-5 py-2">
          {selSeg.abbreviation && <InfoRow label="Abreviatura" value={selSeg.abbreviation} />}
          {selSeg.description && (
            <div className="pb-4 pt-3">
              <p className="text-[13px] leading-relaxed text-slate-400">{selSeg.description}</p>
            </div>
          )}
        </div>
      </div>
      <p className="text-center text-[12px] text-slate-300">Seleccioná una familia para ver sus detalles</p>
    </div>
  )
}

// ─── Confirm delete dialog ────────────────────────────────────────────────────
function ConfirmDialog({
  open, title, description, isPending, apiErr, onConfirm, onClose,
}: {
  open: boolean; title: string; description: string
  isPending: boolean; apiErr: string | null
  onConfirm: () => void; onClose: () => void
}) {
  return (
    <Dialog.Root open={open} onOpenChange={v => !v && !isPending && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-8 shadow-2xl focus:outline-none">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50">
              <AlertTriangle size={18} className="text-red-500" />
            </div>
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-[17px] font-bold text-[#111827]">{title}</Dialog.Title>
              <Dialog.Description className="mt-1.5 text-[14px] leading-relaxed text-[#6B7280]">{description}</Dialog.Description>
            </div>
          </div>
          {apiErr && (
            <p className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3.5 text-[14px] leading-snug text-red-600">
              {apiErr}
            </p>
          )}
          <div className="mt-7 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="h-11 rounded-xl px-6 text-[14px] font-medium text-[#6B7280] transition hover:bg-[#F3F4F6] hover:text-[#374151] disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isPending}
              className="flex h-11 items-center gap-2 rounded-xl bg-red-600 px-6 text-[14px] font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              {isPending ? (
                <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Eliminando...</>
              ) : (
                <><Trash2 size={14} /> Confirmar</>
              )}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ─── Familias XLSX export ───────────────────────────────────────────────────────
function generateFamiliasXLSX(families: Family[], segmentLabel: string) {
  const headers = ['Código', 'Nombre', 'Abreviatura', 'Descripción']
  const data = families.map(f => [f.code, f.name, f.abbreviation ?? '', f.description ?? ''])

  const ws = XLSX.utils.aoa_to_sheet([headers, ...data])
  ws['!cols'] = [{ wch: 12 }, { wch: 36 }, { wch: 16 }, { wch: 48 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Familias')
  const today = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `familias_${segmentLabel}_${today}.xlsx`)
}

// ─── Catalog column ───────────────────────────────────────────────────────────
const SINGULAR: Record<string, string> = {
  Segmentos: 'segmento',
  Familias:  'familia',
  Clases:    'clase',
}

function CatalogColumn({
  title, icon: Icon, rows, selected, isLoading, enabled, placeholderText,
  onSelect, onNew, onEdit, onDelete, onBatch, onCopy, onExport, sortable, width = 'w-[272px]',
}: {
  title: string; icon: LucideIcon; rows: ColRow[]; selected: ColRow | null
  isLoading?: boolean; enabled: boolean; placeholderText: string
  onSelect: (r: ColRow) => void; onNew: () => void
  onEdit: (r: ColRow) => void; onDelete: (r: ColRow) => void
  onBatch?: () => void; onCopy?: () => void; onExport?: () => void
  sortable?: boolean; width?: string
}) {
  const [q, setQ] = useState('')
  const [sortMode, setSortMode] = useState<'code' | 'name'>('code')
  const filtered = rows.filter(r => !q || r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q))
  const sorted = sortable
    ? [...filtered].sort((a, b) => sortMode === 'code'
        ? a.code.localeCompare(b.code, 'es', { numeric: true })
        : a.name.localeCompare(b.name, 'es'))
    : filtered
  const singular  = SINGULAR[title] ?? title.toLowerCase()

  return (
    <div className={cn(
      'flex shrink-0 flex-col border-r border-gray-200 bg-white transition-opacity duration-150',
      width,
      !enabled && 'pointer-events-none opacity-25',
    )}>
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-gray-100 bg-[#f7f8fa] pl-5 pr-7">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#2C6B2F]/10">
          <Icon size={14} className="text-[#2C6B2F]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-[#374151]">{title}</p>
          <p className="text-[11px] text-slate-400">{rows.length} registros</p>
        </div>
        {enabled && (
          <div className="flex shrink-0 items-center gap-1">
            {sortable && (
              <button
                onClick={() => setSortMode(v => v === 'code' ? 'name' : 'code')}
                title={sortMode === 'code' ? 'Ordenar alfabéticamente' : 'Ordenar por código'}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#2C6B2F]/25 bg-[#2C6B2F]/8 text-[#2C6B2F] transition hover:bg-[#2C6B2F]/15 active:scale-95"
              >
                <ArrowDownUp size={13} />
              </button>
            )}
            {onExport && (
              <button
                onClick={onExport}
                title={`Exportar ${title.toLowerCase()} a XLSX`}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#2C6B2F]/25 bg-[#2C6B2F]/8 text-[#2C6B2F] transition hover:bg-[#2C6B2F]/15 active:scale-95"
              >
                <FileSpreadsheet size={13} />
              </button>
            )}
            {onCopy && (
              <button
                onClick={onCopy}
                title={`Importar ${singular}s de otra familia`}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#2C6B2F]/25 bg-[#2C6B2F]/8 text-[#2C6B2F] transition hover:bg-[#2C6B2F]/15 active:scale-95"
              >
                <Copy size={13} />
              </button>
            )}
            {onBatch && (
              <button
                onClick={onBatch}
                title={`Importar ${singular}s desde texto`}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#2C6B2F]/25 bg-[#2C6B2F]/8 text-[#2C6B2F] transition hover:bg-[#2C6B2F]/15 active:scale-95"
              >
                <ListPlus size={13} />
              </button>
            )}
            <button
              onClick={onNew}
              title={`Nuevo ${singular}`}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#2C6B2F] text-white shadow-sm transition hover:bg-[#1E4B21] active:scale-95"
            >
              <Plus size={13} />
            </button>
          </div>
        )}
      </div>

      <div className="shrink-0 border-b border-gray-100 px-4 py-2.5">
        <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-[#f7f8fa] px-3 py-2 transition focus-within:border-[#2C6B2F] focus-within:bg-white">
          <Search size={12} className="shrink-0 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar..."
            value={q}
            onChange={e => setQ(e.target.value.toLowerCase())}
            className="min-w-0 flex-1 bg-transparent text-[13px] text-slate-700 placeholder-slate-400 focus:outline-none"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
        {!enabled ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <Icon size={28} strokeWidth={1} className="text-slate-200" />
            <p className="text-[13px] text-slate-300">{placeholderText}</p>
          </div>
        ) : isLoading ? (
          <div className="flex h-28 items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#2C6B2F] border-t-transparent" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex h-28 flex-col items-center justify-center gap-2">
            <Search size={20} strokeWidth={1.2} className="text-slate-200" />
            <p className="text-[13px] text-slate-300">Sin resultados</p>
          </div>
        ) : sorted.map(row => {
          const isSel = selected?.id === row.id
          return (
            <div
              key={row.id}
              onClick={() => onSelect(row)}
              className={cn(
                'group relative flex cursor-pointer items-start gap-3 border-b border-gray-50 px-5 py-3.5 transition-colors duration-100',
                isSel ? 'bg-[#2C6B2F]/8' : 'hover:bg-[#fafafa]',
              )}
            >
              {isSel && <span className="absolute inset-y-0 left-0 w-0.5 rounded-r bg-[#2C6B2F]" />}
              <span className={cn(
                'shrink-0 self-center rounded-md px-2 py-0.5 font-mono text-[11px] font-bold',
                isSel ? 'bg-[#2C6B2F]/12 text-[#2C6B2F]' : 'bg-slate-100 text-slate-500',
              )}>
                {row.code}
              </span>
              <span
                title={row.name}
                className={cn(
                  'min-w-0 flex-1 line-clamp-2 break-words text-[14px] leading-snug',
                  isSel ? 'font-semibold text-[#1a3d1c]' : 'font-medium text-[#374151]',
                )}
              >
                {row.name}
              </span>
              <div className="flex shrink-0 self-center items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  title={`Editar ${singular}`}
                  onClick={e => { e.stopPropagation(); onEdit(row) }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-[#2C6B2F]/8 hover:text-[#2C6B2F]"
                >
                  <Pencil size={12} />
                </button>
                <button
                  title={`Eliminar ${singular}`}
                  onClick={e => { e.stopPropagation(); onDelete(row) }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 transition hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Items column ─────────────────────────────────────────────────────────────
function ItemsColumn({ rows, selected, isLoading, enabled, onSelect, onNavigate, onNew, onBatch, onRename }: {
  rows: ItemSummary[]; selected: ItemSummary | null; isLoading?: boolean; enabled: boolean
  onSelect: (r: ItemSummary) => void; onNavigate: (r: ItemSummary) => void
  onNew: () => void; onBatch: () => void; onRename: () => void
}) {
  const [q, setQ] = useState('')
  const filtered = rows.filter(r => !q || r.fullName.toLowerCase().includes(q) || r.fullCode.toLowerCase().includes(q))

  return (
    <div className={cn(
      'flex w-[320px] shrink-0 flex-col border-r border-gray-200 bg-white transition-opacity duration-150',
      !enabled && 'pointer-events-none opacity-25',
    )}>
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-gray-100 bg-[#f7f8fa] pl-5 pr-7">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#2C6B2F]/10">
          <Tag size={14} className="text-[#2C6B2F]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-[#374151]">Items</p>
          <p className="text-[11px] text-slate-400">{rows.length} registros</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={onRename}
            disabled={!enabled}
            title="Renombrar en lote"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#2C6B2F]/25 bg-[#2C6B2F]/8 text-[#2C6B2F] transition hover:bg-[#2C6B2F]/15 active:scale-95 disabled:pointer-events-none disabled:opacity-0"
          >
            <Replace size={13} />
          </button>
          <button
            onClick={onBatch}
            disabled={!enabled}
            title="Importar ítems desde texto"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#2C6B2F]/25 bg-[#2C6B2F]/8 text-[#2C6B2F] transition hover:bg-[#2C6B2F]/15 active:scale-95 disabled:pointer-events-none disabled:opacity-0"
          >
            <ListPlus size={13} />
          </button>
          <button
            onClick={onNew}
            disabled={!enabled}
            title="Nuevo ítem"
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2C6B2F] text-white shadow-sm transition hover:bg-[#1E4B21] active:scale-95 disabled:pointer-events-none disabled:opacity-0"
          >
            <Plus size={13} />
          </button>
        </div>
      </div>

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

      <div className="min-h-0 flex-1 overflow-y-auto">
        {!enabled ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <Tag size={28} strokeWidth={1} className="text-slate-200" />
            <p className="text-[13px] text-slate-300">Seleccioná una clase</p>
          </div>
        ) : isLoading ? (
          <div className="flex h-28 items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#2C6B2F] border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-28 flex-col items-center justify-center gap-2">
            <Search size={22} strokeWidth={1.2} className="text-slate-200" />
            <p className="text-[13px] text-slate-300">Sin resultados</p>
          </div>
        ) : filtered.map(row => {
          const isSel = selected?.id === row.id
          return (
            <div
              key={row.id}
              onClick={() => onSelect(row)}
              onDoubleClick={() => onNavigate(row)}
              title="Doble click para ver ficha"
              className={cn(
                'group relative flex cursor-pointer items-center gap-3 border-b border-gray-50 px-5 py-3.5 transition-colors duration-100',
                isSel ? 'bg-[#2C6B2F]/8' : 'hover:bg-[#fafafa]',
              )}
            >
              {isSel && <span className="absolute inset-y-0 left-0 w-0.5 rounded-r bg-[#2C6B2F]" />}
              <span className={cn(
                'shrink-0 rounded-md px-2 py-0.5 font-mono text-[11px] font-bold',
                isSel ? 'bg-[#2C6B2F]/12 text-[#2C6B2F]' : 'bg-slate-100 text-slate-500',
              )}>
                {row.fullCode}
              </span>
              <span className={cn(
                'min-w-0 flex-1 truncate text-[14px]',
                isSel ? 'font-semibold text-[#1a3d1c]' : 'font-medium text-[#374151]',
              )}>
                {row.fullName}
              </span>
              <div className="flex shrink-0 flex-col items-end gap-0.5">
                <span className="font-mono text-[12px] font-semibold text-slate-500">{(row.stockAvailable ?? 0).toFixed(2)}</span>
                {row.unitOfMeasure && <span className="text-[11px] text-slate-400">{row.unitOfMeasure}</span>}
              </div>
              <button
                title="Ver ficha del ítem"
                onClick={e => { e.stopPropagation(); onNavigate(row) }}
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition',
                  isSel
                    ? 'border-[#2C6B2F]/20 bg-[#2C6B2F]/10 text-[#2C6B2F]'
                    : 'border-slate-200 bg-white text-slate-400 opacity-0 group-hover:opacity-100 hover:border-[#2C6B2F]/25 hover:bg-[#2C6B2F]/8 hover:text-[#2C6B2F]',
                )}
              >
                <ChevronRight size={13} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Batch import form (txt paste) ────────────────────────────────────────────
function BatchImportForm({ typeId, typeLabel, onSave, onClose }: {
  typeId: number; typeLabel: string; onSave: () => void; onClose: () => void
}) {
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)

  const validLines = text.split('\n').filter(l => l.trim() && l.includes(';'))

  const m = useMutation({
    mutationFn: () => apiClient.post(`/item-classes/${typeId}/items/batch-text`, { text: text.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items', typeId] })
      onSave()
    },
    onError: err => setSubmitError(getSaveErrMsg(err) ?? 'Error al importar los ítems.'),
  })

  return (
    <form
      onSubmit={e => { e.preventDefault(); setSubmitError(null); if (validLines.length > 0) m.mutate() }}
      className="flex flex-col gap-6"
    >
      <ParentBadge label="Clase" value={typeLabel} />

      <FormSection title="Pegá el texto" first>
        <p className="text-[13px] text-slate-400">
          Una línea por ítem, formato: <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[12px]">nombre;abreviatura</code>
        </p>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={10}
          placeholder={'Planchuela;Planch\nTrefilado;Tref\nCañería;Cañ'}
          className={cn(textareaBase, 'font-mono text-[13px]')}
        />
      </FormSection>

      {validLines.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-[#2C6B2F]/8 px-5 py-3.5">
          <Tag size={14} className="shrink-0 text-[#2C6B2F]" />
          <p className="text-[14px] text-[#2C6B2F]">
            Se crearán <strong>{validLines.length}</strong> {validLines.length === 1 ? 'ítem' : 'ítems'}
          </p>
        </div>
      )}

      {submitError && <ErrorBanner message={submitError} />}
      <FormActions
        pending={m.isPending}
        isEdit={false}
        label={`Importar ${validLines.length} ítem${validLines.length !== 1 ? 's' : ''}`}
        onClose={onClose}
      />
    </form>
  )
}

// ─── Bulk rename form ─────────────────────────────────────────────────────────
function RenameForm({ typeId, typeLabel, onSave, onClose }: {
  typeId: number; typeLabel: string; onSave: () => void; onClose: () => void
}) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { search: '', replacement: '' },
  })
  const m = useMutation({
    mutationFn: (d: { search: string; replacement: string }) =>
      apiClient.patch(`/item-classes/${typeId}/items/rename`, d),
    onSuccess: onSave,
  })
  return (
    <form onSubmit={handleSubmit(d => m.mutate(d))} className="flex flex-col gap-7">
      <ParentBadge label="Clase" value={typeLabel} />
      <FormField label="Buscar" required error={!!errors.search && 'Campo requerido'}>
        <input
          {...register('search', { required: true })}
          className={cn(inputBase, errors.search && inputError)}
          placeholder="Texto a buscar en los nombres..."
        />
      </FormField>
      <FormField label="Reemplazar por" optional>
        <input
          {...register('replacement')}
          className={inputBase}
          placeholder="Nuevo texto (vacío para eliminar)"
        />
      </FormField>
      {m.isError && <ErrorBanner message="No se pudo ejecutar el reemplazo. Verificá los datos." />}
      <FormActions pending={m.isPending} isEdit={false} label="Ejecutar reemplazo" onClose={onClose} />
    </form>
  )
}

// ─── Segment form ─────────────────────────────────────────────────────────────
function SegmentForm({ item, onSave, onClose }: { item: Segment | null; onSave: () => void; onClose: () => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      name: item?.name ?? '',
      abbreviation: item?.abbreviation ?? '',
      description: item?.description ?? '',
    },
  })
  const m = useMutation({
    mutationFn: (d: object) => item ? apiClient.put(`/segments/${item.id}`, d) : apiClient.post('/segments', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['segments'] }); onSave() },
  })
  return (
    <form onSubmit={handleSubmit(d => m.mutate(d))} className="flex flex-col gap-7">
      <FormField label="Abreviatura" optional>
        <input {...register('abbreviation')} maxLength={5} className={inputBase} placeholder="ACE" />
      </FormField>
      <FormField label="Nombre" required error={!!errors.name && 'Campo requerido'}>
        <input
          {...register('name', { required: true })}
          className={cn(inputBase, errors.name && inputError)}
          placeholder="Ej: Aceros y metales"
        />
      </FormField>
      <FormField label="Descripción" optional>
        <textarea {...register('description')} rows={3} className={textareaBase} placeholder="Descripción del segmento..." />
      </FormField>
      {m.isError && <ErrorBanner message={getSaveErrMsg(m.error)} />}
      <FormActions pending={m.isPending} isEdit={!!item} label="Crear segmento" onClose={onClose} />
    </form>
  )
}

// ─── Family form ──────────────────────────────────────────────────────────────
function FamilyForm({ item, segmentId, segmentLabel, onSave, onClose }: {
  item: Family | null; segmentId: number; segmentLabel: string; onSave: () => void; onClose: () => void
}) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      name: item?.name ?? '',
      abbreviation: item?.abbreviation ?? '',
      description: item?.description ?? '',
      segmentId,
    },
  })
  const m = useMutation({
    mutationFn: (d: object) => item ? apiClient.put(`/families/${item.id}`, d) : apiClient.post('/families', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['families', segmentId] }); onSave() },
  })
  return (
    <form onSubmit={handleSubmit(d => m.mutate(d))} className="flex flex-col gap-7">
      <ParentBadge label="Segmento" value={segmentLabel} />
      <FormField label="Abreviatura" optional>
        <input {...register('abbreviation')} maxLength={25} className={inputBase} placeholder="PLA" />
      </FormField>
      <FormField label="Nombre" required error={!!errors.name && 'Campo requerido'}>
        <input
          {...register('name', { required: true })}
          className={cn(inputBase, errors.name && inputError)}
          placeholder="Ej: Planchuela"
        />
      </FormField>
      <FormField label="Descripción" optional>
        <textarea {...register('description')} rows={3} className={textareaBase} placeholder="Descripción de la familia..." />
      </FormField>
      {m.isError && <ErrorBanner message={getSaveErrMsg(m.error)} />}
      <FormActions pending={m.isPending} isEdit={!!item} label="Crear familia" onClose={onClose} />
    </form>
  )
}

// ─── Section calculator ───────────────────────────────────────────────────────
type SectionShape = {
  id: string
  label: string
  paramLabels: string[]
  compute: (vals: number[]) => number
  /** Label for the result row. Defaults to "Sección en Mm2." when omitted. */
  resultLabel?: string
  /** Unit shown next to each param input. Defaults to "Mm." for every field when omitted. */
  paramUnits?: string[]
}

const SECTION_SHAPES: SectionShape[] = [
  { id: 'round_solid',  label: 'Barra redonda',    paramLabels: ['Diámetro D'],                   compute: ([D])          => Math.PI * D * D / 4 },
  { id: 'round_hollow', label: 'Caño redondo',      paramLabels: ['Diámetro ext.', 'Diámetro int.'], compute: ([De, Di])     => Math.PI * (De * De - Di * Di) / 4 },
  { id: 'flat_bar',     label: 'Planchuela',        paramLabels: ['Ancho', 'Espesor'],             compute: ([A, B])        => A * B },
  { id: 'rect_tube',    label: 'Tubo rectangular',  paramLabels: ['Lado A', 'Lado B', 'Espesor'],  compute: ([A, B, e])     => A * B - (A - 2 * e) * (B - 2 * e) },
  { id: 'angle_l',      label: 'Perfil L',          paramLabels: ['Ala A', 'Ala B', 'Espesor'],   compute: ([A, B, e])     => (A + B - e) * e },
  { id: 'channel_u',    label: 'Perfil U/C',        paramLabels: ['Distancia D1', 'Altura D2', 'Espesor E'], compute: ([D1, D2, E]) => { const s1 = D1 * D2, s2 = (D1 - E) * (D2 - 2 * E); return s2 >= s1 ? 0 : s1 - s2 } },
  { id: 'perfil_i',     label: 'Perfil I',          paramLabels: ['Distancia D1', 'Altura D2', 'Espesor E'], compute: ([D1, D2, E]) => { const s1 = D1 * D2, s2 = (D1 - E) * (D2 - 2 * E); return s2 >= s1 ? 0 : s1 - s2 } },
  { id: 'perfil_t',     label: 'Perfil T',          paramLabels: ['Distancia D1', 'Altura D2', 'Espesor E'], compute: ([D1, D2, E]) => { const s1 = D1 * D2, s2 = (D1 - E) * (D2 - E); return s2 >= s1 ? 0 : s1 - s2 } },
  {
    id: 'kgxm', label: 'Kg./m (inverso)',
    paramLabels: ['Peso específico (Kg./M3.)', 'Peso (Kgs.)', 'Longitud (Mm.)'],
    paramUnits: ['Kg./M3.', 'Kgs.', 'Mm.'],
    compute: ([pe, peso, long_]) => (pe * long_ > 0) ? (1e9 * peso) / (pe * long_) : 0,
  },
]

// Real technical drawings (legacy Python system), replacing the hand-drawn SVGs.
const SECTION_SHAPE_IMAGES: Record<string, string> = {
  round_solid:  imgRedondo,
  round_hollow: imgTuboRedondo,
  flat_bar:     imgCuadrado,
  rect_tube:    imgTuboCuadrado,
  angle_l:      imgPerfilL,
  channel_u:    imgPerfilU,
  perfil_i:     imgPerfilI,
  perfil_t:     imgPerfilT,
  kgxm:         imgKgxm,
}

function SectionShapeIcon({ id, label }: { id: string; label: string }) {
  const src = SECTION_SHAPE_IMAGES[id]
  if (!src) return <div className="h-24 w-24 rounded bg-slate-100" />
  return <img src={src} alt={label} className="h-24 w-24 object-contain" />
}

function SectionCalculator({ onCopy }: { onCopy: (value: number) => void }) {
  const [active, setActive] = useState<SectionShape | null>(null)
  const [vals, setVals] = useState<string[]>([])
  const [open, setOpen] = useState(false)

  const openShape = (shape: SectionShape) => {
    setActive(shape)
    setVals(Array(shape.paramLabels.length).fill(''))
    setOpen(true)
  }

  const sectionMm2 = active ? (() => {
    const nums = vals.map(v => parseFloat(v))
    if (nums.some(n => isNaN(n) || n <= 0)) return null
    const r = active.compute(nums)
    return isFinite(r) && r > 0 ? r : null
  })() : null

  return (
    <>
      <p className="mb-2 text-[12px] font-medium text-[#344054]">Cálculo de secciones en Mm2.:</p>
      <div className="grid grid-cols-3 gap-2">
        {SECTION_SHAPES.map(shape => (
          <button
            key={shape.id}
            type="button"
            onClick={() => openShape(shape)}
            className="flex flex-col items-center gap-2 rounded-lg border border-[#E4E7EC] bg-white p-4 text-center transition hover:border-[#2C6B2F]/40 hover:bg-[#2C6B2F]/5 active:scale-95"
          >
            <SectionShapeIcon id={shape.id} label={shape.label} />
            <span className="text-xs leading-tight text-[#344054]">{shape.label}</span>
          </button>
        ))}
      </div>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[60] w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl focus:outline-none">
            <Dialog.Title className="mb-1 text-[16px] font-bold text-[#111827]">
              Modificar Cantidad en Receta:
            </Dialog.Title>
            <Dialog.Description className="mb-5 text-[13px] text-[#667085]">
              {active?.label}
            </Dialog.Description>

            <div className="flex flex-col gap-3">
              {active?.paramLabels.map((label, i) => (
                <div key={i} className="flex items-center gap-3">
                  <label className="w-28 shrink-0 text-right text-[13px] text-[#344054]">{label}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={vals[i] ?? ''}
                    onChange={e => setVals(prev => { const n = [...prev]; n[i] = e.target.value; return n })}
                    className="flex-1 rounded-lg border border-[#D0D5DD] px-3 py-2 text-[13px] focus:border-[#2C6B2F] focus:outline-none"
                    placeholder="0.000"
                  />
                  <span className="w-8 text-[12px] text-[#667085]">{active?.paramUnits?.[i] ?? 'Mm.'}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center gap-3 rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] px-4 py-3">
              <span className="text-[12px] font-semibold uppercase tracking-wide text-[#667085]">
                {active?.resultLabel ?? 'Sección en Mm2.'}
              </span>
              <span className="ml-auto font-mono text-[15px] font-bold text-[#111827]">
                {sectionMm2 != null ? sectionMm2.toFixed(3) : '0.000'}
              </span>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-10 rounded-xl px-5 text-[14px] font-medium text-[#6B7280] hover:bg-[#F3F4F6]"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={sectionMm2 == null}
                onClick={() => { if (sectionMm2 != null) { onCopy(sectionMm2); setOpen(false) } }}
                className="h-10 rounded-xl bg-[#2C6B2F] px-5 text-[14px] font-semibold text-white transition hover:bg-[#245A27] disabled:opacity-40"
              >
                Copiar Sección
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}

// ─── Item class form ──────────────────────────────────────────────────────────
function ItemClassForm({ item, familyId, familyLabel, onSave, onClose }: {
  item: ItemClass | null; familyId: number; familyLabel: string; onSave: () => void; onClose: () => void
}) {
  const qc = useQueryClient()
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      name:             item?.name ?? '',
      abbreviation:     item?.abbreviation ?? '',
      description:      item?.description ?? '',
      familyId,
      weightMethod:     item?.weightMethod ?? '',
      manualWeight:     item?.manualWeight ?? false,
      specificWeight:   item?.specificWeight != null ? String(item.specificWeight) : '',
      nominalDimension: item?.nominalDimension != null ? String(item.nominalDimension) : '',
      material:         item?.material ?? '',
      materialName:     item?.materialName ?? '',
      operatorName:     item?.operatorName ?? '',
    },
  })

  const weightMethod = watch('weightMethod')
  const manualWeight = watch('manualWeight')

  const [weightConfigError, setWeightConfigError] = useState<string | null>(null)

  // Mutual exclusion between the 3 weightMethod cards/gallery and the manual-weight card.
  const chooseWeightMethod = (val: string) => {
    setValue('weightMethod', val)
    if (val) setValue('manualWeight', false)
    if (val) setWeightConfigError(null)
  }
  const toggleManualWeight = (checked: boolean) => {
    setValue('manualWeight', checked)
    if (checked) setValue('weightMethod', '')
    if (checked) setWeightConfigError(null)
  }

  // Search state for raw material picker
  const [matSearch, setMatSearch] = useState(item?.material ? `${item.material} — ${item.materialName ?? ''}` : '')
  const [matResults, setMatResults] = useState<{ fullCode: string; fullName: string }[]>([])
  const [showMatDrop, setShowMatDrop] = useState(false)
  const matDebounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const handleMatSearch = (text: string) => {
    setMatSearch(text)
    setValue('material', '')
    setValue('materialName', '')
    clearTimeout(matDebounce.current)
    if (text.length < 2) { setMatResults([]); setShowMatDrop(false); return }
    matDebounce.current = setTimeout(async () => {
      const res = await apiClient.get(`/items/materials?term=${encodeURIComponent(text)}`)
      setMatResults(res.data)
      setShowMatDrop(true)
    }, 300)
  }

  const m = useMutation({
    mutationFn: (d: object) => item ? apiClient.put(`/item-classes/${item.id}`, d) : apiClient.post('/item-classes', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['item-classes', familyId] }); onSave() },
  })

  const onSubmit = (v: Record<string, string>) => {
    const isManualWeight = Boolean(v.manualWeight)

    if (!isManualWeight && !v.weightMethod) {
      setWeightConfigError('Elegí un método de cálculo de peso o marcá "Introducir peso manualmente".')
      return
    }
    setWeightConfigError(null)

    m.mutate({
      familyId,
      name:             v.name,
      abbreviation:     v.abbreviation || null,
      description:      v.description || null,
      weightMethod:     isManualWeight ? null : (v.weightMethod || null),
      manualWeight:     isManualWeight,
      specificWeight:   isManualWeight ? null : (v.specificWeight !== '' ? Number(v.specificWeight) : null),
      nominalDimension: isManualWeight ? null : (v.nominalDimension !== '' ? Number(v.nominalDimension) : null),
      material:         v.material || null,
      materialName:     v.materialName || null,
      operatorName:     v.operatorName || null,
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit as never)} className="flex flex-col gap-6">
      <ParentBadge label="Familia" value={familyLabel} />

      <FormSection title="Identificación" first>
        <FormField label="Nombre / Especificación" required error={!!errors.name && 'Campo requerido'}
          helper='Ej: PLA SAE1010 1"x1/8"'>
          <input
            {...register('name', { required: true })}
            className={cn(inputBase, errors.name && inputError)}
            placeholder='Ej: PLA SAE1010 1"x1/8"'
          />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Abreviatura" optional>
            <input {...register('abbreviation')} maxLength={25} className={inputBase} placeholder="PLA1-1/8" />
          </FormField>
          <FormField label="Operador / proceso" optional helper="Ej: galvanizado, pintado">
            <input {...register('operatorName')} maxLength={45} className={inputBase} placeholder="Ej: galvanizado" />
          </FormField>
        </div>
        <FormField label="Descripción" optional>
          <textarea {...register('description')} rows={2} className={textareaBase} />
        </FormField>
      </FormSection>

      <FormSection title="Datos para pesos calculados">
        {/* Método 1 — Kg./M3. (volumétrico por peso específico) */}
        <div className="rounded-lg border border-[#E4E7EC] bg-[#FAFAFA] p-4">
          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={['Mm.', 'Mm2.', 'Mm3.'].includes(weightMethod)}
              onChange={e => chooseWeightMethod(e.target.checked ? 'Mm.' : '')}
              className="h-4 w-4 accent-[#2C3E50]"
            />
            <span className="text-[13px] font-semibold text-[#1A1A1A]">
              Método 1 [Kg./M3.]:
            </span>
            <span className="text-[12px] text-[#667085]">
              Se conoce el peso específico del material de esta clase
            </span>
          </label>

          {['Mm.', 'Mm2.', 'Mm3.'].includes(weightMethod) && (
            <div className="mt-4 flex flex-col gap-4 pl-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Valor peso específico (Kg./M3.)" optional>
                  <input type="number" step="0.00000001" {...register('specificWeight')}
                    className={inputBase} placeholder="0,00000000" />
                </FormField>
              </div>

              <MaterialReferenceGallery onSelect={chooseWeightMethod} />

              <div>
                <p className="mb-2 text-[12px] font-medium text-[#344054]">Dimensión específica del material:</p>
                <div className="flex flex-col gap-2">
                  {([
                    ['Mm.', 'Para materiales que permitirán trozado y formen piezas que tendrán mismo espesor (Superficie Variable)'],
                    ['Mm2.', 'Para materiales que permitirán trozado y formen piezas que tendrán misma sección (Longitud Variable)'],
                    ['Mm3.', 'Para materiales que NO permitirán trozado y formen piezas que tendrán volumen fijo'],
                  ] as const).map(([val, desc]) => (
                    <label key={val} className="flex cursor-pointer items-start gap-2.5">
                      <input
                        type="radio"
                        name="weightMethodSub"
                        checked={weightMethod === val}
                        onChange={() => chooseWeightMethod(val)}
                        className="mt-0.5 h-4 w-4 accent-[#2C3E50]"
                      />
                      <span className="text-[12px] text-[#344054]">
                        <strong>{val}</strong>: {desc}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <FormField label="Valor fijo expresado en el sistema de unidades del método seleccionado" optional>
                <input type="number" step="0.00000001" {...register('nominalDimension')}
                  className={inputBase} placeholder="0,00000000" />
              </FormField>

              {['Mm.', 'Mm2.'].includes(weightMethod) && (
                <SectionCalculator
                  onCopy={v => setValue('nominalDimension', v.toFixed(6))}
                />
              )}
            </div>
          )}
        </div>

        {/* Método 2 — Kg./Item */}
        <div className="rounded-lg border border-[#E4E7EC] bg-[#FAFAFA] p-4">
          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={weightMethod === 'Kg./Und'}
              onChange={e => chooseWeightMethod(e.target.checked ? 'Kg./Und' : '')}
              className="h-4 w-4 accent-[#2C3E50]"
            />
            <span className="text-[13px] font-semibold text-[#1A1A1A]">Método 2 [Kg./Item]:</span>
            <span className="text-[12px] text-[#667085]">
              Las piezas de este material tendrán peso unitario conocido
            </span>
          </label>
        </div>

        {/* Método 3 — Items/Kg. */}
        <div className="rounded-lg border border-[#E4E7EC] bg-[#FAFAFA] p-4">
          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={weightMethod === 'Und/Kg.'}
              onChange={e => chooseWeightMethod(e.target.checked ? 'Und/Kg.' : '')}
              className="h-4 w-4 accent-[#2C3E50]"
            />
            <span className="text-[13px] font-semibold text-[#1A1A1A]">Método 3 [Items/Kg.]:</span>
            <span className="text-[12px] text-[#667085]">
              Las piezas de este material tendrán cantidad conocida por Kg.
            </span>
          </label>
        </div>

        {/* Método 4 — peso manual */}
        <div className="rounded-lg border border-[#E4E7EC] bg-[#FAFAFA] p-4">
          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={manualWeight}
              onChange={e => toggleManualWeight(e.target.checked)}
              className="h-4 w-4 accent-[#2C3E50]"
            />
            <span className="text-[13px] font-semibold text-[#1A1A1A]">Introducir peso manualmente:</span>
            <span className="text-[12px] text-[#667085]">
              El peso de cada ítem de esta clase se carga a mano al crearlo — no se calcula con ninguna fórmula
            </span>
          </label>
        </div>

        {weightConfigError && (
          <p className="flex items-center gap-1.5 text-[13px] text-red-500">
            <AlertCircle size={12} strokeWidth={2.5} />
            {weightConfigError}
          </p>
        )}
      </FormSection>

      <FormSection title="Materia prima por defecto">
        <FormField label="Material" optional helper="Se pre-carga al crear ítems de esta clase">
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
            <input
              value={matSearch}
              onChange={e => handleMatSearch(e.target.value)}
              onFocus={() => { if (matResults.length) setShowMatDrop(true) }}
              className={cn(inputBase, 'pl-9')}
              placeholder="Buscar materia prima..."
            />
            {showMatDrop && matResults.length > 0 && (
              <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-xl border border-[#E4E7EC] bg-white shadow-xl">
                {matResults.slice(0, 8).map(r => (
                  <button key={r.fullCode} type="button"
                    onClick={() => {
                      setValue('material', r.fullCode)
                      setValue('materialName', r.fullName)
                      setMatSearch(`${r.fullCode} — ${r.fullName}`)
                      setShowMatDrop(false)
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-[#F9FAFB]"
                  >
                    <span className="shrink-0 font-mono text-[12px] text-[#667085]">{r.fullCode}</span>
                    <span className="text-[14px] text-[#101828]">{r.fullName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </FormField>
      </FormSection>

      {m.isError && <ErrorBanner message={getSaveErrMsg(m.error)} />}
      <FormActions pending={m.isPending} isEdit={!!item} label="Crear clase" onClose={onClose} />
    </form>
  )
}

// ─── Batch family import form ─────────────────────────────────────────────────
function BatchFamilyImportForm({ segmentId, segmentLabel, onSave, onClose }: {
  segmentId: number; segmentLabel: string; onSave: () => void; onClose: () => void
}) {
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)

  const validLines = text.split('\n').filter(l => l.trim() && l.includes(';'))

  const m = useMutation({
    mutationFn: () => apiClient.post(`/families/segments/${segmentId}/batch-text`, { text: text.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['families', segmentId] })
      onSave()
    },
    onError: err => setSubmitError(getSaveErrMsg(err) ?? 'Error al importar las familias.'),
  })

  return (
    <form
      onSubmit={e => { e.preventDefault(); setSubmitError(null); if (validLines.length > 0) m.mutate() }}
      className="flex flex-col gap-6"
    >
      <ParentBadge label="Segmento" value={segmentLabel} />

      <FormSection title="Pegá el texto" first>
        <p className="text-[13px] text-slate-400">
          Una línea por familia, formato: <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[12px]">nombre;abreviatura</code>
        </p>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={10}
          placeholder={'Planchuela;PLA\nTrefilado;TRE\nCañería;CAÑ'}
          className={cn(textareaBase, 'font-mono text-[13px]')}
        />
      </FormSection>

      {validLines.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-[#2C6B2F]/8 px-5 py-3.5">
          <FolderOpen size={14} className="shrink-0 text-[#2C6B2F]" />
          <p className="text-[14px] text-[#2C6B2F]">
            Se crearán <strong>{validLines.length}</strong> {validLines.length === 1 ? 'familia' : 'familias'}
          </p>
        </div>
      )}

      {submitError && <ErrorBanner message={submitError} />}
      <FormActions
        pending={m.isPending}
        isEdit={false}
        label={`Importar ${validLines.length} familia${validLines.length !== 1 ? 's' : ''}`}
        onClose={onClose}
      />
    </form>
  )
}

// ─── Batch class import form ──────────────────────────────────────────────────
function BatchClassImportForm({ familyId, familyLabel, onSave, onClose }: {
  familyId: number; familyLabel: string; onSave: () => void; onClose: () => void
}) {
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)

  const validLines = text.split('\n').filter(l => l.trim() && l.includes(';'))

  const m = useMutation({
    mutationFn: () => apiClient.post(`/item-classes/families/${familyId}/batch-text`, { text: text.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['item-classes', familyId] })
      onSave()
    },
    onError: err => setSubmitError(getSaveErrMsg(err) ?? 'Error al importar las clases.'),
  })

  return (
    <form
      onSubmit={e => { e.preventDefault(); setSubmitError(null); if (validLines.length > 0) m.mutate() }}
      className="flex flex-col gap-6"
    >
      <ParentBadge label="Familia" value={familyLabel} />

      <FormSection title="Pegá el texto" first>
        <p className="text-[13px] text-slate-400">
          Una línea por clase, formato: <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[12px]">nombre;abreviatura</code>
        </p>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={10}
          placeholder={'PLA SAE1010 1"x1/8";PLA1-1/8\nPLA SAE1010 1"x3/16";PLA1-3/16'}
          className={cn(textareaBase, 'font-mono text-[13px]')}
        />
      </FormSection>

      {validLines.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-[#2C6B2F]/8 px-5 py-3.5">
          <Package size={14} className="shrink-0 text-[#2C6B2F]" />
          <p className="text-[14px] text-[#2C6B2F]">
            Se crearán <strong>{validLines.length}</strong> {validLines.length === 1 ? 'clase' : 'clases'}
          </p>
        </div>
      )}

      {submitError && <ErrorBanner message={submitError} />}
      <FormActions
        pending={m.isPending}
        isEdit={false}
        label={`Importar ${validLines.length} clase${validLines.length !== 1 ? 's' : ''}`}
        onClose={onClose}
      />
    </form>
  )
}

// ─── Import classes from another family (checklist) ───────────────────────────
function ImportClassesForm({ targetFamilyId, targetFamilyLabel, onSave, onClose }: {
  targetFamilyId: number; targetFamilyLabel: string; onSave: () => void; onClose: () => void
}) {
  const [searchText, setSearchText] = useState('')
  const [results, setResults] = useState<Family[]>([])
  const [source, setSource] = useState<Family | null>(null)
  const [showDrop, setShowDrop] = useState(false)
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [submitError, setSubmitError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const { data: allFamilies = [] } = useQuery<Family[]>({
    queryKey: ['families-all'],
    queryFn: () => apiClient.get<Family[]>('/families').then(r => r.data),
  })

  useEffect(() => {
    if (!searchText || searchText.length < 2) { setResults([]); setShowDrop(false); return }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const q = searchText.toLowerCase()
      const filtered = allFamilies.filter(f =>
        f.id !== targetFamilyId && (f.name.toLowerCase().includes(q) || f.code.toLowerCase().includes(q))
      )
      setResults(filtered.slice(0, 10))
      setShowDrop(true)
    }, 200)
  }, [searchText, allFamilies, targetFamilyId])

  const { data: sourceClasses = [], isLoading: loadingSourceClasses } = useQuery<ItemClass[]>({
    queryKey: ['item-classes', source?.id],
    queryFn: () => apiClient.get<ItemClass[]>(`/families/${source!.id}/item-classes`).then(r => r.data),
    enabled: !!source,
  })

  const selectSource = (f: Family | null) => {
    setSource(f)
    setChecked(new Set())
    setShowDrop(false)
  }

  const toggle = (id: number) => {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const allChecked = sourceClasses.length > 0 && checked.size === sourceClasses.length
  const toggleAll = () => setChecked(allChecked ? new Set() : new Set(sourceClasses.map(c => c.id)))

  const qc = useQueryClient()
  const m = useMutation({
    mutationFn: () => apiClient.post('/item-classes/copy-to-family', {
      sourceFamilyId: source!.id,
      targetFamilyId,
      classIds: [...checked],
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['item-classes', targetFamilyId] })
      onSave()
    },
    onError: err => setSubmitError(getSaveErrMsg(err) ?? 'Error al importar las clases.'),
  })

  return (
    <form
      onSubmit={e => { e.preventDefault(); setSubmitError(null); if (checked.size > 0) m.mutate() }}
      className="flex flex-col gap-6"
    >
      <ParentBadge label="Familia destino" value={targetFamilyLabel} />

      <FormSection title="Familia origen" first>
        <p className="text-[13px] text-slate-400">
          Elegí la familia de la que querés traer clases hacia <strong>{targetFamilyLabel}</strong>.
        </p>
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
          <input
            value={source ? `${source.code} — ${source.name}` : searchText}
            onChange={e => { setSearchText(e.target.value); selectSource(null) }}
            onFocus={() => { if (source) { selectSource(null); setSearchText('') }; if (results.length) setShowDrop(true) }}
            className={cn(inputBase, 'pl-9')}
            placeholder="Buscar familia origen..."
          />
          {showDrop && results.length > 0 && (
            <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-xl border border-[#E4E7EC] bg-white shadow-xl">
              {results.map(f => (
                <button key={f.id} type="button"
                  onClick={() => selectSource(f)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-[#F9FAFB]"
                >
                  <span className="shrink-0 font-mono text-[12px] text-[#667085]">{f.code}</span>
                  <span className="text-[14px] text-[#101828]">{f.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </FormSection>

      {source && (
        <FormSection title="Clases a importar">
          {loadingSourceClasses ? (
            <div className="flex h-20 items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#2C6B2F] border-t-transparent" />
            </div>
          ) : sourceClasses.length === 0 ? (
            <p className="py-3 text-center text-[13px] text-slate-400">
              {source.name} no tiene clases para importar.
            </p>
          ) : (
            <>
              <label className="flex cursor-pointer items-center gap-2.5 border-b border-[#E4E7EC] pb-3">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleAll}
                  className="h-4 w-4 accent-[#2C6B2F]"
                />
                <span className="text-[13px] font-semibold text-[#344054]">
                  Seleccionar todas ({sourceClasses.length})
                </span>
              </label>
              <div className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
                {sourceClasses.map(c => (
                  <label
                    key={c.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-[#F9FAFB]"
                  >
                    <input
                      type="checkbox"
                      checked={checked.has(c.id)}
                      onChange={() => toggle(c.id)}
                      className="h-4 w-4 shrink-0 accent-[#2C6B2F]"
                    />
                    <span className="shrink-0 font-mono text-[11px] font-bold text-slate-500">{c.code}</span>
                    <span className="min-w-0 flex-1 truncate text-[14px] text-[#101828]">{c.name}</span>
                  </label>
                ))}
              </div>
            </>
          )}
        </FormSection>
      )}

      {submitError && <ErrorBanner message={submitError} />}
      <FormActions
        pending={m.isPending}
        isEdit={false}
        label={`Importar ${checked.size} clase${checked.size !== 1 ? 's' : ''}`}
        onClose={onClose}
      />
    </form>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const SEL_KEY = 'codificacion:selection'

function readSavedSelection(): { selSeg: Segment | null; selFam: Family | null; selClass: ItemClass | null; selItem: ItemSummary | null } {
  try {
    const raw = sessionStorage.getItem(SEL_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { selSeg: null, selFam: null, selClass: null, selItem: null }
}

export function CodificacionPage() {
  const navigate = useNavigate()
  const qc       = useQueryClient()

  const saved = readSavedSelection()
  const [selSeg,   setSelSeg]   = useState<Segment | null>(saved.selSeg)
  const [selFam,   setSelFam]   = useState<Family | null>(saved.selFam)
  const [selClass, setSelClass] = useState<ItemClass | null>(saved.selClass)
  const [selItem,  setSelItem]  = useState<ItemSummary | null>(saved.selItem)
  const [sheet,    setSheet]    = useState<SheetKind>(null)

  useEffect(() => {
    sessionStorage.setItem(SEL_KEY, JSON.stringify({ selSeg, selFam, selClass, selItem }))
  }, [selSeg, selFam, selClass, selItem])

  const [editSeg,   setEditSeg]   = useState<Segment | null>(null)
  const [editFam,   setEditFam]   = useState<Family | null>(null)
  const [editClass, setEditClass] = useState<ItemClass | null>(null)

  const [delTarget, setDelTarget] = useState<{ kind: 'segment' | 'family' | 'item-class'; row: ColRow } | null>(null)
  const [delApiErr, setDelApiErr] = useState<string | null>(null)

  const { data: segments = [], isLoading: loadSegs } = useQuery({
    queryKey: ['segments'],
    queryFn:  () => apiClient.get<Segment[]>('/segments').then(r => r.data),
  })
  const { data: families = [], isLoading: loadFams } = useQuery({
    queryKey: ['families', selSeg?.id],
    queryFn:  () => apiClient.get<Family[]>(`/segments/${selSeg!.id}/families`).then(r => r.data),
    enabled:  !!selSeg,
  })
  const { data: itemClasses = [], isLoading: loadClasses } = useQuery({
    queryKey: ['item-classes', selFam?.id],
    queryFn:  () => apiClient.get<ItemClass[]>(`/families/${selFam!.id}/item-classes`).then(r => r.data),
    enabled:  !!selFam,
  })
  const { data: items = [], isLoading: loadItems } = useQuery({
    queryKey: ['items', selClass?.id],
    queryFn:  () => apiClient.get<ItemSummary[]>(`/item-classes/${selClass!.id}/items`).then(r => r.data),
    enabled:  !!selClass,
  })

  const deleteSegMut = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/segments/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['segments'] })
      if (selSeg?.id === delTarget?.row.id) { setSelSeg(null); setSelFam(null); setSelClass(null); setSelItem(null) }
      setDelTarget(null); setDelApiErr(null)
    },
    onError: err => setDelApiErr(getErrMsg(err)),
  })
  const deleteFamMut = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/families/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['families', selSeg?.id] })
      if (selFam?.id === delTarget?.row.id) { setSelFam(null); setSelClass(null); setSelItem(null) }
      setDelTarget(null); setDelApiErr(null)
    },
    onError: err => setDelApiErr(getErrMsg(err)),
  })
  const deleteClassMut = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/item-classes/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['item-classes', selFam?.id] })
      if (selClass?.id === delTarget?.row.id) { setSelClass(null); setSelItem(null) }
      setDelTarget(null); setDelApiErr(null)
    },
    onError: err => setDelApiErr(getErrMsg(err)),
  })

  const delPending = deleteSegMut.isPending || deleteFamMut.isPending || deleteClassMut.isPending

  const handleDeleteConfirm = () => {
    if (!delTarget) return
    setDelApiErr(null)
    if (delTarget.kind === 'segment')    deleteSegMut.mutate(delTarget.row.id)
    else if (delTarget.kind === 'family') deleteFamMut.mutate(delTarget.row.id)
    else deleteClassMut.mutate(delTarget.row.id)
  }

  const crumbs = [
    'Codificacion',
    selSeg   && `${selSeg.code} — ${selSeg.name}`,
    selFam   && `${selFam.code} — ${selFam.name}`,
    selClass && `${selClass.code} — ${selClass.name}`,
  ].filter(Boolean) as string[]

  const openNew  = (kind: SheetKind) => {
    if (kind === 'segment')    setEditSeg(null)
    if (kind === 'family')     setEditFam(null)
    if (kind === 'item-class') setEditClass(null)
    setSheet(kind)
  }
  const openEdit = (kind: SheetKind, row: Segment | Family | ItemClass) => {
    if (kind === 'segment')    setEditSeg(row as Segment)
    if (kind === 'family')     setEditFam(row as Family)
    if (kind === 'item-class') setEditClass(row as ItemClass)
    setSheet(kind)
  }

  const DEL_TITLES: Record<string, string> = {
    segment:    'Eliminar segmento',
    family:     'Eliminar familia',
    'item-class': 'Eliminar clase',
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#f7f8fa]">

      <header className="relative flex h-12 shrink-0 items-center border-b border-gray-200 bg-white px-6">
        <span className="absolute inset-x-0 top-0 h-[3px] bg-[#2C6B2F]" />
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
          {crumbs.map((part, i) => (
            <span key={i} className="flex shrink-0 items-center gap-1">
              {i > 0 && <span className="text-slate-300">/</span>}
              <span className={cn(
                'text-sm',
                i === crumbs.length - 1 ? 'font-semibold text-[#2C6B2F]' : 'text-slate-400',
              )}>
                {part}
              </span>
            </span>
          ))}
        </div>
        <div className="ml-4 flex shrink-0 items-center">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2C6B2F]/10 text-[#2C6B2F]">
            <User size={14} />
          </div>
        </div>
      </header>

      <div className="flex shrink-0 items-center gap-4 px-6 py-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#2C6B2F]/10">
          <Layers size={20} className="text-[#2C6B2F]" />
        </div>
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-[#111827]">Codificación</h1>
          <p className="mt-0.5 text-[13px] text-slate-400">Catálogo de artículos — jerarquía de 4 niveles</p>
        </div>
      </div>

      <div className="mx-6 mb-6 flex min-h-0 flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex h-full w-full">

          <CatalogColumn
            title="Segmentos" icon={LayoutGrid} rows={segments} selected={selSeg}
            isLoading={loadSegs} enabled={true} placeholderText="" width="w-[320px]"
            onSelect={row => {
              const seg = segments.find(s => s.id === row.id)!
              setSelSeg(seg); setSelFam(null); setSelClass(null); setSelItem(null)
            }}
            onNew={() => openNew('segment')}
            onEdit={row => openEdit('segment', segments.find(s => s.id === row.id)!)}
            onDelete={row => { setDelTarget({ kind: 'segment', row }); setDelApiErr(null) }}
            sortable
          />

          <CatalogColumn
            title="Familias" icon={FolderOpen} rows={families} selected={selFam}
            isLoading={loadFams} enabled={!!selSeg} placeholderText="Seleccioná un segmento"
            onSelect={row => {
              const fam = families.find(f => f.id === row.id)!
              setSelFam(fam); setSelClass(null); setSelItem(null)
            }}
            onNew={() => openNew('family')}
            onEdit={row => openEdit('family', families.find(f => f.id === row.id)!)}
            onDelete={row => { setDelTarget({ kind: 'family', row }); setDelApiErr(null) }}
            onBatch={() => setSheet('family-batch')}
            onExport={() => generateFamiliasXLSX(families, selSeg ? `${selSeg.code}` : 'todas')}
            sortable
          />

          <CatalogColumn
            title="Clases" icon={Package} rows={itemClasses} selected={selClass}
            isLoading={loadClasses} enabled={!!selFam} placeholderText="Seleccioná una familia"
            onSelect={row => {
              const cls = itemClasses.find(t => t.id === row.id)!
              setSelClass(cls); setSelItem(null)
            }}
            onNew={() => openNew('item-class')}
            onEdit={row => openEdit('item-class', itemClasses.find(t => t.id === row.id)!)}
            onDelete={row => { setDelTarget({ kind: 'item-class', row }); setDelApiErr(null) }}
            onBatch={() => setSheet('class-batch')}
            onCopy={() => setSheet('copy-to-family')}
          />

          <ItemsColumn
            rows={items} selected={selItem} isLoading={loadItems} enabled={!!selClass}
            onSelect={setSelItem}
            onNavigate={row => navigate({ to: `/app/catalog/items/${row.id}` })}
            onNew={() => setSheet('item')}
            onBatch={() => setSheet('batch')}
            onRename={() => setSheet('rename')}
          />

          <ContextPanel
            selSeg={selSeg}
            selFam={selFam}
            selClass={selClass}
            selItem={selItem}
            onNavigate={row => navigate({ to: `/app/catalog/items/${row.id}` })}
          />
        </div>
      </div>

      {/* Modals */}
      <FormDialog open={sheet === 'segment'} title={editSeg ? 'Modificar Segmento' : 'Nuevo Segmento'} onClose={() => setSheet(null)}>
        <SegmentForm item={editSeg} onSave={() => setSheet(null)} onClose={() => setSheet(null)} />
      </FormDialog>

      <FormDialog
        open={sheet === 'family'}
        title={editFam ? 'Modificar Familia' : 'Nueva Familia'}
        onClose={() => setSheet(null)}
      >
        {selSeg && (
          <FamilyForm
            item={editFam} segmentId={selSeg.id}
            segmentLabel={`${selSeg.code} — ${selSeg.name}`}
            onSave={() => setSheet(null)} onClose={() => setSheet(null)}
          />
        )}
      </FormDialog>

      <FormDialog
        open={sheet === 'item-class'}
        title={editClass ? 'Modificar Clase' : 'Nueva Clase'}
        width="w-[640px]"
        onClose={() => setSheet(null)}
      >
        {selFam && (
          <ItemClassForm
            item={editClass} familyId={selFam.id}
            familyLabel={`${selFam.code} — ${selFam.name}`}
            onSave={() => setSheet(null)} onClose={() => setSheet(null)}
          />
        )}
      </FormDialog>

      {selClass && (
        <NewItemForm
          open={sheet === 'item'}
          itemType={selClass}
          onSave={(_item: ItemDetail) => setSheet(null)}
          onClose={() => setSheet(null)}
        />
      )}

      <FormDialog
        open={sheet === 'batch'}
        title="Importar ítems desde texto"
        subtitle={selClass ? `${selClass.code} — ${selClass.name}` : undefined}
        width="w-[600px]"
        onClose={() => setSheet(null)}
      >
        {selClass && (
          <BatchImportForm
            typeId={selClass.id}
            typeLabel={`${selClass.code} — ${selClass.name}`}
            onSave={() => setSheet(null)}
            onClose={() => setSheet(null)}
          />
        )}
      </FormDialog>

      <FormDialog
        open={sheet === 'rename'}
        title="Renombrar ítems en lote"
        onClose={() => setSheet(null)}
      >
        {selClass && (
          <RenameForm
            typeId={selClass.id}
            typeLabel={`${selClass.code} — ${selClass.name}`}
            onSave={() => {
              qc.invalidateQueries({ queryKey: ['items', selClass.id] })
              setSheet(null)
            }}
            onClose={() => setSheet(null)}
          />
        )}
      </FormDialog>

      <FormDialog
        open={sheet === 'family-batch'}
        title="Importar familias desde texto"
        subtitle={selSeg ? `${selSeg.code} — ${selSeg.name}` : undefined}
        width="w-[600px]"
        onClose={() => setSheet(null)}
      >
        {selSeg && (
          <BatchFamilyImportForm
            segmentId={selSeg.id}
            segmentLabel={`${selSeg.code} — ${selSeg.name}`}
            onSave={() => setSheet(null)}
            onClose={() => setSheet(null)}
          />
        )}
      </FormDialog>

      <FormDialog
        open={sheet === 'class-batch'}
        title="Importar clases desde texto"
        subtitle={selFam ? `${selFam.code} — ${selFam.name}` : undefined}
        width="w-[600px]"
        onClose={() => setSheet(null)}
      >
        {selFam && (
          <BatchClassImportForm
            familyId={selFam.id}
            familyLabel={`${selFam.code} — ${selFam.name}`}
            onSave={() => setSheet(null)}
            onClose={() => setSheet(null)}
          />
        )}
      </FormDialog>

      <FormDialog
        open={sheet === 'copy-to-family'}
        title="Importar clases de otra familia"
        subtitle={selFam ? `Destino: ${selFam.code} — ${selFam.name}` : undefined}
        width="w-[520px]"
        onClose={() => setSheet(null)}
      >
        {selFam && (
          <ImportClassesForm
            targetFamilyId={selFam.id}
            targetFamilyLabel={`${selFam.code} — ${selFam.name}`}
            onSave={() => setSheet(null)}
            onClose={() => setSheet(null)}
          />
        )}
      </FormDialog>

      <ConfirmDialog
        open={!!delTarget}
        title={delTarget ? DEL_TITLES[delTarget.kind] : ''}
        description={delTarget ? `¿Eliminás "${delTarget.row.name}"? Esta acción no se puede deshacer.` : ''}
        isPending={delPending}
        apiErr={delApiErr}
        onConfirm={handleDeleteConfirm}
        onClose={() => { if (!delPending) { setDelTarget(null); setDelApiErr(null) } }}
      />
    </div>
  )
}
