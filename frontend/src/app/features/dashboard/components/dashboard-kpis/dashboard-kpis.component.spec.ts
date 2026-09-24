import { ComponentFixture, TestBed } from '@angular/core/testing';
import { createDummySummary } from '../../dashboard.testing';
import { DashboardKpisComponent } from './dashboard-kpis.component';

describe('DashboardKpisComponent', () => {
  let fixture: ComponentFixture<DashboardKpisComponent>;
  let component: DashboardKpisComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardKpisComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardKpisComponent);
    component = fixture.componentInstance;
  });

  it('should render all 4 main KPIs with formatted currency and comparison percentages', () => {
    fixture.componentRef.setInput('summary', createDummySummary());
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('R$ 15.000,00');
    expect(text).toContain('+25.00%');
    expect(text).toContain('R$ 9.000,00');
    expect(text).toContain('+20.00%');
    expect(text).toContain('R$ 6.300,00');
    expect(text).toContain('+26.00%');
    expect(text).toContain('R$ 3.700,00');
    expect(text).toContain('Sem base de comparação');
  });
});
