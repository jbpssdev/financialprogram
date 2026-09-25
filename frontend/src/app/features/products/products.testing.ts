import { Category, PriceHistory, Product } from './products.models';

export function createDummyCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 'cat-1',
    name: 'Bebidas',
    description: 'Refrigerantes, cervejas e sucos',
    isActive: true,
    createdAt: '2026-01-10T10:00:00.000Z',
    updatedAt: '2026-01-10T10:00:00.000Z',
    _count: {
      products: 3,
    },
    ...overrides,
  };
}

export function createDummyProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'prod-1',
    categoryId: 'cat-1',
    name: 'Cerveja Artesanal IPA',
    description: 'Garrafa 500ml Puro Malte',
    type: 'PRODUCT_STOCK',
    unitOfMeasure: 'UNIT',
    currentPrice: '18.50',
    averageCost: '9.20',
    currentStock: '45.000',
    isActive: true,
    createdAt: '2026-01-15T12:00:00.000Z',
    updatedAt: '2026-01-15T12:00:00.000Z',
    category: createDummyCategory(),
    priceHistory: [
      {
        id: 'ph-1',
        productId: 'prod-1',
        oldPrice: '16.00',
        newPrice: '18.50',
        averageCost: '9.20',
        changedAt: '2026-02-01T14:00:00.000Z',
      },
    ],
    ...overrides,
  };
}

export function createDummyProductList(): Product[] {
  return [
    createDummyProduct({
      id: 'prod-1',
      name: 'Cerveja Artesanal IPA',
      type: 'PRODUCT_STOCK',
      currentPrice: '18.50',
      currentStock: '45.000',
      isActive: true,
    }),
    createDummyProduct({
      id: 'prod-2',
      name: 'Ficha Fliperama',
      type: 'TOKEN_QUANTITY',
      unitOfMeasure: 'TOKEN',
      currentPrice: '5.00',
      currentStock: '200.000',
      isActive: true,
    }),
    createDummyProduct({
      id: 'prod-3',
      name: 'Entrada Show Acústico',
      type: 'SERVICE',
      unitOfMeasure: 'UNIT',
      currentStock: '0.000',
      isActive: false,
    }),
  ];
}

export const createMockCategory = createDummyCategory;
export const createMockProduct = createDummyProduct;
