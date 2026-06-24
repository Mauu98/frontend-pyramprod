import { apiClient } from '@/lib/api-client'
import type { PageResponse, ProductionOrderLineResponse, ProductionOrderRequest, ProductionOrderResponse, SimulationResult } from '@/types/api.types'

export interface LineAdvanceRequest {
  inProcessQty?: number
  finishedQty?: number
  extraQty?: number
  currentLot?: string
  destinationLot?: string
  partDescription?: string
}

export const productionService = {
  createOrder: (req: ProductionOrderRequest) =>
    apiClient.post<ProductionOrderResponse>('/production/orders', req).then(r => r.data),

  listOrders: (params: { page?: number; size?: number; status?: string } = {}) =>
    apiClient.get<PageResponse<ProductionOrderResponse>>('/production/orders', { params: { size: 20, ...params } }).then(r => r.data),

  getOrder: (id: number) =>
    apiClient.get<ProductionOrderResponse>(`/production/orders/${id}`).then(r => r.data),

  confirmLaunch: (id: number) =>
    apiClient.patch<ProductionOrderResponse>(`/production/orders/${id}/launch`).then(r => r.data),

  cancelOrder: (id: number) =>
    apiClient.patch<ProductionOrderResponse>(`/production/orders/${id}/cancel`).then(r => r.data),

  deleteOrder: (id: number) =>
    apiClient.delete(`/production/orders/${id}`),

  simulate: (id: number) =>
    apiClient.post<SimulationResult>(`/production/orders/${id}/simulate`).then(r => r.data),

  getLines: (orderId: number) =>
    apiClient.get<ProductionOrderLineResponse[]>(`/production/orders/${orderId}/lines`).then(r => r.data),

  advanceLine: (orderId: number, lineId: number, req: LineAdvanceRequest) =>
    apiClient.patch<ProductionOrderLineResponse>(`/production/orders/${orderId}/lines/${lineId}/advance`, req).then(r => r.data),
}
