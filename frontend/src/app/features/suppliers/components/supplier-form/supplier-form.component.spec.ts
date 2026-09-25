import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Supplier } from '../../suppliers.models';
import { SupplierFormComponent } from './supplier-form.component';

describe('SupplierFormComponent', () => {
  let component: SupplierFormComponent;
  let fixture: ComponentFixture<SupplierFormComponent>;

  const mockSupplier: Supplier = {
    id: 'sup-1',
    name: 'Cervejaria Ambev',
    contactName: 'Carlos',
    phone: '11999998888',
    email: 'carlos@ambev.com',
    notes: 'Prazo 15 dias',
    isActive: true,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SupplierFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SupplierFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize empty and invalid for creation', () => {
    expect(component.isEditing()).toBe(false);
    expect(component.form.invalid).toBe(true);
    expect(component.form.controls.name.value).toBe('');
  });

  it('should populate fields when supplier input is provided', () => {
    fixture.componentRef.setInput('supplier', mockSupplier);
    fixture.detectChanges();

    expect(component.isEditing()).toBe(true);
    expect(component.form.controls.name.value).toBe('Cervejaria Ambev');
    expect(component.form.controls.contactName.value).toBe('Carlos');
    expect(component.form.controls.phone.value).toBe('11999998888');
    expect(component.form.controls.email.value).toBe('carlos@ambev.com');
    expect(component.form.controls.notes.value).toBe('Prazo 15 dias');
  });

  it('should validate invalid email format', () => {
    component.form.patchValue({ name: 'Fornecedor', email: 'email-invalido' });
    expect(component.form.invalid).toBe(true);

    component.form.patchValue({ email: 'valido@fornecedor.com' });
    expect(component.form.valid).toBe(true);
  });

  it('should emit save with clean trimmed payload', () => {
    vi.spyOn(component.save, 'emit');

    component.form.patchValue({
      name: '  Distribuidora Sul  ',
      contactName: '  João  ',
      phone: '  48999990000  ',
      email: '  JOAO@SUL.COM  ',
      notes: '  Notas gerais  ',
    });
    fixture.detectChanges();

    component.onSubmit();

    expect(component.save.emit).toHaveBeenCalledWith({
      name: 'Distribuidora Sul',
      contactName: 'João',
      phone: '48999990000',
      email: 'joao@sul.com',
      notes: 'Notas gerais',
    });
  });

  it('should emit cancel on cancel click', () => {
    vi.spyOn(component.cancel, 'emit');

    const cancelBtn = fixture.debugElement.query(By.css('[data-testid="btn-cancel-supplier"]'));
    cancelBtn.nativeElement.click();

    expect(component.cancel.emit).toHaveBeenCalled();
  });
});
