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
// Mirrors ItemWeightCalculator.calculate() server-side (api-pyramprod), which itself
// replicates the legacy Python pesar() formula (ficha_item.pyw: p_esp*dim1*dim2*dim3).
// materialDevelopment ("Desarrollo mat.") is a separate tracked/display field — it is
// NEVER part of the weight formula on the backend, so it must never be sent as dim2/dim3.
function calcWeight(unit: WeightMethod, sw: number, nd: number, dim2: number, dim3: number): number | null {
  const protoPeso = unit === 'Mm3.' ? sw : sw * nd
  switch (unit) {
    case 'Mm.':
    case 'Mm2.':
    case 'Mm3.':
      return (protoPeso * dim2 * dim3) / 1_000_000_000
    case 'Kg./Und':
      return protoPeso * dim2 * dim3
    case 'Und/Kg.': {
      const divisor = dim2 * dim3
      return divisor === 0 ? null : protoPeso / divisor
    }
  }
}

// ─── Per-method field mapping ──────────────────────────────────────────────────
// The form always collects up to 3 raw values (d1/d2/d3), but which ones are real
// weight-relevant dimensions (dim2/dim3, required by the backend) vs. the separate
// materialDevelopment field depends on the method. Mm./Kg./Und./Und-Kg. only have ONE
// real per-item dimension in this model, so dim3 is fixed at 1 (the multiplicative
// identity) rather than left null — leaving it null is what silently zeroes an item's
// weight on the next class edit or cascade recalculation (ItemWeightCalculator requires
// both dim2 and dim3 non-null).
function mapDims(unit: WeightMethod | null, d1: number, d2: number, d3: number) {
  switch (unit) {
    // Mm.: the Class's Constante is already a cross-section AREA (from the section
    // calculator, whatever the shape — round, flat bar, angle, channel...). The only
    // thing that varies per item is Largo, so the same value both drives the weight
    // formula (dim2) and is tracked/displayed as "Desarrollo mat." — Ancho has no
    // physical meaning here and is not asked for.
    case 'Mm.':     return { materialDevelopment: d1 || null, dim2: d1 || null, dim3: 1 }
    case 'Mm2.':    return { materialDevelopment: null,        dim2: d1 || null, dim3: d2 || null }
    case 'Mm3.':    return { materialDevelopment: d1 || null, dim2: d2 || null, dim3: d3 || null }
    case 'Kg./Und': return { materialDevelopment: null,        dim2: d1 || null, dim3: 1 }
    case 'Und/Kg.': return { materialDevelopment: null,        dim2: d1 || null, dim3: 1 }
    default:        return { materialDevelopment: d1 || null, dim2: d2 || null, dim3: d3 || null }
  }
}

// ─── Name auto-composer ───────────────────────────────────────────────────────
function composeName(matName: string, d1: number, d2: number, d3: number, unit: WeightMethod | null, opName: string, complement: string, fn: string): string {
  const dim = !unit ? '' : unit === 'Mm3.' ? `${d1}x${d2}x${d3}` : unit === 'Mm2.' ? `${d1}x${d2}` : `${d1}`
  return [matName, dim, opName, complement ? `[${complement}]` : '', fn].filter(Boolean).join(' ').slice(0, 145)
}

interface FormValues { d1: string; d2: string; d3: string; func: string; complement: string; weightInput: string }

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

// Segments that work with raw materials — from Python: digi_und = [4,5,7,8,9] (no material)
const SEGMENTS_WITHOUT_MATERIAL = new Set(['4', '5', '7', '8', '9'])

