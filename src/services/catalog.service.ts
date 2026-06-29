import { apiClient } from '@/lib/api-client'
import type { Segment, Family, ItemClass, ItemDetail, ItemSummary } from '@/types/api.types'

export interface ItemsFilter {
  search?: string
  segmentId?: number
  familyId?: number
  typeId?: number
  active?: boolean
  page?: number
  size?: number
}

export interface Measure {
  id: number
  code: string
  name: string
  symbol: string | null
}

export const catalogService = {
  getItems: (filter: ItemsFilter = {}) =>
    apiClient.get<{ content: ItemSummary[]; totalElements: number; totalPages: number; number: number }>('/items', { params: { size: 20, ...filter } }).then(r => r.data),

  getItem: (id: number) =>
    apiClient.get<ItemDetail>(`/items/${id}`).then(r => r.data),

  createItem: (data: Partial<ItemDetail>) =>
    apiClient.post<ItemDetail>('/items', data).then(r => r.data),

  updateItem: (id: number, data: Partial<ItemDetail>) =>
    apiClient.put<ItemDetail>(`/items/${id}`, data).then(r => r.data),

  deleteItem: (id: number) =>
    apiClient.delete(`/items/${id}`),

  getSegments: () =>
    apiClient.get<Segment[]>('/segments').then(r => r.data),

  getFamiliesBySegment: (segmentId: number) =>
    apiClient.get<Family[]>(`/segments/${segmentId}/families`).then(r => r.data),

  getItemClasses: (familyId: number) =>
    apiClient.get<ItemClass[]>(`/families/${familyId}/item-classes`).then(r => r.data),

  getMeasures: () =>
    apiClient.get<Measure[]>('/measures').then(r => r.data),

  createMeasure: (data: { code: string; name: string; symbol?: string }) =>
    apiClient.post<Measure>('/measures', data).then(r => r.data),

  updateMeasure: (id: number, data: { code?: string; name?: string; symbol?: string }) =>
    apiClient.patch<Measure>(`/measures/${id}`, data).then(r => r.data),

  deleteMeasure: (id: number) =>
    apiClient.delete(`/measures/${id}`),

  batchImportFamilies: (segmentId: number, text: string) =>
    apiClient.post<Family[]>(`/families/segments/${segmentId}/batch-text`, { text }).then(r => r.data),

  batchImportItemClasses: (familyId: number, text: string) =>
    apiClient.post<ItemClass[]>(`/item-classes/families/${familyId}/batch-text`, { text }).then(r => r.data),

  copyItemClassesToFamily: (sourceFamilyId: number, targetFamilyId: number) =>
    apiClient.post<ItemClass[]>('/item-classes/copy-to-family', { sourceFamilyId, targetFamilyId }).then(r => r.data),

  batchImportItems: (typeId: number, text: string) =>
    apiClient.post<ItemDetail[]>(`/item-classes/${typeId}/items/batch-text`, { text }).then(r => r.data),

  adjustStock: (id: number, availableDelta?: number, futureDelta?: number) =>
    apiClient.patch<ItemDetail>(`/items/${id}/stock`, { availableDelta, futureDelta }).then(r => r.data),
}
