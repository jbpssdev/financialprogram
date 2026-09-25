export type ItemType = 'PRODUCT_STOCK' | 'TOKEN_QUANTITY' | 'SERVICE';

export type UnitOfMeasure = 'UNIT' | 'KG' | 'LITER' | 'PACK' | 'BOX' | 'TOKEN';

export interface Category {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    products: number;
  };
}

export interface CreateCategoryDto {
  name: string;
  description?: string;
}

export interface UpdateCategoryDto {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface PriceHistory {
  id: string;
  productId: string;
  oldPrice: string | number;
  newPrice: string | number;
  averageCost: string | number;
  changedAt: string;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  type: ItemType;
  unitOfMeasure: UnitOfMeasure;
  currentPrice: string | number;
  averageCost: string | number;
  currentStock: string | number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category?: Category;
  priceHistory?: PriceHistory[];
}

export interface CreateProductDto {
  categoryId: string;
  name: string;
  description?: string;
  type?: ItemType;
  unitOfMeasure?: UnitOfMeasure;
  currentPrice: number;
}

export interface UpdateProductDto {
  categoryId?: string;
  name?: string;
  description?: string;
  type?: ItemType;
  unitOfMeasure?: UnitOfMeasure;
  currentPrice?: number;
  isActive?: boolean;
}

export interface ProductFilters {
  search: string;
  categoryId: string;
  type: string;
  status: 'ALL' | 'ACTIVE' | 'INACTIVE';
}
