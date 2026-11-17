import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Trash2, Ruler, AlertTriangle, ArrowRightLeft } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { translateApiError } from '@/lib/api-error'
import { cn } from '@/lib/utils'
import { FormDialog } from '@/components/ui/form-dialog'
import { FormField, FormActions, ErrorBanner } from '@/components/ui/form-field'
import { inputBase, inputError } from '@/components/ui/form-tokens'
import { useUnitEquivalencies } from '@/hooks/useUnitData'
import type { MeasureEquivalency } from '@/services/catalog.service'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Measure { id: number; name: string }
interface Equivalency { id: number; equivalentMeasureId: number; equivalentMeasureName: string; factor: string }

// ─── Equivalencies dialog ─────────────────────────────────────────────────────

const formatFactor = (n: number) => n.toLocaleString('es-AR', { maximumSignificantDigits: 10 })

/** Read-only row for an equivalency stored on the other unit, shown inverted (1 / factor). */
function InverseEquivalencyRow({ unit, eq }: { unit: string; eq: MeasureEquivalency }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-dashed border-[#E4E7EC] bg-[#F9FAFB] px-4 py-2.5">
      <span className="text-[14px] font-medium text-[#101828]">
        1 <span className="text-[#667085]">{unit}</span> = <span className="text-[#2C6B2F] font-semibold">{formatFactor(1 / Number(eq.factor))}</span> {eq.fromUnit}
      </span>
      <span className="ml-auto text-[12px] text-[#98A2B3]" title={`Calculada desde 1 ${eq.fromUnit} = ${formatFactor(Number(eq.factor))} ${unit}`}>
        desde {eq.fromUnit}
      </span>
    </div>
  )
}

