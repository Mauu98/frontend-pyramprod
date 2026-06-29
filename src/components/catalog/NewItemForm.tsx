import { useState, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { ItemClass, ItemDetail, ItemSummary, WeightMethod } from '@/types/api.types'
import { Search, Weight } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  FormField, FormSection, FormActions, ErrorBanner,
  inputBase, inputError,
} from '@/components/ui/form-field'
import { FormDialog } from '@/components/ui/form-dialog'

// ─── Weight calculation ───────────────────────────────────────────────────────
function calcWeight(unit: WeightMethod, sw: number, nd: number, d1: number, d2: number, d3: number): number {
  const f = (sw * nd) / 1_000_000_000
  switch (unit) {
    case 'Mm.':     return f * d1 * d2
    case 'Mm2.':    return f * d1
    case 'Mm3.':    return f * d1 * d2 * d3
    case 'Kg./Und': return f * d1
    case 'Und/Kg.': return f * d1
  }
}

// ─── Name auto-composer ───────────────────────────────────────────────────────
function composeName(matName: string, d1: number, d2: number, d3: number, unit: WeightMethod | null, opName: string, complement: string, fn: string): string {
  const dim = !unit ? '' : unit === 'Mm.' ? `${d1}x${d2}` : unit === 'Mm3.' ? `${d1}x${d2}x${d3}` : `${d1}`
  return [matName, dim, opName, complement ? `[${complement}]` : '', fn].filter(Boolean).join(' ').slice(0, 145)
}

interface FormValues { d1: string; d2: string; d3: string; func: string; complement: string }

