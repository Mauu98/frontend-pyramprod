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
  stockShortage: number
  stockFutureTotal: number
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

export interface ApiError {
  status: number
  error: string
  code?: string
  message: string
  timestamp: string
}
