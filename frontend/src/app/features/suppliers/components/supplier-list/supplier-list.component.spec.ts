import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Supplier } from '../../suppliers.models';
import { SupplierListComponent } from './supplier-list.component';

describe('SupplierListComponent', () => {
  let component: SupplierListComponent;
  let fixture: ComponentFixture<SupplierListComponent>;

  const mockSuppliers: Supplier[] = [
    {
      id: 'sup-1',
      name: 'Ambev Distribuidora',
      contactName: 'Carlos Silva',
      phone: '11999998888',
      email: 'carlos@ambev.com',
      notes: 'Entrega rápida',
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
    await TestBed.configureTestingModule({
      imports: [SupplierListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SupplierListComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('suppliers', mockSuppliers);
    fixture.componentRef.setInput('filters', { search: '', status: 'ALL' });
    fixture.componentRef.setInput('loading', false);

    fixture.detectChanges();
  });

  it('should render suppliers rows', () => {
    const rows = fixture.debugElement.queryAll(By.css('tbody tr'));
    expect(rows.length).toBe(2);

    expect(fixture.nativeElement.textContent).toContain('Ambev Distribuidora');
    expect(fixture.nativeElement.textContent).toContain('Carlos Silva');
    expect(fixture.nativeElement.textContent).toContain('11999998888');
    expect(fixture.nativeElement.textContent).toContain('carlos@ambev.com');
    expect(fixture.nativeElement.textContent).toContain('Coca-Cola FEMSA');
  });

  it('should render empty state when no suppliers', () => {
    fixture.componentRef.setInput('suppliers', []);
    fixture.detectChanges();

    const empty = fixture.debugElement.query(By.css('[data-testid="suppliers-empty-state"]'));
    expect(empty).toBeTruthy();
    expect(empty.nativeElement.textContent).toContain('Nenhum fornecedor cadastrado.');
  });

  it('should emit create on "Novo Fornecedor" click', () => {
    vi.spyOn(component.create, 'emit');

    const createBtn = fixture.debugElement.query(By.css('[data-testid="btn-create-supplier-top"]'));
    createBtn.nativeElement.click();

    expect(component.create.emit).toHaveBeenCalled();
  });

  it('should emit edit on pencil click', () => {
    vi.spyOn(component.edit, 'emit');

    const editBtn = fixture.debugElement.query(By.css('[data-testid="btn-edit-supplier-sup-1"]'));
    editBtn.nativeElement.click();

    expect(component.edit.emit).toHaveBeenCalledWith(mockSuppliers[0]);
  });

  it('should emit toggleStatus on power click', () => {
    vi.spyOn(component.toggleStatus, 'emit');

    const toggleBtn = fixture.debugElement.query(By.css('[data-testid="btn-toggle-supplier-sup-1"]'));
    toggleBtn.nativeElement.click();

    expect(component.toggleStatus.emit).toHaveBeenCalledWith(mockSuppliers[0]);
  });
});
