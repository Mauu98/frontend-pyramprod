import { apiClient } from '@/lib/api-client'
import type {
  DeliveryNoteRequest, DeliveryNoteLineRequest, DeliveryNoteResponse,
  InvoiceRequest, InvoiceLineRequest, SupplierInvoiceResponse,
  PageResponse, PriceComparisonLine,
  PurchaseOrderRequest, PurchaseOrderResponse,
  Supplier, SupplierItemCode, SupplierItemCodeRequest,
  SupplierQuote, SupplierQuoteRequest, SupplierRequest,
} from '@/types/api.types'

export const purchasingService = {
  // Suppliers
  listSuppliers: (params: { search?: string; page?: number; size?: number } = {}) =>
    apiClient.get<PageResponse<Supplier>>('/purchasing/suppliers', { params: { size: 20, ...params } }).then(r => r.data),
  getSupplier: (id: number) =>
    apiClient.get<Supplier>(`/purchasing/suppliers/${id}`).then(r => r.data),
  createSupplier: (req: SupplierRequest) =>
    apiClient.post<Supplier>('/purchasing/suppliers', req).then(r => r.data),
  updateSupplier: (id: number, req: Partial<SupplierRequest>) =>
    apiClient.patch<Supplier>(`/purchasing/suppliers/${id}`, req).then(r => r.data),
  deleteSupplier: (id: number) =>
    apiClient.delete(`/purchasing/suppliers/${id}`),

  // Quotes
  listQuotes: (params: { supplierId?: number; itemId?: number; status?: string; page?: number; size?: number } = {}) =>
    apiClient.get<PageResponse<SupplierQuote>>('/purchasing/quotes', { params: { size: 20, ...params } }).then(r => r.data),
  createQuote: (req: SupplierQuoteRequest) =>
    apiClient.post<SupplierQuote>('/purchasing/quotes', req).then(r => r.data),
  updateQuote: (id: number, req: Partial<SupplierQuoteRequest>) =>
    apiClient.patch<SupplierQuote>(`/purchasing/quotes/${id}`, req).then(r => r.data),
  compareByItem: (itemId: number) =>
    apiClient.get<PriceComparisonLine[]>(`/purchasing/quotes/compare/${itemId}`).then(r => r.data),

  // Supplier codes
  listCodes: (params: { supplierId?: number; itemId?: number } = {}) =>
    apiClient.get<SupplierItemCode[]>('/purchasing/supplier-codes', { params }).then(r => r.data),
  createCode: (req: SupplierItemCodeRequest) =>
    apiClient.post<SupplierItemCode>('/purchasing/supplier-codes', req).then(r => r.data),
  deleteCode: (id: number) =>
    apiClient.delete(`/purchasing/supplier-codes/${id}`),

  // Purchase Orders (Phase 2)
  createOrder: (req: PurchaseOrderRequest) =>
    apiClient.post<PurchaseOrderResponse>('/purchasing/orders', req).then(r => r.data),
  convertFromQuote: (quoteId: number) =>
    apiClient.post<PurchaseOrderResponse>(`/purchasing/quotes/${quoteId}/convert`).then(r => r.data),
  listOrders: (params: { supplierId?: number; status?: string; page?: number; size?: number } = {}) =>
    apiClient.get<PageResponse<PurchaseOrderResponse>>('/purchasing/orders', { params: { size: 20, ...params } }).then(r => r.data),
  getOrder: (id: number) =>
    apiClient.get<PurchaseOrderResponse>(`/purchasing/orders/${id}`).then(r => r.data),
  issueOrder: (id: number) =>
    apiClient.patch<PurchaseOrderResponse>(`/purchasing/orders/${id}/issue`).then(r => r.data),
  cancelOrder: (id: number) =>
    apiClient.patch<PurchaseOrderResponse>(`/purchasing/orders/${id}/cancel`).then(r => r.data),
  updateOrder: (id: number, data: { expectedDeliveryDate?: string; statusNotes?: string }) =>
    apiClient.patch<PurchaseOrderResponse>(`/purchasing/orders/${id}`, data).then(r => r.data),

  // Delivery Notes (Phase 2)
  createNote: (req: DeliveryNoteRequest) =>
    apiClient.post<DeliveryNoteResponse>('/purchasing/delivery-notes', req).then(r => r.data),
  addNoteLine: (id: number, req: DeliveryNoteLineRequest) =>
    apiClient.post<DeliveryNoteResponse>(`/purchasing/delivery-notes/${id}/lines`, req).then(r => r.data),
  closeNote: (id: number) =>
    apiClient.patch<DeliveryNoteResponse>(`/purchasing/delivery-notes/${id}/close`).then(r => r.data),
  listNotes: (params: { supplierId?: number; purchaseOrderId?: number; page?: number; size?: number } = {}) =>
    apiClient.get<PageResponse<DeliveryNoteResponse>>('/purchasing/delivery-notes', { params: { size: 20, ...params } }).then(r => r.data),
  getNote: (id: number) =>
    apiClient.get<DeliveryNoteResponse>(`/purchasing/delivery-notes/${id}`).then(r => r.data),

  // Invoices (Phase 2)
  createInvoice: (req: InvoiceRequest) =>
    apiClient.post<SupplierInvoiceResponse>('/purchasing/invoices', req).then(r => r.data),
  addInvoiceLine: (id: number, req: InvoiceLineRequest) =>
    apiClient.post<SupplierInvoiceResponse>(`/purchasing/invoices/${id}/lines`, req).then(r => r.data),
  postInvoice: (id: number) =>
    apiClient.patch<SupplierInvoiceResponse>(`/purchasing/invoices/${id}/post`).then(r => r.data),
  updateInvoice: (id: number, data: Partial<InvoiceRequest>) =>
    apiClient.patch<SupplierInvoiceResponse>(`/purchasing/invoices/${id}`, data).then(r => r.data),
  listInvoices: (params: { supplierId?: number; invoiceType?: string; posted?: boolean; page?: number; size?: number } = {}) =>
    apiClient.get<PageResponse<SupplierInvoiceResponse>>('/purchasing/invoices', { params: { size: 20, ...params } }).then(r => r.data),
  getInvoice: (id: number) =>
    apiClient.get<SupplierInvoiceResponse>(`/purchasing/invoices/${id}`).then(r => r.data),
}
