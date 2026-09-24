import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { IncomesComponent } from './incomes.component';

describe('IncomesComponent', () => {
  let fixture: ComponentFixture<IncomesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IncomesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(IncomesComponent);
    fixture.detectChanges();
  });

  it('should render PageHeaderComponent with title Receitas', () => {
    const pageHeader = fixture.debugElement.query(By.directive(PageHeaderComponent));
    expect(pageHeader).toBeTruthy();
    expect(fixture.nativeElement.querySelector('h1').textContent.trim()).toBe('Receitas');
  });

  it('should not contain fake tables or charts', () => {
    const fakeElements = fixture.nativeElement.querySelectorAll('table, canvas, [hlmCard]');
    expect(fakeElements.length).toBe(0);
  });
});
