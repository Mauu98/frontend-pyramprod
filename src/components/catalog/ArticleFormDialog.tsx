import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { translateApiError } from '@/lib/api-error'
import { cn } from '@/lib/utils'
import { computeUnitFactor, roundFactor, type UnitEquivalency } from '@/lib/item-unit-factor'
import { useMeasures, useUnitEquivalencies } from '@/hooks/useUnitData'
import type { ItemClass, ItemDetail, WeightMethod } from '@/types/api.types'
import { FormDialog } from '@/components/ui/form-dialog'
import { FormField, FormSection, ErrorBanner } from '@/components/ui/form-field'
import { inputBase } from '@/components/ui/form-tokens'

// Legacy carga_um: only segments 1 and 6 offer every measure; the rest are fixed to "Und".
const FREE_UNIT_SEGMENTS: ReadonlySet<string> = new Set(['1', '6'])
// Legacy vernombre(): these segments put the family name at the end of the final description.
const FAMILY_LAST_SEGMENTS: ReadonlySet<string> = new Set(['3', '5', '8'])
const DEFAULT_UNIT = 'Und'

const BOX_LABELS: Record<WeightMethod, string[]> = {
  'Mm.': ['Largo'],
  'Mm2.': ['Largo', 'Ancho'],
  // Legacy codificacion_c_02 habilidimm(): Mm3. enables 2 boxes (dim_e2, dim_e3), both labelled "Dim. Especif."
  'Mm3.': ['Dim. Específica 1', 'Dim. Específica 2'],
  'Kg./Und': ['[Kg./Item]'],
  'Und/Kg.': ['[Items/Kg.]'],
}

const DIM_HELP: Record<WeightMethod, string> = {
  'Mm.': 'La clase consume por LARGO: la sección es fija en la clase, acá se carga 1 de 3 dimensiones.',
  'Mm2.': 'La clase consume por SUPERFICIE: el espesor es fijo en la clase, acá se cargan 2 de 3 dimensiones.',
  'Mm3.': 'La clase consume por PORCIÓN VOLUMÉTRICA: se cargan 2 dimensiones específicas y su producto se expresa en Mm3.',
  'Kg./Und': 'La clase se define por peso por ítem: se carga el peso de 1 ítem en Kg.',
  'Und/Kg.': 'La clase se define por ítems por Kg.: se carga cuántos ítems entran en 1 Kg.',
}

const fmt = (n: number, maxDecimals: number) =>
  n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: maxDecimals })

