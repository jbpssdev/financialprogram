import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { LoansComponent } from './loans.component';

describe('LoansComponent', () => {
  let fixture: ComponentFixture<LoansComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoansComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LoansComponent);
    fixture.detectChanges();
  });

  it('should render PageHeaderComponent with title Empréstimos', () => {
    const pageHeader = fixture.debugElement.query(By.directive(PageHeaderComponent));
    expect(pageHeader).toBeTruthy();
    expect(fixture.nativeElement.querySelector('h1').textContent.trim()).toBe('Empréstimos');
  });

  it('should not contain fake tables or charts', () => {
    const fakeElements = fixture.nativeElement.querySelectorAll('table, canvas, [hlmCard]');
    expect(fakeElements.length).toBe(0);
  });
});
