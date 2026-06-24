import { apiClient } from '@/lib/api-client'
import type { Category, Family, ItemDetail, ItemSummary, ItemType } from '@/types/api.types'

export interface ItemsFilter {
  search?: string
  categoryId?: number
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
    apiClient.get<{ content: ItemSummary[]; totalElements: number; totalPages: number; number: number }>('/catalog/items', { params: { size: 20, ...filter } }).then(r => r.data),

  getItem: (id: number) =>
    apiClient.get<ItemDetail>(`/catalog/items/${id}`).then(r => r.data),

  createItem: (data: Partial<ItemDetail>) =>
    apiClient.post<ItemDetail>('/catalog/items', data).then(r => r.data),

  updateItem: (id: number, data: Partial<ItemDetail>) =>
    apiClient.patch<ItemDetail>(`/catalog/items/${id}`, data).then(r => r.data),

  deleteItem: (id: number) =>
    apiClient.delete(`/catalog/items/${id}`),

  getCategories: () =>
    apiClient.get<Category[]>('/catalog/categories').then(r => r.data),

  getFamilies: (categoryId?: number) =>
    apiClient.get<Family[]>('/catalog/families', { params: categoryId ? { categoryId } : {} }).then(r => r.data),

  getTypes: (familyId?: number) =>
    apiClient.get<ItemType[]>('/catalog/types', { params: familyId ? { familyId } : {} }).then(r => r.data),

  getMeasures: () =>
    apiClient.get<Measure[]>('/catalog/measures').then(r => r.data),

  createMeasure: (data: { code: string; name: string; symbol?: string }) =>
    apiClient.post<Measure>('/catalog/measures', data).then(r => r.data),

  updateMeasure: (id: number, data: { code?: string; name?: string; symbol?: string }) =>
    apiClient.patch<Measure>(`/catalog/measures/${id}`, data).then(r => r.data),

  deleteMeasure: (id: number) =>
    apiClient.delete(`/catalog/measures/${id}`),
}