function EquivalencyRow({ unit, eq, onDelete, deleting }: {
  unit: string; eq: Equivalency; onDelete: () => void; deleting: boolean
}) {
  const [confirming, setConfirming] = useState(false)
  if (confirming) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-red-100 bg-red-50/60 px-4 py-2.5">
        <AlertTriangle size={13} className="shrink-0 text-red-500" />
        <span className="text-[13px] text-red-700">¿Eliminar equivalencia con <strong>{eq.equivalentMeasureName}</strong>?</span>
        <div className="ml-auto flex gap-2">
          <button onClick={() => setConfirming(false)} className="text-[13px] text-[#667085] hover:text-[#344054]">
            Cancelar
          </button>
          <button
            onClick={onDelete}
            disabled={deleting}
            className="rounded-lg bg-red-600 px-3 py-1 text-[13px] font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? '...' : 'Eliminar'}
          </button>
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 rounded-lg border border-[#E4E7EC] bg-white px-4 py-2.5">
      <span className="text-[14px] font-medium text-[#101828]">
        1 <span className="text-[#667085]">{unit}</span> = <span className="text-[#2C6B2F] font-semibold">{formatFactor(Number(eq.factor))}</span> {eq.equivalentMeasureName}
      </span>
      <button
        onClick={() => setConfirming(true)}
        className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg text-[#98A2B3] hover:bg-red-50 hover:text-red-500"
      >
        <Trash2 size={13} strokeWidth={2} />
      </button>
    </div>
  )
}

function EquivalenciesDialog({ measure, onClose, allMeasures }: {
  measure: Measure; onClose: () => void; allMeasures: Measure[]
}) {
  const qc = useQueryClient()
  const key = ['equivalencies', measure.id]

  const { data: equivalencies = [], isLoading } = useQuery<Equivalency[]>({
    queryKey: key,
    queryFn: () => apiClient.get<Equivalency[]>(`/measures/${measure.id}/equivalencies`).then(r => r.data),
  })
  // Rows are stored in one direction only; show the ones stored on the other unit too.
  const { data: allEquivalencies = [], isLoading: loadingAll, isError: allFailed } = useUnitEquivalencies()
  const inverse = allEquivalencies.filter(e => e.toUnit === measure.name && Number(e.factor) > 0)
  const refresh = () => {
    qc.invalidateQueries({ queryKey: key })
    qc.invalidateQueries({ queryKey: ['measure-equivalencies'] })
  }

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { equivalentMeasureId: '', factor: '' },
  })

  const addMut = useMutation({
    mutationFn: (d: { equivalentMeasureId: string; factor: string }) =>
      apiClient.post(`/measures/${measure.id}/equivalencies`, {
        equivalentMeasureId: Number(d.equivalentMeasureId),
        factor: Number(d.factor),
      }),
    onSuccess: () => { refresh(); reset() },
  })

  const deleteMut = useMutation({
    mutationFn: (equiId: number) => apiClient.delete(`/measures/${measure.id}/equivalencies/${equiId}`),
    onSuccess: refresh,
  })

  // A pair already related in either direction can't be added again (it would duplicate the factor).
  const usedIds = new Set(equivalencies.map(e => e.equivalentMeasureId))
  const inverseNames = new Set(inverse.map(e => e.fromUnit))
  const available = allMeasures.filter(m => m.id !== measure.id && !usedIds.has(m.id) && !inverseNames.has(m.name))

  return (
    <FormDialog open title={`Equivalencias — ${measure.name}`} onClose={onClose} width="w-[520px]">
      <div className="flex flex-col gap-5">
        {/* List */}
        <div className="flex flex-col gap-2">
          {isLoading || loadingAll ? (
            <p className="py-4 text-center text-[13px] text-[#98A2B3]">Cargando...</p>
          ) : equivalencies.length === 0 && inverse.length === 0 ? (
            <p className="py-4 text-center text-[13px] text-[#98A2B3]">Sin equivalencias registradas</p>
          ) : (
            <>
              {equivalencies.map(eq => (
                <EquivalencyRow
                  key={eq.id}
                  unit={measure.name}
                  eq={eq}
                  onDelete={() => deleteMut.mutate(eq.id)}
                  deleting={deleteMut.isPending}
                />
              ))}
              {inverse.map(eq => <InverseEquivalencyRow key={`inv-${eq.id}`} unit={measure.name} eq={eq} />)}
            </>
          )}
        </div>

        {/* Without the full list we can't tell which pairs already exist in reverse, so don't allow adding. */}
        {allFailed && <ErrorBanner message="No se pudieron cargar todas las equivalencias. Cerrá y volvé a abrir para reintentar." />}

        {/* Add form */}
        {!allFailed && available.length > 0 && (
          <>
            <div className="border-t border-[#F2F4F7]" />
            <form onSubmit={handleSubmit(d => addMut.mutate(d))} className="flex flex-col gap-4">
              <p className="text-[13px] font-semibold text-[#344054]">Agregar equivalencia</p>
              <p className="text-[12px] text-[#667085]">
                1 <span className="font-medium text-[#101828]">{measure.name}</span> equivale a:
              </p>
              <div className="flex gap-3">
                <FormField label="Factor" required error={!!errors.factor && 'Requerido'} className="w-36">
                  <input
                    type="number"
                    step="any"
                    min="0.00000001"
                    {...register('factor', { required: true, min: 0.00000001 })}
                    className={cn(inputBase, errors.factor && inputError)}
                    placeholder="Ej: 1000"
                  />
                </FormField>
                <FormField label="Unidad equivalente" required error={!!errors.equivalentMeasureId && 'Requerido'} className="flex-1">
                  <select
                    {...register('equivalentMeasureId', { required: true })}
                    className={cn(inputBase, errors.equivalentMeasureId && inputError)}
                  >
                    <option value="">Seleccionar...</option>
                    {available.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </FormField>
              </div>
              {addMut.isError && <ErrorBanner message={translateApiError(addMut.error, 'fallback.addEquivalency')} />}
              <FormActions pending={addMut.isPending} isEdit={false} label="Agregar" onClose={onClose} />
            </form>
          </>
        )}
      </div>
    </FormDialog>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function MedidasPage() {
  const [equiMeasure, setEquiMeasure] = useState<Measure | null>(null)

  const { data: measures = [], isLoading } = useQuery<Measure[]>({
    queryKey: ['measures'],
    queryFn: () => apiClient.get<Measure[]>('/measures').then(r => r.data),
  })

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#f4f5f7]">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-4 border-b border-[#E4E7EC] bg-white px-6 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2C6B2F]/10">
          <Ruler size={18} className="text-[#2C6B2F]" />
        </div>
        <div>
          <h1 className="text-[16px] font-bold text-[#101828]">Unidades de Medida</h1>
          <p className="text-[13px] text-[#667085]">{measures.length} unidades registradas</p>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-[700px]">
          <div className="overflow-hidden rounded-xl border border-[#E4E7EC] bg-white">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-[14px] text-[#98A2B3]">
                Cargando...
              </div>
            ) : measures.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 text-[#98A2B3]">
                <Ruler size={28} strokeWidth={1.5} />
                <p className="text-[14px]">Sin unidades de medida</p>
              </div>
            ) : (
              <table className="w-full text-[14px]">
                <thead>
                  <tr className="border-b border-[#F2F4F7]">
                    <th className="w-20 px-6 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-[#98A2B3]">ID</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-[#98A2B3]">Nombre</th>
                    <th className="w-28 px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {measures.map(m => {
                    return (
                      <tr key={m.id} className="border-b border-[#F2F4F7] hover:bg-[#F9FAFB]">
                        <td className="px-6 py-3.5 text-[13px] text-[#98A2B3]">{m.id}</td>
                        <td className="px-4 py-3.5 font-medium text-[#101828]">{m.name}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => setEquiMeasure(m)}
                              title="Equivalencias"
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-[#98A2B3] hover:bg-[#F2F4F7] hover:text-[#2C6B2F]"
                            >
                              <ArrowRightLeft size={13} strokeWidth={2} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {equiMeasure && (
        <EquivalenciesDialog
          measure={equiMeasure}
          allMeasures={measures}
          onClose={() => setEquiMeasure(null)}
        />
      )}
    </div>
  )
}
