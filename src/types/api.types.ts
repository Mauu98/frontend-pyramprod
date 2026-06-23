export interface LoginRequest {
  companyCode: string
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  userId: number
  companyId: number
  role: string
  expiresIn: number
}

export interface Category {
  id: number
  code: string
  name: string
  abbreviation: string | null
  description: string | null
}

export interface Family {
  id: number
  code: string
  name: string
  abbreviation: string | null
  description: string | null
  categoryId: number
}

// unitOfMeasure controls which dimension fields are active and the weight formula
export type DimensionUnit = 'Mm.' | 'Mm2.' | 'Mm3.' | 'Kg./Und' | 'Und/Kg.'

export interface ItemType {
  id: number
  code: string
  name: string
  abbreviation: string | null
  description: string | null
  familyId: number
  // material & operation data (catecod_3)
  material: string | null         // fullCode of the raw material item
  specificWeight: number | null   // peso_e (kg/mm³ or similar)
  nominalDimension: number | null // dim_e (dimensional factor)
  unitOfMeasure: DimensionUnit | null
  materialName: string | null     // abbreviated name of the material
  operatorName: string | null     // abbreviated name of the operation
}

export interface ItemSummary {
  id: number
  fullCode: string
  fullName: string
  unitOfMeasure: string | null
  stock: number
  stockMin: number
  active: boolean
}

export interface ItemDetail {
  id: number
  typeId: number
  segmentCode: string
  fullCode: string
  fullName: string
  abbreviation: string | null
  description: string | null
  sortOrder: number
  // material
  material: string | null
  materialDevelopment: number | null
  unitConsumption: string | null
  unitPurchase: string | null
  dim2: number | null
  dim3: number | null
  // stock
  stockAvailable: number
  stockReserved: number
  stockTotal: number
  stockFuture: number
  /** @deprecated use shortageSales */
  stockShortage: number
  shortageSales: number
  /** @deprecated use shortageStock */
  stockFutureTotal: number
  shortageStock: number
  manageShortageSales: boolean
  manageShortageStock: boolean
  stockMin: number
  stockMax: number
  // warehouse
  warehouseZone: string | null
  warehouseRack: string | null
  warehouseSlot: string | null
  // pricing
  salePrice: number
  costPrice: number
  currency: string
  daysLeadTime: number
  salePriceDate: string | null
  costPriceDate: string | null
  exchangeRate: number | null
  // physical
  weight: number | null
  productionMemo: string | null
  observations: string | null
  unitConversionFactor: number
  unitIssueItem: string | null
  piecesFraction: number | null
  invoiceSaleMargin: number | null
  invoiceStockMargin: number | null
  operationComplement: string | null
}

// ─── Stock module ─────────────────────────────────────────────────────────────

export interface StockLevel {
  itemId: number
  itemCode: string
  itemName: string
  available: number
  future: number
  reservedSales: number
  shortageSales: number
  reservedStock: number
  shortageStock: number
  max: number
  min: number
  manageShortageSales: boolean
  manageShortageStock: boolean
}

export type StockVariable =
  | 'AVAILABLE'
  | 'FUTURE'
  | 'RESERVED_SALES'
  | 'SHORTAGE_SALES'
  | 'RESERVED_STOCK'
  | 'SHORTAGE_STOCK'
  | 'MAX'
  | 'MIN'
  | 'MANAGE_SHORTAGE_SALES'
  | 'MANAGE_SHORTAGE_STOCK'

