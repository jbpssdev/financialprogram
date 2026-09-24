import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render PageHeaderComponent with title and description', () => {
    const pageHeaderDebugEl = fixture.debugElement.query(By.directive(PageHeaderComponent));
    expect(pageHeaderDebugEl).toBeTruthy();

    const titleEl = fixture.nativeElement.querySelector('h1');
    expect(titleEl).toBeTruthy();
    expect(titleEl.textContent.trim()).toBe('Dashboard');

    const descEl = fixture.nativeElement.querySelector('p');
    expect(descEl).toBeTruthy();
    expect(descEl.textContent.trim()).toBe(
      'Visão geral e acompanhamento das operações financeiras e contábeis.',
    );
  });

  it('should contain purely structural layout without mock data, fake cards or charts', () => {
    // Assert no cards, kpis, tables or charts are rendered in this structural foundation phase
    const kpiCards = fixture.nativeElement.querySelectorAll('[hlmCard], table, canvas, svg.recharts');
    expect(kpiCards.length).toBe(0);
  });
});
