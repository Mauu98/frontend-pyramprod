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
