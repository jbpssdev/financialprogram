export interface Supplier {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    purchases: number;
  };
}

export interface CreateSupplierDto {
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export interface UpdateSupplierDto {
  name?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  notes?: string;
  isActive?: boolean;
}

export type SupplierStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

export interface SupplierFilters {
  search: string;
  status: SupplierStatusFilter;
}
