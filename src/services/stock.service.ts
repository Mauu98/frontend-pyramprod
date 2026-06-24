import { apiClient } from '@/lib/api-client'
import type { StockLevel, StockMovementRequest, StockMovementResponse, StockPage } from '@/types/api.types'

export const stockService = {
  getAllLevels: () =>
    apiClient.get<StockLevel[]>('/stock/levels').then(r => r.data),

  getLevelForItem: (itemId: number) =>
    apiClient.get<StockLevel>(`/stock/levels/${itemId}`).then(r => r.data),

  applyMovement: (req: StockMovementRequest) =>
    apiClient.post<StockMovementResponse>('/stock/movements', req).then(r => r.data),

  listMovements: (params: { itemId?: number; dateFrom?: string; dateTo?: string; type?: string; page?: number; size?: number } = {}) =>
    apiClient.get<StockPage>('/stock/movements', { params: { size: 20, ...params } }).then(r => r.data),
}
