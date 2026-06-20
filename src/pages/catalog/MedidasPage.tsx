import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Plus, Pencil, Trash2, Ruler, AlertTriangle, Check, X } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { FormDialog } from '@/components/ui/form-dialog'
import { FormField, FormActions, ErrorBanner } from '@/components/ui/form-field'
import { inputBase, inputError } from '@/components/ui/form-tokens'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Measure { id: number; name: string }

// ─── Measure form (create / edit) ─────────────────────────────────────────────

function MeasureForm({ item, onSave, onClose }: {
  item: Measure | null; onSave: () => void; onClose: () => void
}) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { name: item?.name ?? '' },
  })
  const m = useMutation({
    mutationFn: (d: { name: string }) =>
      item
        ? apiClient.put(`/measures/${item.id}`, d)
        : apiClient.post('/measures', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['measures'] }); onSave() },
  })
  return (
    <form onSubmit={handleSubmit(d => m.mutate(d))} className="flex flex-col gap-7">
      <FormField label="Nombre" required error={!!errors.name && 'Campo requerido'}>
        <input
          {...register('name', { required: true })}
          maxLength={25}
          className={cn(inputBase, errors.name && inputError)}
          placeholder="Ej: Kilogramo"
          autoFocus
        />
      </FormField>
      {m.isError && <ErrorBanner message="No se pudo guardar la unidad de medida." />}
      <FormActions pending={m.isPending} isEdit={!!item} label="Crear unidad" onClose={onClose} />
    </form>
  )
}

// ─── Inline delete confirm row ────────────────────────────────────────────────

function DeleteConfirmRow({ measure, onConfirm, onCancel, pending }: {
  measure: Measure; onConfirm: () => void; onCancel: () => void; pending: boolean
}) {
  return (
    <tr className="border-b border-red-100 bg-red-50/60">
      <td colSpan={3} className="px-6 py-3">
        <div className="flex items-center gap-3">
          <AlertTriangle size={14} className="shrink-0 text-red-500" />
          <span className="text-[13px] text-red-700">
            ¿Eliminar <strong>{measure.name}</strong>?
          </span>
          <div className="ml-auto flex gap-2">
            <button onClick={onCancel} className="text-[13px] text-[#667085] hover:text-[#344054]">
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={pending}
              className="rounded-lg bg-red-600 px-3 py-1 text-[13px] font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {pending ? '...' : 'Eliminar'}
            </button>
          </div>
        </div>
      </td>
    </tr>
  )
}

// ─── Inline edit row ──────────────────────────────────────────────────────────

function EditRow({ measure, onSave, onCancel }: {
  measure: Measure; onSave: (name: string) => void; onCancel: () => void
}) {
  const [name, setName] = useState(measure.name)
  return (
    <tr className="border-b border-[#E4E7EC] bg-[#F9FAFB]">
      <td className="px-6 py-3 text-[13px] text-[#98A2B3]">{measure.id}</td>
      <td className="px-4 py-2">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={25}
          autoFocus
          className="w-full rounded-lg border border-[#2C6B2F] px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#2C6B2F]/20"
          onKeyDown={e => { if (e.key === 'Enter') onSave(name); if (e.key === 'Escape') onCancel() }}
        />
      </td>
      <td className="px-4 py-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onSave(name)}
            disabled={!name.trim()}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2C6B2F] text-white hover:bg-[#245A27] disabled:opacity-40"
          >
            <Check size={13} strokeWidth={2.5} />
          </button>
          <button
            onClick={onCancel}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#E4E7EC] text-[#98A2B3] hover:text-[#344054]"
          >
            <X size={13} strokeWidth={2} />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function MedidasPage() {
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const { data: measures = [], isLoading } = useQuery<Measure[]>({
    queryKey: ['measures'],
    queryFn: () => apiClient.get<Measure[]>('/measures').then(r => r.data),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['measures'] })

  const updateMut = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      apiClient.put(`/measures/${id}`, { name }),
    onSuccess: () => { setEditingId(null); invalidate() },
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/measures/${id}`),
    onSuccess: () => { setDeletingId(null); invalidate() },
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
        <button
          onClick={() => setDialogOpen(true)}
          className="ml-auto flex items-center gap-1.5 rounded-lg bg-[#2C6B2F] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#245A27]"
        >
          <Plus size={15} strokeWidth={2.5} />
          Nueva unidad
        </button>
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
                    <th className="w-24 px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {measures.map(m => {
                    if (deletingId === m.id) {
                      return (
                        <DeleteConfirmRow
                          key={m.id}
                          measure={m}
                          onConfirm={() => deleteMut.mutate(m.id)}
                          onCancel={() => setDeletingId(null)}
                          pending={deleteMut.isPending}
                        />
                      )
                    }
                    if (editingId === m.id) {
                      return (
                        <EditRow
                          key={m.id}
                          measure={m}
                          onSave={name => updateMut.mutate({ id: m.id, name })}
                          onCancel={() => setEditingId(null)}
                        />
                      )
                    }
                    return (
                      <tr key={m.id} className="border-b border-[#F2F4F7] hover:bg-[#F9FAFB]">
                        <td className="px-6 py-3.5 text-[13px] text-[#98A2B3]">{m.id}</td>
                        <td className="px-4 py-3.5 font-medium text-[#101828]">{m.name}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => setEditingId(m.id)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-[#98A2B3] hover:bg-[#F2F4F7] hover:text-[#344054]"
                            >
                              <Pencil size={13} strokeWidth={2} />
                            </button>
                            <button
                              onClick={() => setDeletingId(m.id)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-[#98A2B3] hover:bg-red-50 hover:text-red-500"
                            >
                              <Trash2 size={13} strokeWidth={2} />
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

      <FormDialog
        open={dialogOpen}
        title="Nueva unidad de medida"
        onClose={() => setDialogOpen(false)}
        width="w-[420px]"
      >
        <MeasureForm
          item={null}
          onSave={() => setDialogOpen(false)}
          onClose={() => setDialogOpen(false)}
        />
      </FormDialog>
    </div>
  )
}
