import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SuppliersComponent } from './suppliers.component';

describe('SuppliersComponent', () => {
  let fixture: ComponentFixture<SuppliersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuppliersComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SuppliersComponent);
    fixture.detectChanges();
  });

  it('should render PageHeaderComponent with title Fornecedores', () => {
    const pageHeader = fixture.debugElement.query(By.directive(PageHeaderComponent));
    expect(pageHeader).toBeTruthy();
    expect(fixture.nativeElement.querySelector('h1').textContent.trim()).toBe('Fornecedores');
  });

  it('should not contain fake tables or charts', () => {
    const fakeElements = fixture.nativeElement.querySelectorAll('table, canvas, [hlmCard]');
    expect(fakeElements.length).toBe(0);
  });
});
