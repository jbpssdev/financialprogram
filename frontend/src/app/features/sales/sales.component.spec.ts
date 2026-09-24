import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SalesComponent } from './sales.component';

describe('SalesComponent', () => {
  let fixture: ComponentFixture<SalesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SalesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SalesComponent);
    fixture.detectChanges();
  });

  it('should render PageHeaderComponent with title Vendas', () => {
    const pageHeader = fixture.debugElement.query(By.directive(PageHeaderComponent));
    expect(pageHeader).toBeTruthy();
    expect(fixture.nativeElement.querySelector('h1').textContent.trim()).toBe('Vendas');
  });

  it('should not contain fake tables or charts', () => {
    const fakeElements = fixture.nativeElement.querySelectorAll('table, canvas, [hlmCard]');
    expect(fakeElements.length).toBe(0);
  });
});
