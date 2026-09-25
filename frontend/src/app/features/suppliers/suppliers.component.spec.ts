import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { Supplier } from './suppliers.models';
import { SuppliersService } from './suppliers.service';
import { SuppliersComponent } from './suppliers.component';

describe('SuppliersComponent', () => {
  let component: SuppliersComponent;
  let fixture: ComponentFixture<SuppliersComponent>;
  let mockSuppliersService: {
    getSuppliers: ReturnType<typeof vi.fn>;
    getSupplier: ReturnType<typeof vi.fn>;
    createSupplier: ReturnType<typeof vi.fn>;
    updateSupplier: ReturnType<typeof vi.fn>;
  };

  const mockSuppliers: Supplier[] = [
    {
      id: 'sup-1',
      name: 'Ambev Distribuidora',
      contactName: 'Carlos Silva',
      phone: '11999998888',
      email: 'carlos@ambev.com',
      notes: null,
      isActive: true,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
    {
      id: 'sup-2',
      name: 'Coca-Cola FEMSA',
      contactName: null,
      phone: null,
      email: null,
      notes: null,
      isActive: false,
      createdAt: '2026-09-02T00:00:00Z',
      updatedAt: '2026-09-02T00:00:00Z',
    },
  ];

  beforeEach(async () => {
    mockSuppliersService = {
      getSuppliers: vi.fn().mockReturnValue(of(mockSuppliers)),
      getSupplier: vi.fn(),
      createSupplier: vi.fn(),
      updateSupplier: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [SuppliersComponent],
      providers: [
        { provide: SuppliersService, useValue: mockSuppliersService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SuppliersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render PageHeaderComponent with title Fornecedores', () => {
    const pageHeader = fixture.debugElement.query(By.directive(PageHeaderComponent));
    expect(pageHeader).toBeTruthy();
    expect(fixture.nativeElement.querySelector('h1').textContent.trim()).toBe('Fornecedores');
  });

  it('should render KPI metrics', () => {
    const total = fixture.debugElement.query(By.css('[data-testid="kpi-total-suppliers"]'));
    const active = fixture.debugElement.query(By.css('[data-testid="kpi-active-suppliers"]'));
    const inactive = fixture.debugElement.query(By.css('[data-testid="kpi-inactive-suppliers"]'));

    expect(total.nativeElement.textContent.trim()).toBe('2');
    expect(active.nativeElement.textContent.trim()).toBe('1');
    expect(inactive.nativeElement.textContent.trim()).toBe('1');
  });

  it('should open and close modal for creation', () => {
    component.openCreateModal();
    fixture.detectChanges();

    expect(component.showModal()).toBe(true);
    expect(component.activeSupplier()).toBeNull();
    expect(fixture.debugElement.query(By.css('[data-testid="modal-supplier-form"]'))).toBeTruthy();

    component.closeModal();
    fixture.detectChanges();

    expect(component.showModal()).toBe(false);
    expect(fixture.debugElement.query(By.css('[data-testid="modal-supplier-form"]'))).toBeNull();
  });

  it('should open and close modal for editing', () => {
    component.openEditModal(mockSuppliers[0]);
    fixture.detectChanges();

    expect(component.showModal()).toBe(true);
    expect(component.activeSupplier()).toEqual(mockSuppliers[0]);
    expect(fixture.debugElement.query(By.css('[data-testid="modal-supplier-form"]'))).toBeTruthy();

    component.closeModal();
    fixture.detectChanges();

    expect(component.showModal()).toBe(false);
    expect(component.activeSupplier()).toBeNull();
  });

  it('should display error banner when store.error is set', () => {
    component.store.error.set('Erro ao carregar dados');
    fixture.detectChanges();

    const err = fixture.debugElement.query(By.css('[data-testid="suppliers-global-error"]'));
    expect(err).toBeTruthy();
    expect(err.nativeElement.textContent).toContain('Erro ao carregar dados');
  });
});
