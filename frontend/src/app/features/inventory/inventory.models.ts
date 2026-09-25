export type ItemType = 'PRODUCT_STOCK' | 'TOKEN_QUANTITY' | 'SERVICE';

export type UnitOfMeasure = 'UNIT' | 'KG' | 'LITER' | 'PACK' | 'BOX' | 'TOKEN';

export interface InventoryCategory {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface InventoryProduct {
  id: string;
  name: string;
  description: string | null;
  categoryId: string;
  type: ItemType;
  unitOfMeasure: UnitOfMeasure;
  currentPrice: string;
  currentStock: string;
  averageCost: string;
  stockValue: string;
  potentialRevenue: string;
  potentialGrossProfit: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category?: InventoryCategory;
}

export type StockMovementType =
  | 'INITIAL_BALANCE'
  | 'PURCHASE'
  | 'PURCHASE_RETURN'
  | 'SALE'
  | 'SALE_RETURN'
  | 'ADJUSTMENT_POSITIVE'
  | 'ADJUSTMENT_NEGATIVE'
  | 'LOSS'
  | 'INTERNAL_CONSUMPTION';

export interface StockMovement {
  id: string;
  productId: string;
  purchaseItemId: string | null;
  saleItemId: string | null;
  type: StockMovementType;
  quantity: string;
  unitCost: string;
  totalCost: string;
  averageCostAfter: string;
  balanceAfter: string;
  stockValueAfter: string;
  reason: string | null;
  movementDate: string;
  createdAt: string;
  purchaseItem?: {
    purchase?: {
      supplier?: {
        id: string;
        name: string;
      };
    };
  } | null;
  saleItem?: {
    sale?: {
      id: string;
    };
  } | null;
}

export type AllowedAdjustmentType =
  | 'ADJUSTMENT_POSITIVE'
  | 'ADJUSTMENT_NEGATIVE'
  | 'LOSS'
  | 'INTERNAL_CONSUMPTION';

export interface OpeningBalanceDto {
  productId: string;
  quantity: number;
  unitCost: number;
}

export interface OpeningBalanceResponse {
  product: InventoryProduct;
  movement: StockMovement;
}

export interface CreateStockAdjustmentDto {
  productId: string;
  type: AllowedAdjustmentType;
  quantity: number;
  reason: string;
  notes?: string;
  movementDate?: string;
}

export interface StockAdjustmentResponse {
  product: InventoryProduct;
  movement: StockMovement;
}

export type StockStatusFilter = 'ALL' | 'IN_STOCK' | 'OUT_OF_STOCK' | 'SERVICE';

export interface InventoryFilters {
  search: string;
  categoryId: string;
  type: string;
  stockStatus: StockStatusFilter;
}
