import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { ItemDetail } from '@/types/api.types'
import { FormDialog } from '@/components/ui/form-dialog'
import { FormActions, ErrorBanner, FormField, FormSection } from '@/components/ui/form-field'
import { inputBase, textareaBase } from '@/components/ui/form-tokens'

export function EditItemDialog({ open, item, onClose, onSaved }: {
  open: boolean; item: ItemDetail; onClose: () => void; onSaved: () => void
}) {
  const qc = useQueryClient()
  const [apiErr, setApiErr] = useState<string | null>(null)

  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      fullName:            item.fullName,
      abbreviation:        item.abbreviation ?? '',
      description:         '',
      functionName:        item.functionName ?? '',
      operationComplement: item.operationComplement ?? '',
      dim2:                item.dim2 != null ? String(item.dim2) : '',
      dim3:                item.dim3 != null ? String(item.dim3) : '',
      weight:              item.weight != null ? String(item.weight) : '',
      stockMin:            item.stockMin != null ? String(item.stockMin) : '',
      stockMax:            item.stockMax != null ? String(item.stockMax) : '',
      warehouseZone:       item.warehouseZone ?? '',
      warehouseRack:       item.warehouseRack ?? '',
      warehouseSlot:       item.warehouseSlot ?? '',
      salePrice:           item.salePrice != null ? String(item.salePrice) : '',
      costPrice:           item.costPrice != null ? String(item.costPrice) : '',
      currency:            item.currency ?? 'ARS',
      daysLeadTime:        item.daysLeadTime != null ? String(item.daysLeadTime) : '',
      productionMemo:      item.productionMemo ?? '',
      observations:        item.observations ?? '',
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        fullName:            item.fullName,
        abbreviation:        item.abbreviation ?? '',
        description:         '',
        functionName:        item.functionName ?? '',
        operationComplement: item.operationComplement ?? '',
        dim2:                item.dim2 != null ? String(item.dim2) : '',
        dim3:                item.dim3 != null ? String(item.dim3) : '',
        weight:              item.weight != null ? String(item.weight) : '',
        stockMin:            item.stockMin != null ? String(item.stockMin) : '',
        stockMax:            item.stockMax != null ? String(item.stockMax) : '',
        warehouseZone:       item.warehouseZone ?? '',
        warehouseRack:       item.warehouseRack ?? '',
        warehouseSlot:       item.warehouseSlot ?? '',
        salePrice:           item.salePrice != null ? String(item.salePrice) : '',
        costPrice:           item.costPrice != null ? String(item.costPrice) : '',
        currency:            item.currency ?? 'ARS',
        daysLeadTime:        item.daysLeadTime != null ? String(item.daysLeadTime) : '',
        productionMemo:      item.productionMemo ?? '',
        observations:        item.observations ?? '',
      })
      setApiErr(null)
    }
  }, [open, item, reset])

  const m = useMutation({
    mutationFn: (d: Record<string, unknown>) => apiClient.put(`/items/${item.id}`, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['item-detail', item.id] })
      onSaved()
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setApiErr(msg ?? 'No se pudo guardar los cambios.')
    },
  })

  const onSubmit = (v: Record<string, string>) => {
    setApiErr(null)
    const payload: Record<string, unknown> = {
      typeId:              item.typeId,
      // None of these 6 fields are editable from this dialog, but ItemServiceImpl.applyRequest
      // does a full REPLACE from ItemRequest (not a merge) — omitting them doesn't just skip an
      // update, it silently overwrites real data with null on every save (material/
      // materialDevelopment/segmentCode/description) or fails backend validation outright
      // (unitPurchase is @NotBlank; unitConsumption must match the item's weight method, e.g.
      // "Mm." for MM_LINEAR). Pass all of them through unchanged.
      segmentCode:         item.segmentCode,
      description:         item.description,
      material:            item.material,
      materialDevelopment: item.materialDevelopment,
      unitPurchase:        item.unitPurchase,
      unitConsumption:     item.unitConsumption,
      fullName:            v.fullName,
      abbreviation:        v.abbreviation || null,
      functionName:        v.functionName || null,
      operationComplement: v.operationComplement || null,
      dim2:                v.dim2 !== '' ? Number(v.dim2) : null,
      dim3:                v.dim3 !== '' ? Number(v.dim3) : null,
      stockMin:            v.stockMin !== '' ? Number(v.stockMin) : null,
      stockMax:            v.stockMax !== '' ? Number(v.stockMax) : null,
      warehouseZone:       v.warehouseZone || null,
      warehouseRack:       v.warehouseRack || null,
      warehouseSlot:       v.warehouseSlot || null,
      salePrice:           v.salePrice !== '' ? Number(v.salePrice) : null,
      costPrice:           v.costPrice !== '' ? Number(v.costPrice) : null,
      currency:            v.currency || 'ARS',
      daysLeadTime:        v.daysLeadTime !== '' ? Number(v.daysLeadTime) : null,
      productionMemo:      v.productionMemo || null,
      observations:        v.observations || null,
    }
    // Weight is only editable for classes with manual weight entry — for calculated
    // classes it's derived server-side and must not be overwritten from this dialog.
    if (item.manualWeight) {
      payload.weight = v.weight !== '' ? Number(v.weight) : null
    }
    m.mutate(payload)
  }

  return (
    <FormDialog open={open} title="Editar ítem" width="w-[640px]" onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit as never)} className="flex flex-col gap-6">

        <FormSection title="Identificación" first>
          <FormField label="Nombre completo" required>
            <input {...register('fullName', { required: true })} maxLength={145} className={inputBase} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Función" optional helper="Ej: Soporte lateral, Tapa frontal...">
              <input {...register('functionName')} maxLength={65} className={inputBase} />
            </FormField>
            <FormField label="Abreviatura" optional>
              <input {...register('abbreviation')} maxLength={25} className={inputBase} />
            </FormField>
          </div>
          <FormField label="Complemento operación" optional>
            <input {...register('operationComplement')} maxLength={145} className={inputBase} placeholder="Ej: galvanizado, pintado..." />
          </FormField>
        </FormSection>

        <FormSection title="Dimensiones y stock">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Dimensión 2" optional>
              <input type="number" step="0.001" {...register('dim2')} className={inputBase} placeholder="0.000" />
            </FormField>
            <FormField label="Dimensión 3" optional>
              <input type="number" step="0.001" {...register('dim3')} className={inputBase} placeholder="0.000" />
            </FormField>
            <FormField label="Stock mínimo" optional>
              <input type="number" step="0.001" {...register('stockMin')} className={inputBase} placeholder="0.000" />
            </FormField>
            <FormField label="Stock máximo" optional>
              <input type="number" step="0.001" {...register('stockMax')} className={inputBase} placeholder="0.000" />
            </FormField>
            {item.manualWeight && (
              <FormField label="Peso (kg)" optional helper="Esta clase carga el peso a mano">
                <input type="number" step="0.000001" {...register('weight')} className={inputBase} placeholder="0.000000" />
              </FormField>
            )}
          </div>
        </FormSection>

        <FormSection title="Depósito">
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Zona" optional>
              <input {...register('warehouseZone')} maxLength={10} className={inputBase} />
            </FormField>
            <FormField label="Rack" optional>
              <input {...register('warehouseRack')} maxLength={10} className={inputBase} />
            </FormField>
            <FormField label="Casilla" optional>
              <input {...register('warehouseSlot')} maxLength={10} className={inputBase} />
            </FormField>
          </div>
        </FormSection>

        <FormSection title="Precio y compras">
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Precio venta" optional>
              <input type="number" step="0.01" {...register('salePrice')} className={inputBase} placeholder="0.00" />
            </FormField>
            <FormField label="Precio costo" optional>
              <input type="number" step="0.01" {...register('costPrice')} className={inputBase} placeholder="0.00" />
            </FormField>
            <FormField label="Moneda" optional>
              <input {...register('currency')} maxLength={3} className={inputBase} placeholder="ARS" />
            </FormField>
            <FormField label="Días de compra" optional>
              <input type="number" min="0" {...register('daysLeadTime')} className={inputBase} placeholder="0" />
            </FormField>
          </div>
        </FormSection>

        <FormSection title="Notas">
          <FormField label="Memo producción" optional>
            <textarea {...register('productionMemo')} rows={2} className={textareaBase} />
          </FormField>
          <FormField label="Observaciones" optional>
            <textarea {...register('observations')} rows={2} className={textareaBase} />
          </FormField>
        </FormSection>

        {apiErr && <ErrorBanner message={apiErr} />}
        <FormActions pending={m.isPending} isEdit label="Guardar" onClose={onClose} />
      </form>
    </FormDialog>
  )
}