export type StockMovementType =
  | 'ENTRY_INVENTORY'
  | 'ENTRY_MANUFACTURING_ORDER'
  | 'ENTRY_REMIT_FROM_THIRD'
  | 'ENTRY_DELIVERY_NOTE_FROM_THIRD'
  | 'ENTRY_UNPLANNED_STOCK'
  | 'ENTRY_UNEXPECTED_APPEARANCE'
  | 'ENTRY_INVENTORY_ERROR'
  | 'ENTRY_LOANED_STOCK'
  | 'ENTRY_CONSIGNMENT_STOCK'
  | 'ENTRY_SAFETY_ADJUSTMENT'
  | 'EXIT_REMIT_TO_THIRD'
  | 'EXIT_DELIVERY_NOTE_TO_THIRD'
  | 'EXIT_SALES_ORDER_BACKUP'
  | 'EXIT_STOCK_ORDER_BACKUP'
  | 'EXIT_PLANNED_OT_FAILURE'
  | 'EXIT_UNEXPECTED_DISAPPEARANCE'
  | 'EXIT_QUALITY_REJECTION'
  | 'EXIT_INVENTORY_ERROR'
  | 'EXIT_LOANED_STOCK'
  | 'EXIT_CONSIGNMENT_STOCK'
  | 'EXIT_SAFETY_ADJUSTMENT'

export interface StockMovementRequest {
  itemId: number
  entry: boolean
  stockVariable: StockVariable
  amount: number
  movementType: StockMovementType
  applyRules: boolean
  relatedDocument?: string
  memo?: string
  movementDate: string
  actorName?: string
  unitOfMeasure?: string
}

export interface StockMovementResponse {
  id: number
  itemId: number
  itemCode: string
  entry: boolean
  stockVariable: string
  stockVariableLabel: string
  amount: number
  movementType: string
  movementTypeCode: number
  relatedDocument: string | null
  memo: string | null
  movementDate: string
  username: string
  actorName: string | null
  ruleDescription: string | null
  unitOfMeasure: string | null
  appliedRules: boolean
  createdAt: string
}