const num = (s: string) => {
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

const str = (n: number | null | undefined) => (n != null ? String(n) : '')

/**
 * The class panel shows the legacy "Dimensión Específica" (the dimension FIXED in the class), which is
 * the mirror of the stored weightMethod (the article's unit): Mm. <-> Mm2., Mm3. unchanged.
 */
const CLASS_DIM: Partial<Record<WeightMethod, string>> = { 'Mm.': 'Mm2.', 'Mm2.': 'Mm.', 'Mm3.': 'Mm3.' }

function classDimSuffix(cls: ItemClass): string {
  if (cls.manualWeight || !cls.weightMethod) return ''
  return ` · Dimensión específica: ${CLASS_DIM[cls.weightMethod] ?? cls.weightMethod}`
}

/** Number of dimension boxes that feed dim2..dim4 for a weight method. */
function boxCount(method: WeightMethod | null): number {
  if (method === 'Mm3.') return 2
  if (method === 'Mm2.') return 2
  return method ? 1 : 0
}

/** Unit of the product of the active boxes — only for the geometric methods. */
function dimUnitOf(method: WeightMethod | null): string | null {
  return method === 'Mm.' || method === 'Mm2.' || method === 'Mm3.' ? method : null
}

/** Backend stores weight at 6 decimals HALF_UP; mirror it so factors match what gets persisted. */
function round6(n: number): number {
  return Math.round((n + Number.EPSILON) * 1e6) / 1e6
}

/** Product of the active dimension boxes; null when there is no geometric dimension unit. */
function dimProductOf(dimUnit: string | null, d: number[]): number | null {
  return dimUnit ? d.reduce((a, b) => a * b, 1) : null
}

/** Live weight (Kg.); the backend recomputes and is authoritative. */
function calcWeight(cls: ItemClass, method: WeightMethod, d: number[]): number | null {
  const sw = cls.specificWeight ?? 0
  const nd = cls.nominalDimension ?? 0
  const product = d.reduce((a, b) => a * b, 1)
  switch (method) {
    case 'Mm.':
    case 'Mm2.':
      return sw && nd ? (sw * nd * product) / 1e9 : null
    case 'Mm3.':
      return sw ? (sw * product) / 1e9 : null
    // Mirrors ItemWeightCalculator: KG_PER_UNIT = sw * nd * dim2 * dim3 (dim3 = 1); UNITS_PER_KG = sw * nd / (dim2 * dim3).
    case 'Kg./Und':
      return cls.specificWeight != null && cls.nominalDimension != null ? sw * nd * (d[0] ?? 0) : null
    case 'Und/Kg.':
      return cls.specificWeight != null && cls.nominalDimension != null && d[0] ? (sw * nd) / d[0] : null
  }
}

function weightFormula(cls: ItemClass, method: WeightMethod): string {
  const sw = cls.specificWeight != null ? ` × Peso específico ${fmt(cls.specificWeight, 3)}` : ''
  switch (method) {
    case 'Mm.': return `Sección × Largo${sw}`
    case 'Mm2.': return `Espesor × Largo × Ancho${sw}`
    case 'Mm3.': return `Dim. 1 × Dim. 2${sw}`
    case 'Kg./Und': return 'Peso cargado por ítem'
    case 'Und/Kg.': return `Peso específico × Dimensión nominal ÷ Ítems por Kg.`
  }
}

export interface ArticleFormDialogProps {
  open: boolean
  /** Class the article belongs to (carries weight method, specific weight, segment code). */
  itemClass: ItemClass
  /** Existing article when editing; omit to create. */
  item?: ItemDetail
  /** Source article for "Duplicar": prefills a NEW article (item stays undefined, so it saves via POST). */
  template?: ItemDetail
  segmentLabel: string
  familyLabel: string
  /** Family name, used only for the final-description preview. */
  familyName?: string | null
  onSaved: () => void
  onClose: () => void
}

/**
 * Create/edit form for catalog level-4 articles of classes outside segment 4. The body is a
 * separate component so its state resets every time the dialog is reopened.
 */
export function ArticleFormDialog(props: ArticleFormDialogProps) {
  const { open, item, onClose } = props
  return (
    <FormDialog
      open={open}
      title={item ? 'Modificar Artículo' : props.template ? `Nuevo Artículo (copia de ${props.template.fullCode})` : 'Nuevo Artículo'}
      subtitle={`Segmento: ${props.segmentLabel}\nFamilia: ${props.familyLabel}\nClase: ${props.itemClass.code} — ${props.itemClass.name}${classDimSuffix(props.itemClass)}`}
      width="w-[760px]"
      onClose={onClose}
    >
      <ArticleFormBody {...props} />
    </FormDialog>
  )
}

function ArticleFormBody({ itemClass, item, template, familyName, onSaved, onClose }: ArticleFormDialogProps) {
  const qc = useQueryClient()
  const isEdit = !!item
  // Fields are seeded from the edited article or, when duplicating, from the source article.
  const src = item ?? template
  const method = itemClass.weightMethod
  const manualWeight = !!itemClass.manualWeight
  const freeUnits = FREE_UNIT_SEGMENTS.has(itemClass.segmentCode)
  const boxes = manualWeight ? 0 : boxCount(method)
  const dimUnit = manualWeight ? null : dimUnitOf(method)

  const [name, setName] = useState(src?.functionName ?? '')
  const [abbr, setAbbr] = useState(src?.abbreviation ?? '')
  const [dims, setDims] = useState<string[]>(() =>
    [str(src?.dim2), str(src?.dim3), str(src?.dim4)].slice(0, boxes))
  const [manualWeightText, setManualWeightText] = useState(str(src?.weight))
  const [prov, setProv] = useState(src?.unitPurchase ?? (freeUnits ? '' : DEFAULT_UNIT))
  const [cons, setCons] = useState(src?.unitConsumption ?? (freeUnits ? '' : DEFAULT_UNIT))
  // A manual factor sticks only for the unit pair it was typed for. `undefined` = the user has not
  // touched it yet, so the override (if any) is derived from the stored item once equivalencies load.
  const [touchedManual, setManual] = useState<{ pair: string; value: string } | null | undefined>(undefined)
  const [showWeight, setShowWeight] = useState(src?.showWeightInName ?? true)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const { data: measures = [] } = useMeasures()
  const { data: equivalencies = [], isSuccess: equivalenciesLoaded } = useUnitEquivalencies()

  const unitOptions = useMemo(() => {
    const base = freeUnits ? measures.map(m => m.name) : [DEFAULT_UNIT]
    // Never drop a stored unit the legacy rule would hide — it would silently change on save.
    const extra = [src?.unitPurchase, src?.unitConsumption].filter((u): u is string => !!u)
    return [...new Set([...base, ...extra])]
  }, [freeUnits, measures, src?.unitPurchase, src?.unitConsumption])

  const dimNums = dims.map(num)
  let weight: number | null = null
  if (manualWeight) {
    const w = parseFloat(manualWeightText)
    weight = Number.isFinite(w) ? round6(w) : null
  } else if (method) {
    const w = calcWeight(itemClass, method, dimNums)
    weight = w != null && Number.isFinite(w) ? round6(w) : null
  }

  const dimProduct = boxes > 0 ? dimProductOf(dimUnit, dimNums) : null

  // Edit/duplicate: the stored factor is a manual override only if the engine would not have produced it
  // for the stored units/dims/weight; otherwise the factor keeps recomputing live when dims change.
  const seededManual = (() => {
    if (!src || !src.unitPurchase || !src.unitConsumption || !equivalenciesLoaded) return null
    const storedDims = [src.dim2, src.dim3, src.dim4].slice(0, boxes).map(v => v ?? 0)
    const storedComputed = computeUnitFactor(src.unitPurchase, src.unitConsumption, {
      equivalencies: equivalencies as UnitEquivalency[],
      dimUnit,
      dimProduct: boxes > 0 ? dimProductOf(dimUnit, storedDims) : null,
      weight: src.weight != null ? round6(src.weight) : null,
    })
    const isOverride = storedComputed == null || roundFactor(src.unitConversionFactor) !== roundFactor(storedComputed)
    return isOverride
      ? { pair: `${src.unitPurchase}|${src.unitConsumption}`, value: str(src.unitConversionFactor) }
      : null
  })()
  const manual = touchedManual !== undefined ? touchedManual : seededManual

  const computed = prov && cons
    ? computeUnitFactor(prov, cons, { equivalencies: equivalencies as UnitEquivalency[], dimUnit, dimProduct, weight })
    : null

  const pair = `${prov}|${cons}`
  const isManual = manual?.pair === pair
  const factorText = isManual ? manual.value : computed != null ? String(computed) : ''
  const factorNum = parseFloat(factorText)
  const unitsMissing = !prov || !cons
  const factorLocked = !freeUnits && prov === DEFAULT_UNIT && cons === DEFAULT_UNIT

  const badge = unitsMissing
    ? { text: 'Elegí ambas unidades', cls: 'bg-[#F2F4F7] text-[#667085]' }
    : !(factorNum > 0)
      ? { text: 'Sin equivalencia: completala', cls: 'bg-[#FEF0C7] text-[#93370D]' }
      : isManual
        ? { text: 'Definida para este artículo', cls: 'bg-[#FEF0C7] text-[#93370D]' }
        : { text: 'Calculada', cls: 'bg-[#2C6B2F]/10 text-[#2C6B2F]' }

  const canSubmit = name.trim() !== '' && (isEdit || abbr.trim() !== '') && !unitsMissing && factorNum > 0

  // Mirrors backend ItemNameComposer.composeStandard (legacy vernombre): family name first,
  // except segments 3, 5 and 8 where it goes last; weight badge at 2 decimals like the server.
  // Rounding goes through toPrecision so 1.005 rounds up like Java's decimal HALF_UP.
  const weightBadge = showWeight && weight != null && weight > 0
    ? `[${Math.round(Number((weight * 100).toPrecision(12))) / 100} Kg.]`
    : ''
  const previewName = (FAMILY_LAST_SEGMENTS.has(itemClass.segmentCode)
    ? [itemClass.name, name, weightBadge, familyName]
    : [familyName, itemClass.name, name, weightBadge]
  ).map(part => part?.trim() ?? '').filter(Boolean).join(' ').slice(0, 145)

  const save = useMutation({
    mutationFn: (payload: Record<string, unknown>) => item
      ? apiClient.put<ItemDetail>(`/items/${item.id}`, payload).then(r => r.data)
      : apiClient.post<ItemDetail>('/items', payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items', itemClass.id] })
      if (item) qc.invalidateQueries({ queryKey: ['item-detail', item.id] })
      setConfirmOpen(false)
      onSaved()
      onClose()
    },
    onError: () => setConfirmOpen(false),
  })

  const submit = () => {
    const [d1 = 0, d2 = 0, d3 = 0] = dimNums
    // Mm./Kg.-Und/Und-Kg. have a single real dimension: dim3 is fixed to 1 (multiplicative identity)
    // so the weight calculator never sees a null.
    const mapped = boxes === 0
      ? { dim2: src?.dim2 ?? null, dim3: src?.dim3 ?? null, dim4: src?.dim4 ?? null }
      : boxes === 1
        ? { dim2: d1 || null, dim3: 1, dim4: null }
        : boxes === 2
          ? { dim2: d1 || null, dim3: d2 || null, dim4: null }
          : { dim2: d1 || null, dim3: d2 || null, dim4: d3 || null }
    const payload: Record<string, unknown> = {
      typeId: itemClass.id,
      functionName: name.trim(),
      abbreviation: abbr.trim() || null,
      ...mapped,
      weight: src && !manualWeight && !method ? src.weight : weight,
      unitPurchase: prov,
      unitConsumption: cons,
      unitConversionFactor: roundFactor(factorNum),
      showWeightInName: showWeight,
      // Mm./Mm3. keep tracking the first box as "Desarrollo mat." (display field, not part of the weight).
      materialDevelopment: method === 'Mm.' || method === 'Mm3.' ? d1 || null : (item ? item.materialDevelopment : null),
    }
    if (item) {
      // The update is a full REPLACE on the backend: send back everything this form doesn't edit.
      Object.assign(payload, {
        segmentCode: item.segmentCode,
        description: item.description,
        material: item.material,
        operationComplement: item.operationComplement,
        stockMin: item.stockMin,
        stockMax: item.stockMax,
        warehouseZone: item.warehouseZone,
        warehouseRack: item.warehouseRack,
        warehouseSlot: item.warehouseSlot,
        salePrice: item.salePrice,
        costPrice: item.costPrice,
        currency: item.currency,
        daysLeadTime: item.daysLeadTime,
        productionMemo: item.productionMemo,
        observations: item.observations,
        sortOrder: item.sortOrder,
        unitIssueItem: item.unitIssueItem,
        piecesFraction: item.piecesFraction,
        invoiceSaleMargin: item.invoiceSaleMargin,
        invoiceStockMargin: item.invoiceStockMargin,
        salePriceDate: item.salePriceDate,
        costPriceDate: item.costPriceDate,
        exchangeRate: item.exchangeRate,
      })
    } else {
      payload.material = itemClass.material
    }
    save.mutate(payload)
  }

  const setDim = (i: number, v: string) => setDims(d => d.map((x, j) => (j === i ? v : x)))
  const fixedLabel = itemClass.nominalDimension != null && method && method !== 'Mm3.' && dimUnit
    ? `${method === 'Mm.' ? 'Sección' : 'Espesor'} constante: ${fmt(itemClass.nominalDimension, 5)} ${method === 'Mm.' ? 'Mm2.' : 'Mm.'}`
    : null
  const legacyAreaWithoutWidth = isEdit && method === 'Mm2.' && item?.dim3 === 1 && dims[1] === '1'
  const showFixed = !!fixedLabel && !manualWeight
  // Classes created before the weight-config validation (or via text import) may lack the inputs the
  // weight formula needs; the article form can't fix that, so it points the user to the class.
  // Geometric methods treat 0 as missing (calcWeight uses `sw && nd`); Kg./Und and Und/Kg. only reject null.
  const geometric = method === 'Mm.' || method === 'Mm2.' || method === 'Mm3.'
  const lacks = (v: number | null | undefined) => (geometric ? !v : v == null)
  const missingClassInputs = [
    lacks(itemClass.specificWeight) && 'el peso específico',
    method !== 'Mm3.' && lacks(itemClass.nominalDimension) && 'la dimensión nominal',
  ].filter(Boolean).join(' y ')
  const missingClassWeight = manualWeight ? null
    : !method ? 'no tiene definido el cálculo de peso'
    : missingClassInputs ? `no tiene cargado ${missingClassInputs}`
    : null

  return (
    <div className="flex flex-col gap-6">
      <FormSection title="Identificación" first>
        <div className="grid grid-cols-[140px_1fr_200px] gap-4">
          <FormField label="Código">
            <input readOnly value={item?.fullCode ?? ''} placeholder="Automático" title="Se asigna al crear"
              className={cn(inputBase, 'bg-[#f7f8fa] font-mono text-[14px] font-bold text-[#475467] placeholder:font-sans placeholder:font-normal')} />
          </FormField>
          <FormField label="Nombre" required helper="Máx. 65 caracteres">
            <input value={name} maxLength={65} onChange={e => setName(e.target.value)} className={inputBase} />
          </FormField>
          <FormField label="Abreviatura" required={!isEdit} helper="Máx. 25 caracteres">
            <input value={abbr} maxLength={25} onChange={e => setAbbr(e.target.value)} className={inputBase} />
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Dimensiones específicas">
        {missingClassWeight && (
          <p role="alert" className="rounded-lg border border-[#FEC84B] bg-[#FFFAEB] px-3 py-2 text-[13px] text-[#93370D]">
            La clase {itemClass.code} — {itemClass.name} {missingClassWeight}, así que el peso del artículo no se puede calcular.
            Completalo desde Clases (Modificar clase → Peso Calculado) y volvé a crear el artículo.
          </p>
        )}
        {manualWeight ? (
          <FormField label="Peso (Kg.)" helper="Esta clase carga el peso a mano — no usa ninguna fórmula">
            <input type="number" step="any" min="0" value={manualWeightText} placeholder="0.000000"
              onChange={e => setManualWeightText(e.target.value)} className={inputBase} />
          </FormField>
        ) : (
          <>
            {method && <p className="text-[13px] text-[#667085]">{DIM_HELP[method]}</p>}
            <div className="flex flex-wrap items-end gap-4">
              {method && BOX_LABELS[method].slice(0, boxes).map((label, i) => (
                <FormField key={label} label={label} className="w-[190px]">
                  <div className="flex items-center gap-2">
                    <input type="number" step="any" min="0" value={dims[i] ?? ''} placeholder="0"
                      onChange={e => setDim(i, e.target.value)} className={inputBase} />
                    {dimUnit && <span className="shrink-0 text-[14px] font-semibold text-[#475467]">Mm.</span>}
                  </div>
                </FormField>
              ))}
              {showFixed && (
                <FormField label="Fija en la clase" className="w-[220px]">
                  <div className="flex h-12 items-center rounded-lg border border-dashed border-[#D0D5DD] bg-[#f7f8fa] px-4 text-[13px] text-[#667085]">
                    {fixedLabel}
                  </div>
                </FormField>
              )}
            </div>
            {legacyAreaWithoutWidth && (
              <p role="alert" className="rounded-lg border border-[#FEC84B] bg-[#FFFAEB] px-3 py-2 text-[13px] text-[#93370D]">
                Este artículo se guardó sin Ancho real (Ancho = 1). Verificá las dimensiones antes de guardar.
              </p>
            )}
          </>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[10px] border border-[#2C6B2F]/30 bg-[#2C6B2F]/5 px-4 py-3">
            <div className="text-[12px] text-[#475467]">Peso calculado</div>
            <div className="mt-0.5 text-[20px] font-bold text-[#1a3d1c]">{weight != null ? fmt(weight, 6) : '—'} Kg.</div>
            {method && !manualWeight && <div className="mt-0.5 text-[12px] text-[#667085]">{weightFormula(itemClass, method)}</div>}
          </div>
          {dimUnit && (
            <div className="rounded-[10px] border border-[#E4E7EC] bg-[#f7f8fa] px-4 py-3">
              <div className="text-[12px] text-[#475467]">1 Item equivale a</div>
              <div className="mt-0.5 text-[20px] font-bold text-[#101828]">{fmt(dimProduct ?? 0, 5)} {dimUnit}</div>
              <div className="mt-0.5 text-[12px] text-[#667085]">Producto de las dimensiones</div>
            </div>
          )}
        </div>
      </FormSection>

      <FormSection title="Unidades de medida">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Unidad Medida Provisión" required>
            <select value={prov} onChange={e => setProv(e.target.value)} className={inputBase}>
              <option value="">Seleccionar…</option>
              {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </FormField>
          <FormField label="Unidad Medida Consumo" required>
            <select value={cons} onChange={e => setCons(e.target.value)} className={inputBase}>
              <option value="">Seleccionar…</option>
              {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </FormField>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="whitespace-nowrap text-[15px] text-[#344054]">1 <strong>{prov || '[Provisión]'}</strong> equivale a:</span>
          <input type="number" step="any" min="0" value={factorText}
            disabled={unitsMissing || factorLocked}
            aria-label="Equivalencia entre unidades"
            onChange={e => setManual({ pair, value: e.target.value })}
            className={cn(inputBase, 'w-[200px] disabled:bg-[#f7f8fa] disabled:text-[#475467]')} />
          <strong className="text-[15px] text-[#344054]">{cons || '[Consumo]'}</strong>
          <span className={cn('rounded-full px-2.5 py-1 text-[12px] font-semibold', badge.cls)}>{badge.text}</span>
          {isManual && computed != null && !factorLocked && (
            <button type="button" onClick={() => setManual(null)}
              className="text-[13px] font-medium text-[#2C6B2F] hover:underline">
              Usar la calculada ({fmt(computed, 8)})
            </button>
          )}
        </div>
      </FormSection>

      <FormSection title="Descripción final">
        <div className="flex flex-wrap gap-7">
          <label className="flex cursor-pointer items-center gap-2.5 text-[14px] text-[#344054]">
            <input type="radio" name="show-weight" checked={showWeight} onChange={() => setShowWeight(true)} />
            Mostrar peso en descripción final
          </label>
          <label className="flex cursor-pointer items-center gap-2.5 text-[14px] text-[#344054]">
            <input type="radio" name="show-weight" checked={!showWeight} onChange={() => setShowWeight(false)} />
            No mostrar peso en descripción final
          </label>
        </div>
        <div className="rounded-[10px] border border-[#2C6B2F]/30 bg-[#2C6B2F]/5 px-4 py-2.5 text-[15px] font-semibold text-[#1a3d1c]">
          {previewName || '—'}
        </div>
      </FormSection>

      {save.isError && <ErrorBanner message={translateApiError(save.error, 'fallback.save')} />}

      <div className="sticky -bottom-8 -mx-10 -mb-8 mt-2 flex items-center gap-5 border-t border-[#F2F4F7] bg-white px-10 pb-8 pt-5">
        <button type="button" onClick={onClose}
          className="shrink-0 text-[14px] font-medium text-[#667085] transition hover:text-[#344054]">
          Cancelar
        </button>
        <div className="flex flex-1 flex-col gap-1.5">
          <button type="button" disabled={!canSubmit || save.isPending} onClick={() => setConfirmOpen(true)}
            className="flex h-12 items-center justify-center rounded-lg bg-[#2C6B2F] text-[15px] font-semibold text-white shadow-sm transition hover:bg-[#245A27] disabled:cursor-not-allowed disabled:bg-[#A9C2AA]">
            {isEdit ? 'Guardar cambios' : 'Crear artículo'}
          </button>
          {!canSubmit && (
            <span className="text-center text-[12px] text-[#667085]">
              Completá nombre, {isEdit ? '' : 'abreviatura, '}ambas unidades y una equivalencia mayor que cero para habilitar el botón.
            </span>
          )}
        </div>
      </div>

      <FormDialog open={confirmOpen} title="Confirmar dato crítico" width="w-[600px]" onClose={() => setConfirmOpen(false)}>
        <div className="flex flex-col gap-4">
          <p className="text-[14px] leading-relaxed text-[#344054]">
            Confirme con la mayor certeza decimal posible si efectivamente para este material se cumple que:
          </p>
          <p className="font-mono text-[18px] font-bold text-[#101828]">
            1 [{prov}] = {fmt(factorNum || 0, 8)} [{cons}]
          </p>
          <p className="text-[14px] leading-relaxed text-[#344054]">
            La incorrecta estipulación de este dato puede acarrear errores graves en el cálculo de requerimiento de materiales.
          </p>
          <div className="flex justify-end gap-2.5 pt-2">
            <button type="button" onClick={() => setConfirmOpen(false)}
              className="h-10 rounded-lg border border-[#D0D5DD] bg-white px-4 text-[13px] font-medium text-[#344054] hover:bg-[#F9FAFB]">
              Cancelar
            </button>
            <button type="button" onClick={() => { setConfirmOpen(false); onClose() }}
              className="h-10 rounded-lg border border-[#FDA29B] bg-white px-4 text-[13px] font-medium text-[#B42318] hover:bg-red-50">
              Descartar
            </button>
            <button type="button" disabled={save.isPending} onClick={submit}
              className="h-10 rounded-lg border border-[#2C6B2F] bg-[#2C6B2F] px-4 text-[13px] font-medium text-white hover:bg-[#245A27] disabled:opacity-50">
              {save.isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </FormDialog>
    </div>
  )
}