// ─── Material picker ──────────────────────────────────────────────────────────
function MaterialPicker({ value, onChange }: { value: string; onChange: (code: string, name: string) => void }) {
  const [term, setTerm] = useState('')
  const [open, setOpen] = useState(false)

  const { data: results = [] } = useQuery<ItemSummary[]>({
    queryKey: ['materials-search', term],
    queryFn:  () => apiClient.get<ItemSummary[]>(`/items/materials?term=${encodeURIComponent(term)}`).then(r => r.data),
    enabled:  term.length >= 2,
  })

  return (
    <div className="relative">
      <div className={cn(inputBase, 'flex items-center gap-2')}>
        <Search size={14} className="shrink-0 text-[#999999]" />
        <input
          type="text" placeholder="Buscar materia prima..."
          value={term}
          onChange={e => { setTerm(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          className="min-w-0 flex-1 bg-transparent text-[14px] text-[#1A1A1A] placeholder:italic placeholder:text-[#999999] focus:outline-none"
        />
        {value && (
          <span className="shrink-0 rounded bg-[#2C3E50]/10 px-1.5 py-0.5 font-mono text-xs font-bold text-[#2C3E50]">{value}</span>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-0.5 max-h-48 w-full overflow-y-auto rounded border border-[#D0D0D0] bg-white shadow-lg">
          {results.map(r => (
            <button key={r.id} type="button"
              onClick={() => { onChange(r.fullCode, r.fullName); setTerm(r.fullCode); setOpen(false) }}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-[#f7f8fa]"
            >
              <span className="shrink-0 rounded bg-[#2C3E50]/10 px-1.5 py-px font-mono text-[11px] font-bold text-[#2C3E50]">{r.fullCode}</span>
              <span className="min-w-0 truncate text-[13px] text-[#1A1A1A]">{r.fullName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main modal ───────────────────────────────────────────────────────────────
export function NewItemForm({ open, itemType, onSave, onClose }: {
  open: boolean; itemType: ItemClass; onSave: (item: ItemDetail) => void; onClose: () => void
}) {
  const qc = useQueryClient()
  const { register, handleSubmit, control, formState: { errors } } = useForm<FormValues>({
    defaultValues: { d1: '', d2: '', d3: '', func: '', complement: '' },
  })
  const watched = useWatch({ control })
  const [matName, setMatName] = useState(itemType.materialName ?? '')
  const [matCode, setMatCode] = useState(itemType.material ?? '')

  const d1 = parseFloat(watched.d1 || '0') || 0
  const d2 = parseFloat(watched.d2 || '0') || 0
  const d3 = parseFloat(watched.d3 || '0') || 0
  const unit = itemType.weightMethod

  const weight = useMemo(() => {
    if (!unit || !itemType.specificWeight || !itemType.nominalDimension) return null
    return calcWeight(unit, itemType.specificWeight, itemType.nominalDimension, d1, d2, d3)
  }, [unit, itemType, d1, d2, d3])

  const previewName = useMemo(() =>
    composeName(matName, d1, d2, d3, unit, itemType.operatorName ?? '', watched.complement ?? '', watched.func ?? ''),
    [matName, d1, d2, d3, unit, itemType, watched.complement, watched.func],
  )

  const m = useMutation({
    mutationFn: (p: object) => apiClient.post<ItemDetail>('/items', p).then(r => r.data),
    onSuccess: item => { qc.invalidateQueries({ queryKey: ['items', itemType.id] }); onSave(item) },
  })

  const needD2 = unit === 'Mm.' || unit === 'Mm3.'
  const needD3 = unit === 'Mm3.'
  const d1Label: Record<WeightMethod, string> = {
    'Mm.': 'Largo (mm)', 'Mm2.': 'Área (mm²)', 'Mm3.': 'Largo (mm)',
    'Kg./Und': 'Peso/pieza (kg)', 'Und/Kg.': 'Piezas/kg',
  }

  const onSubmit = (v: FormValues) => {
    m.mutate({
      typeId:              itemType.id,
      fullName:            previewName || v.func,
      functionName:        v.func || null,
      material:            matCode || null,
      materialDevelopment: d1 || null,
      unitConsumption:     unit ?? 'Und',
      unitPurchase:        'Und',
      dim2:                d2 || null,
      dim3:                d3 || null,
      weight:              weight ?? null,
      operationComplement: v.complement || null,
    })
  }

  return (
    <FormDialog
      open={open}
      title="Nuevo Item"
      subtitle={`${itemType.code} — ${itemType.name}`}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">

            {/* Material */}
            <FormSection title="Material" first>
              {itemType.material ? (
                <div className="flex items-center gap-3 rounded border border-[#D0D0D0] bg-[#f7f8fa] px-3 py-2.5">
                  <span className="rounded bg-[#2C3E50]/10 px-2 py-0.5 font-mono text-xs font-bold text-[#2C3E50]">{itemType.material}</span>
                  <span className="text-[14px] text-[#1A1A1A]">{itemType.materialName}</span>
                </div>
              ) : (
                <FormField label="Materia prima" required error={!!errors && !matCode ? 'Seleccioná una materia prima' : undefined}>
                  <MaterialPicker value={matCode} onChange={(c, n) => { setMatCode(c); setMatName(n) }} />
                </FormField>
              )}
            </FormSection>

            {/* Dimensiones — always shown; labels adapt to weightMethod when set */}
            <FormSection title="Dimensiones">
              {unit && (
                <div className="mb-3 flex items-center gap-2 rounded border border-[#E8E8E8] bg-[#f7f8fa] px-3 py-2">
                  <Weight size={13} className="text-[#888888]" />
                  <span className="text-[13px] text-[#555555]">Método: <strong>{unit}</strong></span>
                </div>
              )}
              <div className={cn('grid gap-4', needD3 ? 'grid-cols-3' : needD2 ? 'grid-cols-2' : 'grid-cols-2')}>
                <FormField label={unit ? d1Label[unit] : 'Desarrollo / dim1'} optional>
                  <input type="number" step="0.001" min="0" placeholder="0.000"
                    {...register('d1')}
                    className={inputBase}
                  />
                </FormField>
                <FormField label={unit === 'Mm.' ? 'Ancho (mm)' : unit === 'Mm3.' ? 'Alto (mm)' : 'Dim 2'} optional>
                  <input type="number" step="0.001" min="0" placeholder="0.000"
                    {...register('d2')}
                    className={inputBase}
                  />
                </FormField>
                {needD3 && (
                  <FormField label="Espesor (mm)" optional>
                    <input type="number" step="0.001" min="0" placeholder="0.000"
                      {...register('d3')}
                      className={inputBase}
                    />
                  </FormField>
                )}
              </div>
              {weight !== null && weight > 0 && (
                <div className="mt-2 flex items-center gap-2 rounded border border-[#E8E8E8] bg-[#f7f8fa] px-3 py-2">
                  <Weight size={13} className="text-[#888888]" />
                  <span className="text-[13px] text-[#555555]">Peso calculado</span>
                  <span className="ml-auto font-mono text-[14px] font-semibold text-[#1A1A1A]">{weight.toFixed(6)} kg</span>
                </div>
              )}
            </FormSection>

            {/* Denominación */}
            <FormSection title="Denominación">
              <FormField label="Complemento de operación" optional helper="Ej: galvanizado, pintado, tratado...">
                <input {...register('complement')} className={inputBase} placeholder="Ej: galvanizado, pintado..." />
              </FormField>
              <FormField label="Función / propósito" required
                error={errors.func ? 'Campo requerido' : undefined}
                helper="Ej: Soporte lateral, Tapa frontal, Refuerzo de base...">
                <input {...register('func', { required: true, maxLength: 65 })}
                  placeholder="Ej: Soporte lateral, Tapa frontal..."
                  maxLength={65}
                  className={cn(inputBase, errors.func && inputError)}
                />
              </FormField>
            </FormSection>

            {/* Nombre preview */}
            {previewName && (
              <div className="rounded border border-[#2C6B2F]/30 bg-[#2C6B2F]/5 px-4 py-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#2C6B2F]">Nombre completo generado</span>
                  <span className="text-[11px] text-[#888888]">{previewName.length}/145</span>
                </div>
                <p className="font-mono text-[13px] leading-relaxed text-[#1A1A1A]">{previewName}</p>
              </div>
            )}

            {m.isError && <ErrorBanner />}

            <FormActions pending={m.isPending} isEdit={false} label="Crear ítem" onClose={onClose} />
      </form>
    </FormDialog>
  )
}
