import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PageHeaderComponent } from './page-header.component';

@Component({
  standalone: true,
  imports: [PageHeaderComponent],
  template: `
    <app-page-header [title]="title()" [description]="description()">
      <button id="action-btn">Ação de Teste</button>
    </app-page-header>
  `,
})
class TestHostComponent {
  title = signal('Título de Teste');
  description = signal<string | undefined>('Descrição de Teste');
}

describe('PageHeaderComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
  });

  it('deve renderizar o título obrigatório', () => {
    const titleEl = fixture.debugElement.query(By.css('h1'));
    expect(titleEl).toBeTruthy();
    expect(titleEl.nativeElement.textContent.trim()).toBe('Título de Teste');
  });

  it('deve renderizar a descrição opcional quando informada', () => {
    const descEl = fixture.debugElement.query(By.css('p'));
    expect(descEl).toBeTruthy();
    expect(descEl.nativeElement.textContent.trim()).toBe('Descrição de Teste');
  });

  it('não deve renderizar parágrafo quando descrição for vazia ou indefinida', () => {
    fixture.componentInstance.description.set(undefined);
    fixture.detectChanges();

    const descEl = fixture.debugElement.query(By.css('p'));
    expect(descEl).toBeFalsy();
  });

  it('deve projetar elementos de ação no slot', () => {
    const btnEl = fixture.debugElement.query(By.css('#action-btn'));
    expect(btnEl).toBeTruthy();
    expect(btnEl.nativeElement.textContent.trim()).toBe('Ação de Teste');
  });
});
