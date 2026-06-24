import { apiClient } from '@/lib/api-client'
import type { Customer, CustomerRequest, PageResponse, ReservationStatusResponse, SalesOrderResponse, SalesQuote, SalesQuoteRequest, TaxRate } from '@/types/api.types'

export const salesService = {
  // Customers
  listCustomers: (params: { search?: string; page?: number; size?: number } = {}) =>
    apiClient.get<PageResponse<Customer>>('/sales/customers', { params: { size: 20, ...params } }).then(r => r.data),
  getCustomer: (id: number) =>
    apiClient.get<Customer>(`/sales/customers/${id}`).then(r => r.data),
  createCustomer: (req: CustomerRequest) =>
    apiClient.post<Customer>('/sales/customers', req).then(r => r.data),
  updateCustomer: (id: number, req: Partial<CustomerRequest>) =>
    apiClient.patch<Customer>(`/sales/customers/${id}`, req).then(r => r.data),
  deleteCustomer: (id: number) =>
    apiClient.delete(`/sales/customers/${id}`),

  // Tax rates
  listTaxRates: () =>
    apiClient.get<TaxRate[]>('/sales/tax-rates').then(r => r.data),

  // Sales Quotes
  listQuotes: (params: { customerId?: number; status?: string; page?: number; size?: number } = {}) =>
    apiClient.get<PageResponse<SalesQuote>>('/sales/quotes', { params: { size: 20, ...params } }).then(r => r.data),
  getQuote: (id: number) =>
    apiClient.get<SalesQuote>(`/sales/quotes/${id}`).then(r => r.data),
  createQuote: (req: SalesQuoteRequest) =>
    apiClient.post<SalesQuote>('/sales/quotes', req).then(r => r.data),
  updateQuote: (id: number, req: Partial<SalesQuoteRequest>) =>
    apiClient.patch<SalesQuote>(`/sales/quotes/${id}`, req).then(r => r.data),
  confirmQuote: (id: number) =>
    apiClient.patch<SalesQuote>(`/sales/quotes/${id}/confirm`).then(r => r.data),
  cancelQuote: (id: number) =>
    apiClient.patch<SalesQuote>(`/sales/quotes/${id}/cancel`).then(r => r.data),
  convertToOrder: (quoteId: number) =>
    apiClient.post<SalesOrderResponse>(`/sales/quotes/${quoteId}/convert`).then(r => r.data),

  // Sales Orders (Phase 2)
  createOrder: (data: { customerId: number; orderDate: string; currency: string; ivaRate: number; lines: Array<{ itemId: number; quantityOrdered: number; unitPrice: number; exchangeRate?: number }> }) =>
    apiClient.post<SalesOrderResponse>('/sales/orders', data).then(r => r.data),
  listOrders: (params: { customerId?: number; status?: string; page?: number; size?: number } = {}) =>
    apiClient.get<PageResponse<SalesOrderResponse>>('/sales/orders', { params: { size: 20, ...params } }).then(r => r.data),
  getOrder: (id: number) =>
    apiClient.get<SalesOrderResponse>(`/sales/orders/${id}`).then(r => r.data),
  reserveOrder: (id: number) =>
    apiClient.patch<SalesOrderResponse>(`/sales/orders/${id}/reserve`).then(r => r.data),
  cancelOrder: (id: number) =>
    apiClient.patch<SalesOrderResponse>(`/sales/orders/${id}/cancel`).then(r => r.data),
  getReservationStatus: (id: number) =>
    apiClient.get<ReservationStatusResponse>(`/sales/orders/${id}/reservation-status`).then(r => r.data),
}
