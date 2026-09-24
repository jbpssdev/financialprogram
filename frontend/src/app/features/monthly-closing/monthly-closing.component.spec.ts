import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { MonthlyClosingComponent } from './monthly-closing.component';

describe('MonthlyClosingComponent', () => {
  let fixture: ComponentFixture<MonthlyClosingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MonthlyClosingComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MonthlyClosingComponent);
    fixture.detectChanges();
  });

  it('should render PageHeaderComponent with title Fechamento Mensal', () => {
    const pageHeader = fixture.debugElement.query(By.directive(PageHeaderComponent));
    expect(pageHeader).toBeTruthy();
    expect(fixture.nativeElement.querySelector('h1').textContent.trim()).toBe('Fechamento Mensal');
  });

  it('should not contain fake tables or charts', () => {
    const fakeElements = fixture.nativeElement.querySelectorAll('table, canvas, [hlmCard]');
    expect(fakeElements.length).toBe(0);
  });
});