export interface StockPage {
  content: StockMovementResponse[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

export interface ApiError {
  status: number
  error: string
  code?: string
  message: string
  timestamp: string
}

// ─── Production module ────────────────────────────────────────────────────────

export type ProductionOrderStatus = 'PRE_LAUNCH' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
export type LineType = 'MATERIAL' | 'PRODUCTION'
export type LineStatus = 'PENDING' | 'RESERVED' | 'IN_PRODUCTION' | 'COMPLETED'
export type SimulationClassification = 'RESERVE' | 'BUY' | 'FABRICATE'

export interface ProductionOrderRequest {
  name: string
  items: Array<{ itemId: number; quantity: number }>
  launchType?: string
  notes?: string
  quoteId?: number
}

export interface ProductionOrderResponse {
  id: number
  orderNumber: number
  name: string
  entryDate: string
  launchDate: string | null
  launchType: string | null
  launchedBy: string | null
  notes: string | null
  status: ProductionOrderStatus
  quoteId: number | null
}

export interface SimulationLine {
  componentId: number
  code: string
  name: string
  unit: string | null
  requiredQty: number
  availableQty: number
  classification: SimulationClassification
  depth: number
}

export interface SimulationResult {
  orderId: number
  orderNumber: number
  lines: SimulationLine[]
  reserveCount: number
  buyCount: number
  fabricateCount: number
}

export interface ProductionOrderLineResponse {
  id: number
  orderId: number
  lineType: LineType
  lineStatus: LineStatus
  operationId: number | null
  operationCode: string | null
  operationName: string | null
  materialId: number | null
  materialCode: string | null
  materialName: string | null
  productId: number | null
  productCode: string | null
  productName: string | null
  requiredQty: number
  inProcessQty: number
  finishedQty: number
  extraQty: number
  unit1: string | null
  unit2: string | null
  unit3: string | null
  unit4: string | null
  currentLot: string | null
  destinationLot: string | null
  partDescription: string | null
  launchName: string | null
}

export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

// ─── Purchasing module ────────────────────────────────────────────────────────

export type QuoteStatus = 'ACTIVE' | 'SUPERSEDED'

export interface Supplier {
  id: number
  code: string
  name: string
  address: string | null
  city: string | null
  taxCategory: string | null
  cuit: string | null
  phone1: string | null
  phone2: string | null
  email: string | null
  createdAt: string | null
  updatedAt: string | null
  createdBy: string | null
  updatedBy: string | null
}

export interface SupplierQuote {
  id: number
  supplierId: number
  supplierCode: string
  supplierName: string
  itemId: number
  itemCode: string
  itemName: string
  quoteDate: string
  price: number
  currency: string
  exchangeRate: number | null
  measureId: number | null
  measureCode: string | null
  bonus: number | null
  paymentConditions: string | null
  quotedQuantity: number
  status: QuoteStatus
  createdAt: string | null
  updatedAt: string | null
  createdBy: string | null
  updatedBy: string | null
}

export interface SupplierItemCode {
  id: number
  supplierId: number
  supplierCode: string
  supplierName: string | null
  supplierCompany: string | null
  itemId: number
  itemCode: string
  itemName: string
  createdAt: string | null
  updatedAt: string | null
  createdBy: string | null
  updatedBy: string | null
}

export interface PriceComparisonLine {
  supplierId: number
  supplierCode: string
  supplierName: string
  itemId: number
  quoteDate: string
  price: number
  currency: string
  exchangeRate: number | null
  effectivePrice: number
  bonus: number | null
  paymentConditions: string | null
  quotedQuantity: number
  measureId: number | null
}

export interface SupplierRequest {
  code: string
  name: string
  address?: string
  city?: string
  taxCategory?: string
  cuit?: string
  phone1?: string
  phone2?: string
  email?: string
}

export interface SupplierQuoteRequest {
  supplierId: number
  itemId: number
  quoteDate: string
  price: number
  currency: string
  exchangeRate?: number
  measureId?: number
  bonus?: number
  paymentConditions?: string
  quotedQuantity?: number
}

export interface SupplierItemCodeRequest {
  supplierId: number
  supplierCode: string
  supplierName?: string
  supplierCompany?: string
  itemId: number
}

// ─── Sales module ─────────────────────────────────────────────────────────────

export type TaxRateType = 'IVA' | 'PERCEPTION'
export type SalesQuoteStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED'

export interface TaxRate {
  id: number
  type: TaxRateType
  rate: number
  label: string
  active: boolean
  displayOrder: number
}

export interface Customer {
  id: number
  code: string
  name: string
  address: string | null
  cuit: string | null
  taxCategory: string | null
  bonus: number | null
  cashflow: number | null
  surcharge: number | null
  priceCoefficient: number | null
  paymentDaysCashflow: number | null
  paymentDaysNoCashflow: number | null
  phone1: string | null
  phone2: string | null
  email: string | null
  createdAt: string | null
  updatedAt: string | null
  createdBy: string | null
  updatedBy: string | null
}

export interface CustomerRequest {
  code: string
  name: string
  address?: string
  cuit?: string
  taxCategory?: string
  bonus?: number
  cashflow?: number
  surcharge?: number
  priceCoefficient?: number
  paymentDaysCashflow?: number
  paymentDaysNoCashflow?: number
  phone1?: string
  phone2?: string
  email?: string
}

export interface SalesQuoteLineRequest {
  itemId: number
  quantity: number
  unitPrice: number
  measureId?: number
  exchangeRate?: number
}

export interface SalesQuoteRequest {
  customerId: number
  quoteDate: string
  validityDays?: number
  currency: string
  ivaRate: number
  perceptionRate?: number
  comments?: string
  lines: SalesQuoteLineRequest[]
}

export interface SalesQuoteLine {
  itemId: number
  itemCode: string
  itemName: string
  quantity: number
  unitPrice: number
  measureId: number | null
  measureName: string | null
  exchangeRate: number
  lineTotal: number
}

export interface SalesQuote {
  id: number
  quoteNumber: number
  customerId: number
  customerName: string
  quoteDate: string
  validityDays: number | null
  currency: string
  ivaRate: number
  perceptionRate: number | null
  comments: string | null
  status: SalesQuoteStatus
  lines: SalesQuoteLine[]
  subtotal: number
  ivaAmount: number
  perceptionAmount: number
  total: number
}