// ─── Main modal ───────────────────────────────────────────────────────────────
export function NewItemForm({ open, itemType, onSave, onClose }: {
  open: boolean; itemType: ItemClass; onSave: (item: ItemDetail) => void; onClose: () => void
}) {
  const qc = useQueryClient()
  const { register, handleSubmit, control, formState: { errors } } = useForm<FormValues>({
    defaultValues: { d1: '', d2: '', d3: '', func: '', complement: '', weightInput: '' },
  })
  const watched = useWatch({ control })
  const [matName, setMatName] = useState(itemType.materialName ?? '')
  const [matCode, setMatCode] = useState(itemType.material ?? '')

  const requiresMaterial = !SEGMENTS_WITHOUT_MATERIAL.has(itemType.segmentCode)

  const d1 = parseFloat(watched.d1 || '0') || 0
  const d2 = parseFloat(watched.d2 || '0') || 0
  const d3 = parseFloat(watched.d3 || '0') || 0
  const unit = itemType.weightMethod

  const mapped = mapDims(unit, d1, d2, d3)

  const weight = useMemo(() => {
    if (itemType.manualWeight) {
      const w = parseFloat(watched.weightInput || '')
      return isNaN(w) ? null : w
    }
    if (!unit || !itemType.specificWeight) return null
    if (unit !== 'Mm3.' && !itemType.nominalDimension) return null
    if (mapped.dim2 == null || mapped.dim3 == null) return null
    return calcWeight(unit, itemType.specificWeight, itemType.nominalDimension ?? 0, mapped.dim2, mapped.dim3)
  }, [unit, itemType, mapped.dim2, mapped.dim3, watched.weightInput])

  const previewName = useMemo(() =>
    composeName(matName, d1, d2, d3, unit, itemType.operatorName ?? '', watched.complement ?? '', watched.func ?? ''),
    [matName, d1, d2, d3, unit, itemType, watched.complement, watched.func],
  )

  const m = useMutation({
    mutationFn: (p: object) => apiClient.post<ItemDetail>('/items', p).then(r => r.data),
    onSuccess: item => { qc.invalidateQueries({ queryKey: ['items', itemType.id] }); onSave(item) },
  })

  // Mm. only has one real per-item dimension (Largo) — the class already fixes the
  // cross-section area, so there's no second field to ask for. Kg./Und and Und/Kg. are
  // likewise single-value. Only Mm2. (2 free dims) and Mm3. (3) need more than one field.
  const needD2 = unit === 'Mm2.' || unit === 'Mm3.'
  const needD3 = unit === 'Mm3.'
  const d1Label: Record<WeightMethod, string> = {
    'Mm.': 'Largo (mm)', 'Mm2.': 'Ancho (mm)', 'Mm3.': 'Largo (mm)',
    'Kg./Und': 'Peso/pieza (kg)', 'Und/Kg.': 'Piezas/kg',
  }
  const d2Label = unit === 'Mm2.' ? 'Largo (mm)' : unit === 'Mm3.' ? 'Alto (mm)' : 'Dim 2'

  const onSubmit = (v: FormValues) => {
    if (requiresMaterial && !matCode) return
    m.mutate({
      typeId:              itemType.id,
      // fullName is composed server-side — not sent from client
      functionName:        v.func || null,
      material:            requiresMaterial ? (matCode || null) : null,
      materialDevelopment: mapped.materialDevelopment,
      unitConsumption:     unit ?? 'Und',
      unitPurchase:        'Und',
      dim2:                mapped.dim2,
      dim3:                mapped.dim3,
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

            {/* Material — only for segments 0,1,2,3,6 */}
            {requiresMaterial && (
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
            )}

            {/* Dimensiones — always shown; labels adapt to weightMethod when set */}
            <FormSection title="Dimensiones">
              {unit && (
                <div className="mb-3 flex items-center gap-2 rounded border border-[#E8E8E8] bg-[#f7f8fa] px-3 py-2">
                  <Weight size={13} className="text-[#888888]" />
                  <span className="text-[13px] text-[#555555]">Método: <strong>{unit}</strong></span>
                </div>
              )}
              <div className={cn('grid gap-4', needD3 ? 'grid-cols-3' : needD2 ? 'grid-cols-2' : 'grid-cols-1')}>
                <FormField label={unit ? d1Label[unit] : 'Desarrollo / dim1'} optional>
                  <input type="number" step="0.001" min="0" placeholder="0.000"
                    {...register('d1')}
                    className={inputBase}
                  />
                </FormField>
                {needD2 && (
                <FormField label={d2Label} optional>
                  <input type="number" step="0.001" min="0" placeholder="0.000"
                    {...register('d2')}
                    className={inputBase}
                  />
                </FormField>
                )}
                {needD3 && (
                  <FormField label="Espesor (mm)" optional>
                    <input type="number" step="0.001" min="0" placeholder="0.000"
                      {...register('d3')}
                      className={inputBase}
                    />
                  </FormField>
                )}
              </div>
              {itemType.manualWeight ? (
                <FormField label="Peso (kg)" optional helper="Se carga a mano — esta clase no calcula el peso con ninguna fórmula" className="mt-2">
                  <input type="number" step="0.000001" min="0" placeholder="0.000000"
                    {...register('weightInput')}
                    className={inputBase}
                  />
                </FormField>
              ) : (
                weight !== null && weight > 0 && (
                  <div className="mt-2 flex items-center gap-2 rounded border border-[#E8E8E8] bg-[#f7f8fa] px-3 py-2">
                    <Weight size={13} className="text-[#888888]" />
                    <span className="text-[13px] text-[#555555]">Peso calculado</span>
                    <span className="ml-auto font-mono text-[14px] font-semibold text-[#1A1A1A]">{weight.toFixed(6)} kg</span>
                  </div>
                )
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
