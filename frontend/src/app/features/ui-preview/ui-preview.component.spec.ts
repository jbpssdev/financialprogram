import { TestBed } from '@angular/core/testing';
import { UiPreviewComponent } from './ui-preview.component';

describe('UiPreviewComponent', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UiPreviewComponent],
    }).compileComponents();
  });

  it('should create the ui-preview component', () => {
    const fixture = TestBed.createComponent(UiPreviewComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should display the development showcase banner', () => {
    const fixture = TestBed.createComponent(UiPreviewComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const banner = compiled.querySelector('[aria-label="Aviso de Desenvolvimento"]');
    expect(banner).toBeTruthy();
    expect(banner?.textContent).toContain('Ambiente de Desenvolvimento');
  });

  it('should render the financial indicators section and table', () => {
    const fixture = TestBed.createComponent(UiPreviewComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('#kpi-section-title')?.textContent).toContain('Indicadores Chave');
    expect(compiled.querySelector('table')).toBeTruthy();
  });

  it('should toggle dark mode state', () => {
    const fixture = TestBed.createComponent(UiPreviewComponent);
    const component = fixture.componentInstance;
    expect(component['isDark']()).toBe(false);

    component['toggleDarkMode']();
    expect(component['isDark']()).toBe(true);

    component['toggleDarkMode']();
    expect(component['isDark']()).toBe(false);
  });
});
