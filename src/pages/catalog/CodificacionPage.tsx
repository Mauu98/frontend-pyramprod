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
import type { Segment, Family, ItemClass, ItemSummary, ItemDetail } from '@/types/api.types'
import { NewItemForm } from '@/components/catalog/NewItemForm'
import {
  Plus, Search, Pencil, Trash2, ChevronRight, Layers,
  AlertTriangle, User, LayoutGrid, FolderOpen, Package, Tag, ListPlus, Replace,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type SheetKind = 'segment' | 'family' | 'item-class' | 'item' | 'batch' | 'rename' | null
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

// ─── Catalog column ───────────────────────────────────────────────────────────
const SINGULAR: Record<string, string> = {
  Segmentos: 'segmento',
  Familias:  'familia',
  Clases:    'clase',
}

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
            title={`Nuevo ${singular}`}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#2C6B2F] text-white shadow-sm transition hover:bg-[#1E4B21] active:scale-95"
          >
            <Plus size={13} />
          </button>
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

// ─── Item class form ──────────────────────────────────────────────────────────
function ItemClassForm({ item, familyId, familyLabel, onSave, onClose }: {
  item: ItemClass | null; familyId: number; familyLabel: string; onSave: () => void; onClose: () => void
}) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      name: item?.name ?? '',
      abbreviation: item?.abbreviation ?? '',
      description: item?.description ?? '',
      familyId,
    },
  })
  const m = useMutation({
    mutationFn: (d: object) => item ? apiClient.put(`/item-classes/${item.id}`, d) : apiClient.post('/item-classes', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['item-classes', familyId] }); onSave() },
  })
  return (
    <form onSubmit={handleSubmit(d => m.mutate(d))} className="flex flex-col gap-7">
      <ParentBadge label="Familia" value={familyLabel} />
      <FormField label="Abreviatura" optional>
        <input {...register('abbreviation')} maxLength={25} className={inputBase} placeholder="PLA1-1/8" />
      </FormField>
      <FormField label="Nombre / Especificación" required error={!!errors.name && 'Campo requerido'}
        helper='Ej: PLA SAE1010 1"x1/8"'>
        <input
          {...register('name', { required: true })}
          className={cn(inputBase, errors.name && inputError)}
          placeholder='Ej: PLA SAE1010 1"x1/8"'
        />
      </FormField>
      <FormField label="Descripción" optional>
        <textarea {...register('description')} rows={3} className={textareaBase} placeholder="Descripción de la clase..." />
      </FormField>
      {m.isError && <ErrorBanner message={getSaveErrMsg(m.error)} />}
      <FormActions pending={m.isPending} isEdit={!!item} label="Crear clase" onClose={onClose} />
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
            isLoading={loadSegs} enabled={true} placeholderText=""
            onSelect={row => {
              const seg = segments.find(s => s.id === row.id)!
              setSelSeg(seg); setSelFam(null); setSelClass(null); setSelItem(null)
            }}
            onNew={() => openNew('segment')}
            onEdit={row => openEdit('segment', segments.find(s => s.id === row.id)!)}
            onDelete={row => { setDelTarget({ kind: 'segment', row }); setDelApiErr(null) }}
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
