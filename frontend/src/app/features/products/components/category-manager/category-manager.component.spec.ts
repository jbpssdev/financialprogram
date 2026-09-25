import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIcons } from '@ng-icons/core';
import {
  lucideCheck,
  lucidePencil,
  lucidePlus,
  lucidePower,
  lucideX,
} from '@ng-icons/lucide';
import { createDummyCategory } from '../../products.testing';
import { CategoryManagerComponent } from './category-manager.component';

describe('CategoryManagerComponent', () => {
  let component: CategoryManagerComponent;
  let fixture: ComponentFixture<CategoryManagerComponent>;

  const dummyCategories = [
    createDummyCategory({ id: 'cat-1', name: 'Bebidas', isActive: true }),
    createDummyCategory({ id: 'cat-2', name: 'Petiscos', isActive: false }),
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryManagerComponent],
      providers: [
        provideIcons({
          lucidePlus,
          lucidePencil,
          lucideCheck,
          lucideX,
          lucidePower,
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryManagerComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('categories', dummyCategories);
    fixture.detectChanges();
  });

  it('should render the list of categories', () => {
    const rows = fixture.nativeElement.querySelectorAll('[data-testid^="category-row-"]');
    expect(rows.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Bebidas');
    expect(fixture.nativeElement.textContent).toContain('Petiscos');
  });

  it('should validate empty category name on submit', () => {
    component.newCategoryName.set('');
    component.onSubmitCreate();
    fixture.detectChanges();

    expect(component.formError()).toContain('obrigatório');
  });

  it('should emit createCategory with trimmed name and description', () => {
    let emittedDto: any = null;
    component.createCategory.subscribe((dto) => (emittedDto = dto));

    component.newCategoryName.set('  Sobremesas  ');
    component.newCategoryDesc.set('  Doces e tortas  ');
    component.onSubmitCreate();

    expect(emittedDto).toEqual({
      name: 'Sobremesas',
      description: 'Doces e tortas',
    });
    expect(component.newCategoryName()).toBe('');
  });

  it('should emit toggleActive when status button is clicked', () => {
    let toggledCat: any = null;
    component.toggleActive.subscribe((cat) => (toggledCat = cat));

    const statusBtn = fixture.nativeElement.querySelector(
      '[data-testid="category-row-cat-1"] [data-testid="btn-toggle-category-status"]',
    );
    expect(statusBtn.textContent.trim()).toBe('Inativar');
    statusBtn.click();

    expect(toggledCat).toEqual(dummyCategories[0]);
  });
});
