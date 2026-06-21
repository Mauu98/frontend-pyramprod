import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { apiClient } from '@/lib/api-client'
import { FormDialog } from '@/components/ui/form-dialog'
import {
  FormField, FormSection, FormActions, ParentBadge, ErrorBanner,
  inputBase, textareaBase, inputError,
} from '@/components/ui/form-field'
import type { Category, Family, ItemType, ItemSummary, ItemDetail } from '@/types/api.types'
import { NewItemForm } from '@/components/catalog/NewItemForm'
import {
  Plus, Search, Pencil, Trash2, ChevronRight, Layers,
  AlertTriangle, User, LayoutGrid, FolderOpen, Package, Tag, ListPlus, Replace,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type SheetKind = 'category' | 'family' | 'type' | 'item' | 'batch' | 'rename' | null
interface ColRow { id: number; code: string; name: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getErrMsg(err: unknown): string {
  const d = (err as { response?: { data?: { code?: string; message?: string } } })?.response?.data
  if (!d) return 'No se pudo completar la operación. Verificá la conexión.'
  const byCode: Record<string, string> = {
    CATEGORY_HAS_FAMILIES: 'La categoría tiene familias. Eliminá las familias primero.',
    FAMILY_HAS_ITEM_TYPES: 'La familia tiene tipos. Eliminá los tipos primero.',
    ITEM_TYPE_HAS_ITEMS:   'El tipo tiene ítems. Eliminá los ítems primero.',
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
  selCat, selFam, selType, selItem, onNavigate,
}: {
  selCat:     Category | null
  selFam:     Family | null
  selType:    ItemType | null
  selItem:    ItemSummary | null
  onNavigate: (r: ItemSummary) => void
}) {
  if (!selCat) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 bg-[#f7f8fa] p-10 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-sm">
          <Layers size={26} strokeWidth={1.2} className="text-slate-300" />
        </div>
        <div>
          <p className="text-[15px] font-semibold text-slate-300">Seleccioná una categoría</p>
          <p className="mt-1 text-[13px] text-slate-200">Los detalles aparecerán aquí</p>
        </div>
      </div>
    )
  }

  // ── Item selected ──────────────────────────────────────────────────────────
  if (selItem) {
    return (
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto bg-[#f7f8fa] p-6">
        {/* Card header */}
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
              <div className={cn(
                'ml-auto shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide',
                selItem.active
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-400',
              )}>
                {selItem.active ? 'Activo' : 'Inactivo'}
              </div>
            </div>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 gap-3">
              <StatTile label="Stock" value={(selItem.stock ?? 0).toFixed(2)} sub={selItem.unitOfMeasure ?? undefined} />
              <StatTile label="Mínimo" value={(selItem.stockMin ?? 0).toFixed(2)} sub={selItem.unitOfMeasure ?? undefined} />
            </div>
          </div>
        </div>

        {/* Navigate CTA */}
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

  // ── Type selected ──────────────────────────────────────────────────────────
  if (selType) {
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
                  {selType.code}
                </p>
                <p className="truncate text-[16px] font-bold text-[#111827]">{selType.name}</p>
              </div>
            </div>
          </div>
          <div className="px-5 py-2">
            {selType.abbreviation && <InfoRow label="Abreviatura" value={selType.abbreviation} />}
            {selType.material && (
              <InfoRow label="Material" value={selType.materialName ?? selType.material} />
            )}
            {selType.unitOfMeasure && <InfoRow label="Unidad de medida" value={selType.unitOfMeasure} />}
            {selType.specificWeight != null && (
              <InfoRow label="Peso específico" value={selType.specificWeight.toString()} />
            )}
            {selType.nominalDimension != null && (
              <InfoRow label="Dimensión nominal" value={selType.nominalDimension.toString()} />
            )}
            {selType.description && (
              <div className="pb-4 pt-3">
                <p className="text-[13px] leading-relaxed text-slate-400">{selType.description}</p>
              </div>
            )}
          </div>
        </div>
        <p className="text-center text-[12px] text-slate-300">Seleccioná un ítem para ver sus detalles</p>
      </div>
    )
  }

  // ── Family selected ────────────────────────────────────────────────────────
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
        <p className="text-center text-[12px] text-slate-300">Seleccioná un tipo para ver sus detalles</p>
      </div>
    )
  }

  // ── Category selected ──────────────────────────────────────────────────────
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
                {selCat.code}
              </p>
              <p className="truncate text-[16px] font-bold text-[#111827]">{selCat.name}</p>
            </div>
          </div>
        </div>
        <div className="px-5 py-2">
          {selCat.abbreviation && <InfoRow label="Abreviatura" value={selCat.abbreviation} />}
          {selCat.description && (
            <div className="pb-4 pt-3">
              <p className="text-[13px] leading-relaxed text-slate-400">{selCat.description}</p>
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

// ─── Catalog column ───────────────────────────────────────────────────────────
const SINGULAR: Record<string, string> = { Categorias: 'categoría', Familias: 'familia', Tipos: 'tipo' }

function CatalogColumn({
  title, icon: Icon, rows, selected, isLoading, enabled, placeholderText,
  onSelect, onNew, onEdit, onDelete,
}: {
  title: string; icon: LucideIcon; rows: ColRow[]; selected: ColRow | null
  isLoading?: boolean; enabled: boolean; placeholderText: string
  onSelect: (r: ColRow) => void; onNew: () => void
  onEdit: (r: ColRow) => void; onDelete: (r: ColRow) => void
}) {
  const [q, setQ] = useState('')
  const filtered  = rows.filter(r => !q || r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q))
  const singular  = SINGULAR[title] ?? title.toLowerCase()

  return (
    <div className={cn(
      'flex w-[272px] shrink-0 flex-col border-r border-gray-200 bg-white transition-opacity duration-150',
      !enabled && 'pointer-events-none opacity-25',
    )}>
      {/* Header — pl-5 pr-7 gives 28px right gap so [+] never looks pinched */}
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-gray-100 bg-[#f7f8fa] pl-5 pr-7">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#2C6B2F]/10">
          <Icon size={14} className="text-[#2C6B2F]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-[#374151]">{title}</p>
          <p className="text-[11px] text-slate-400">{rows.length} registros</p>
        </div>
        {enabled && (
          <button
            onClick={onNew}
            title={`Nueva ${singular}`}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#2C6B2F] text-white shadow-sm transition hover:bg-[#1E4B21] active:scale-95"
          >
            <Plus size={13} />
          </button>
        )}
      </div>

      {/* Search */}
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

      {/* Body */}
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
        ) : filtered.length === 0 ? (
          <div className="flex h-28 flex-col items-center justify-center gap-2">
            <Search size={20} strokeWidth={1.2} className="text-slate-200" />
            <p className="text-[13px] text-slate-300">Sin resultados</p>
          </div>
        ) : filtered.map(row => {
          const isSel = selected?.id === row.id
          return (
            <div
              key={row.id}
              onClick={() => onSelect(row)}
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
                {row.code}
              </span>
              <span className={cn(
                'min-w-0 flex-1 truncate text-[14px] leading-snug',
                isSel ? 'font-semibold text-[#1a3d1c]' : 'font-medium text-[#374151]',
              )}>
                {row.name}
              </span>
              <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
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
  const filtered  = rows.filter(r => !q || r.fullName.toLowerCase().includes(q) || r.fullCode.toLowerCase().includes(q))

  return (
    <div className={cn(
      'flex w-[320px] shrink-0 flex-col border-r border-gray-200 bg-white transition-opacity duration-150',
      !enabled && 'pointer-events-none opacity-25',
    )}>
      {/* Header */}
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
            title="Crear múltiples ítems"
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
      <div className="min-h-0 flex-1 overflow-y-auto">
        {!enabled ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <Tag size={28} strokeWidth={1} className="text-slate-200" />
            <p className="text-[13px] text-slate-300">Seleccioná un tipo</p>
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
                <span className="font-mono text-[12px] font-semibold text-slate-500">{(row.stock ?? 0).toFixed(2)}</span>
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

// ─── Batch create form ────────────────────────────────────────────────────────
function BatchCreateForm({ typeId, typeLabel, onSave, onClose }: {
  typeId: number; typeLabel: string; onSave: () => void; onClose: () => void
}) {
  const qc = useQueryClient()
  const [rows, setRows] = useState([{ fullName: '', abbreviation: '' }])
  const [submitError, setSubmitError] = useState<string | null>(null)

  const addRow = () => setRows(r => [...r, { fullName: '', abbreviation: '' }])
  const removeRow = (i: number) => setRows(r => r.filter((_, j) => j !== i))
  const setField = (i: number, field: 'fullName' | 'abbreviation', value: string) =>
    setRows(r => r.map((row, j) => j === i ? { ...row, [field]: value } : row))

  const m = useMutation({
    mutationFn: () => apiClient.post('/items/batch', {
      typeId,
      items: rows.filter(r => r.fullName.trim()).map(r => ({
        fullName: r.fullName.trim(),
        abbreviation: r.abbreviation.trim() || undefined,
      })),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items', typeId] })
      onSave()
    },
    onError: err => setSubmitError(getSaveErrMsg(err) ?? 'Error al crear los ítems.'),
  })

  const validCount = rows.filter(r => r.fullName.trim()).length

  return (
    <form
      onSubmit={e => { e.preventDefault(); setSubmitError(null); if (validCount > 0) m.mutate() }}
      className="flex flex-col gap-6"
    >
      <ParentBadge label="Tipo" value={typeLabel} />
      <FormSection title="Ítems a crear" first>
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-3 px-1">
            <span className="w-6 shrink-0" />
            <span className="flex-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">Nombre completo</span>
            <span className="w-32 shrink-0 text-[11px] font-bold uppercase tracking-wide text-slate-400">Abreviatura</span>
            <span className="w-8 shrink-0" />
          </div>
          {rows.map((row, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="w-6 shrink-0 text-center text-[12px] font-mono text-slate-300">{i + 1}</span>
              <input
                value={row.fullName}
                onChange={e => setField(i, 'fullName', e.target.value)}
                placeholder="Ej: Perno M8 x 30mm"
                maxLength={145}
                className={cn(inputBase, 'flex-1')}
              />
              <input
                value={row.abbreviation}
                onChange={e => setField(i, 'abbreviation', e.target.value)}
                placeholder="Abrev."
                maxLength={25}
                className={cn(inputBase, 'w-32 shrink-0')}
              />
              <button
                type="button"
                onClick={() => removeRow(i)}
                disabled={rows.length === 1}
                className="flex h-10 w-8 shrink-0 items-center justify-center rounded-lg text-slate-300 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-0"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addRow}
          className="flex w-fit items-center gap-1.5 rounded-lg px-2 py-1 text-[14px] font-medium text-[#2C6B2F] transition hover:bg-[#2C6B2F]/8"
        >
          <Plus size={14} />
          Agregar fila
        </button>
      </FormSection>

      {validCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-[#2C6B2F]/8 px-5 py-3.5">
          <Tag size={14} className="shrink-0 text-[#2C6B2F]" />
          <p className="text-[14px] text-[#2C6B2F]">
            Se crearán <strong>{validCount}</strong> {validCount === 1 ? 'ítem' : 'ítems'}
            {rows.length > validCount && (
              <span className="ml-1.5 text-[#6B7280]">
                ({rows.length - validCount} {rows.length - validCount === 1 ? 'fila vacía ignorada' : 'filas vacías ignoradas'})
              </span>
            )}
          </p>
        </div>
      )}

      {submitError && <ErrorBanner message={submitError} />}
      <FormActions
        pending={m.isPending}
        isEdit={false}
        label={`Crear ${validCount} ítem${validCount !== 1 ? 's' : ''}`}
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
      apiClient.patch(`/item-types/${typeId}/items/rename`, d),
    onSuccess: onSave,
  })
  return (
    <form onSubmit={handleSubmit(d => m.mutate(d))} className="flex flex-col gap-7">
      <ParentBadge label="Tipo" value={typeLabel} />
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

// ─── Category form ────────────────────────────────────────────────────────────
function CategoryForm({ item, onSave, onClose }: { item: Category | null; onSave: () => void; onClose: () => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      code: item?.code ?? '', name: item?.name ?? '',
      abbreviation: item?.abbreviation ?? '', description: item?.description ?? '',
    },
  })
  const m = useMutation({
    mutationFn: (d: object) => item ? apiClient.put(`/categories/${item.id}`, d) : apiClient.post('/categories', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); onSave() },
  })
  return (
    <form onSubmit={handleSubmit(d => m.mutate(d))} className="flex flex-col gap-7">
      <div className="grid grid-cols-[100px_1fr] gap-5">
        <FormField label="Código" required error={!!errors.code && 'Campo requerido'}>
          <input
            {...register('code', { required: true })} maxLength={1}
            className={cn(inputBase, 'text-center text-[17px] font-bold uppercase tracking-widest font-mono', errors.code && inputError)}
            placeholder="A"
          />
        </FormField>
        <FormField label="Abreviatura" optional>
          <input {...register('abbreviation')} maxLength={5} className={inputBase} placeholder="ACE" />
        </FormField>
      </div>
      <FormField label="Nombre" required error={!!errors.name && 'Campo requerido'}>
        <input
          {...register('name', { required: true })}
          className={cn(inputBase, errors.name && inputError)}
          placeholder="Ej: Aceros y metales"
        />
      </FormField>
      <FormField label="Descripción" optional>
        <textarea {...register('description')} rows={3} className={textareaBase} placeholder="Descripción de la categoría..." />
      </FormField>
      {m.isError && <ErrorBanner message={getSaveErrMsg(m.error)} />}
      <FormActions pending={m.isPending} isEdit={!!item} label="Crear categoría" onClose={onClose} />
    </form>
  )
}

// ─── Family form ──────────────────────────────────────────────────────────────
function FamilyForm({ item, categoryId, categoryLabel, onSave, onClose }: {
  item: Family | null; categoryId: number; categoryLabel: string; onSave: () => void; onClose: () => void
}) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      code: item?.code ?? '', name: item?.name ?? '',
      abbreviation: item?.abbreviation ?? '', description: item?.description ?? '', categoryId,
    },
  })
  const m = useMutation({
    mutationFn: (d: object) => item ? apiClient.put(`/families/${item.id}`, d) : apiClient.post('/families', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['families', categoryId] }); onSave() },
  })
  return (
    <form onSubmit={handleSubmit(d => m.mutate(d))} className="flex flex-col gap-7">
      <ParentBadge label="Categoría" value={categoryLabel} />
      <div className="grid grid-cols-[100px_1fr] gap-5">
        <FormField label="Código" required error={!!errors.code && 'Campo requerido'}>
          <input
            {...register('code', { required: true })} maxLength={3}
            className={cn(inputBase, 'text-center font-bold tracking-widest font-mono', errors.code && inputError)}
            placeholder="001"
          />
        </FormField>
        <FormField label="Abreviatura" optional>
          <input {...register('abbreviation')} maxLength={25} className={inputBase} placeholder="PLA" />
        </FormField>
      </div>
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

// ─── Type form ────────────────────────────────────────────────────────────────
function TypeForm({ item, familyId, familyLabel, onSave, onClose }: {
  item: ItemType | null; familyId: number; familyLabel: string; onSave: () => void; onClose: () => void
}) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      code: item?.code ?? '', name: item?.name ?? '',
      abbreviation: item?.abbreviation ?? '', description: item?.description ?? '', familyId,
    },
  })
  const m = useMutation({
    mutationFn: (d: object) => item ? apiClient.put(`/item-types/${item.id}`, d) : apiClient.post('/item-types', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['types', familyId] }); onSave() },
  })
  return (
    <form onSubmit={handleSubmit(d => m.mutate(d))} className="flex flex-col gap-7">
      <ParentBadge label="Familia" value={familyLabel} />
      <div className="grid grid-cols-[100px_1fr] gap-5">
        <FormField label="Código" required error={!!errors.code && 'Campo requerido'}>
          <input
            {...register('code', { required: true })} maxLength={3}
            className={cn(inputBase, 'text-center font-bold tracking-widest font-mono', errors.code && inputError)}
            placeholder="001"
          />
        </FormField>
        <FormField label="Abreviatura" optional>
          <input {...register('abbreviation')} className={inputBase} placeholder="PLA1-1/8" />
        </FormField>
      </div>
      <FormField label="Nombre / Especificación" required error={!!errors.name && 'Campo requerido'}
        helper='Ej: PLA SAE1010 1"x1/8"'>
        <input
          {...register('name', { required: true })}
          className={cn(inputBase, errors.name && inputError)}
          placeholder='Ej: PLA SAE1010 1"x1/8"'
        />
      </FormField>
      <FormField label="Descripción" optional>
        <textarea {...register('description')} rows={3} className={textareaBase} placeholder="Descripción del tipo..." />
      </FormField>
      {m.isError && <ErrorBanner message={getSaveErrMsg(m.error)} />}
      <FormActions pending={m.isPending} isEdit={!!item} label="Crear tipo" onClose={onClose} />
    </form>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const SEL_KEY = 'codificacion:selection'

function readSavedSelection(): { selCat: Category | null; selFam: Family | null; selType: ItemType | null; selItem: ItemSummary | null } {
  try {
    const raw = sessionStorage.getItem(SEL_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { selCat: null, selFam: null, selType: null, selItem: null }
}

export function CodificacionPage() {
  const navigate = useNavigate()
  const qc       = useQueryClient()

  const saved = readSavedSelection()
  const [selCat,  setSelCat]  = useState<Category | null>(saved.selCat)
  const [selFam,  setSelFam]  = useState<Family | null>(saved.selFam)
  const [selType, setSelType] = useState<ItemType | null>(saved.selType)
  const [selItem, setSelItem] = useState<ItemSummary | null>(saved.selItem)
  const [sheet,   setSheet]   = useState<SheetKind>(null)

  useEffect(() => {
    sessionStorage.setItem(SEL_KEY, JSON.stringify({ selCat, selFam, selType, selItem }))
  }, [selCat, selFam, selType, selItem])
  const [editCat,  setEditCat]  = useState<Category | null>(null)
  const [editFam,  setEditFam]  = useState<Family | null>(null)
  const [editType, setEditType] = useState<ItemType | null>(null)

  const [delTarget, setDelTarget] = useState<{ kind: 'category' | 'family' | 'type'; row: ColRow } | null>(null)
  const [delApiErr, setDelApiErr] = useState<string | null>(null)

  const { data: categories = [], isLoading: loadCats } = useQuery({
    queryKey: ['categories'],
    queryFn:  () => apiClient.get<Category[]>('/categories').then(r => r.data),
  })
  const { data: families = [], isLoading: loadFams } = useQuery({
    queryKey: ['families', selCat?.id],
    queryFn:  () => apiClient.get<Family[]>(`/categories/${selCat!.id}/families`).then(r => r.data),
    enabled:  !!selCat,
  })
  const { data: types = [], isLoading: loadTypes } = useQuery({
    queryKey: ['types', selFam?.id],
    queryFn:  () => apiClient.get<ItemType[]>(`/families/${selFam!.id}/item-types`).then(r => r.data),
    enabled:  !!selFam,
  })
  const { data: items = [], isLoading: loadItems } = useQuery({
    queryKey: ['items', selType?.id],
    queryFn:  () => apiClient.get<ItemSummary[]>(`/item-types/${selType!.id}/items`).then(r => r.data),
    enabled:  !!selType,
  })

  const deleteCatMut = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/categories/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      if (selCat?.id === delTarget?.row.id) { setSelCat(null); setSelFam(null); setSelType(null); setSelItem(null) }
      setDelTarget(null); setDelApiErr(null)
    },
    onError: err => setDelApiErr(getErrMsg(err)),
  })
  const deleteFamMut = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/families/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['families', selCat?.id] })
      if (selFam?.id === delTarget?.row.id) { setSelFam(null); setSelType(null); setSelItem(null) }
      setDelTarget(null); setDelApiErr(null)
    },
    onError: err => setDelApiErr(getErrMsg(err)),
  })
  const deleteTypeMut = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/item-types/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['types', selFam?.id] })
      if (selType?.id === delTarget?.row.id) { setSelType(null); setSelItem(null) }
      setDelTarget(null); setDelApiErr(null)
    },
    onError: err => setDelApiErr(getErrMsg(err)),
  })

  const delPending = deleteCatMut.isPending || deleteFamMut.isPending || deleteTypeMut.isPending

  const handleDeleteConfirm = () => {
    if (!delTarget) return
    setDelApiErr(null)
    if (delTarget.kind === 'category') deleteCatMut.mutate(delTarget.row.id)
    else if (delTarget.kind === 'family') deleteFamMut.mutate(delTarget.row.id)
    else deleteTypeMut.mutate(delTarget.row.id)
  }

  const crumbs = [
    'Codificacion',
    selCat  && `${selCat.code} — ${selCat.name}`,
    selFam  && `${selFam.code} — ${selFam.name}`,
    selType && `${selType.code} — ${selType.name}`,
  ].filter(Boolean) as string[]

  const openNew  = (kind: SheetKind) => {
    if (kind === 'category') setEditCat(null)
    if (kind === 'family')   setEditFam(null)
    if (kind === 'type')     setEditType(null)
    setSheet(kind)
  }
  const openEdit = (kind: SheetKind, row: Category | Family | ItemType) => {
    if (kind === 'category') setEditCat(row as Category)
    if (kind === 'family')   setEditFam(row as Family)
    if (kind === 'type')     setEditType(row as ItemType)
    setSheet(kind)
  }

  const DEL_TITLES: Record<string, string> = {
    category: 'Eliminar categoría',
    family:   'Eliminar familia',
    type:     'Eliminar tipo',
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#f7f8fa]">

      {/* Topbar */}
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

      {/* Page heading */}
      <div className="flex shrink-0 items-center gap-4 px-6 py-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#2C6B2F]/10">
          <Layers size={20} className="text-[#2C6B2F]" />
        </div>
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-[#111827]">Codificación</h1>
          <p className="mt-0.5 text-[13px] text-slate-400">Catálogo de artículos — jerarquía de 4 niveles</p>
        </div>
      </div>

      {/* Column panel */}
      <div className="mx-6 mb-6 flex min-h-0 flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex h-full w-full">

          <CatalogColumn
            title="Categorias" icon={LayoutGrid} rows={categories} selected={selCat}
            isLoading={loadCats} enabled={true} placeholderText=""
            onSelect={row => {
              const cat = categories.find(c => c.id === row.id)!
              setSelCat(cat); setSelFam(null); setSelType(null); setSelItem(null)
            }}
            onNew={() => openNew('category')}
            onEdit={row => openEdit('category', categories.find(c => c.id === row.id)!)}
            onDelete={row => { setDelTarget({ kind: 'category', row }); setDelApiErr(null) }}
          />

          <CatalogColumn
            title="Familias" icon={FolderOpen} rows={families} selected={selFam}
            isLoading={loadFams} enabled={!!selCat} placeholderText="Seleccioná una categoría"
            onSelect={row => {
              const fam = families.find(f => f.id === row.id)!
              setSelFam(fam); setSelType(null); setSelItem(null)
            }}
            onNew={() => openNew('family')}
            onEdit={row => openEdit('family', families.find(f => f.id === row.id)!)}
            onDelete={row => { setDelTarget({ kind: 'family', row }); setDelApiErr(null) }}
          />

          <CatalogColumn
            title="Tipos" icon={Package} rows={types} selected={selType}
            isLoading={loadTypes} enabled={!!selFam} placeholderText="Seleccioná una familia"
            onSelect={row => {
              const type = types.find(t => t.id === row.id)!
              setSelType(type); setSelItem(null)
            }}
            onNew={() => openNew('type')}
            onEdit={row => openEdit('type', types.find(t => t.id === row.id)!)}
            onDelete={row => { setDelTarget({ kind: 'type', row }); setDelApiErr(null) }}
          />

          <ItemsColumn
            rows={items} selected={selItem} isLoading={loadItems} enabled={!!selType}
            onSelect={setSelItem}
            onNavigate={row => navigate({ to: `/app/catalog/items/${row.id}` })}
            onNew={() => setSheet('item')}
            onBatch={() => setSheet('batch')}
            onRename={() => setSheet('rename')}
          />

          <ContextPanel
            selCat={selCat}
            selFam={selFam}
            selType={selType}
            selItem={selItem}
            onNavigate={row => navigate({ to: `/app/catalog/items/${row.id}` })}
          />
        </div>
      </div>

      {/* Modals */}
      <FormDialog open={sheet === 'category'} title={editCat ? 'Modificar Categoría' : 'Nueva Categoría'} onClose={() => setSheet(null)}>
        <CategoryForm item={editCat} onSave={() => setSheet(null)} onClose={() => setSheet(null)} />
      </FormDialog>

      <FormDialog
        open={sheet === 'family'}
        title={editFam ? 'Modificar Familia' : 'Nueva Familia'}
        onClose={() => setSheet(null)}
      >
        {selCat && (
          <FamilyForm
            item={editFam} categoryId={selCat.id}
            categoryLabel={`${selCat.code} — ${selCat.name}`}
            onSave={() => setSheet(null)} onClose={() => setSheet(null)}
          />
        )}
      </FormDialog>

      <FormDialog
        open={sheet === 'type'}
        title={editType ? 'Modificar Tipo' : 'Nuevo Tipo'}
        onClose={() => setSheet(null)}
      >
        {selFam && (
          <TypeForm
            item={editType} familyId={selFam.id}
            familyLabel={`${selFam.code} — ${selFam.name}`}
            onSave={() => setSheet(null)} onClose={() => setSheet(null)}
          />
        )}
      </FormDialog>

      {selType && (
        <NewItemForm
          open={sheet === 'item'}
          itemType={selType}
          onSave={(_item: ItemDetail) => setSheet(null)}
          onClose={() => setSheet(null)}
        />
      )}

      <FormDialog
        open={sheet === 'batch'}
        title="Crear múltiples ítems"
        subtitle={selType ? `${selType.code} — ${selType.name}` : undefined}
        width="w-[700px]"
        onClose={() => setSheet(null)}
      >
        {selType && (
          <BatchCreateForm
            typeId={selType.id}
            typeLabel={`${selType.code} — ${selType.name}`}
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
        {selType && (
          <RenameForm
            typeId={selType.id}
            typeLabel={`${selType.code} — ${selType.name}`}
            onSave={() => {
              qc.invalidateQueries({ queryKey: ['items', selType.id] })
              setSheet(null)
            }}
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
