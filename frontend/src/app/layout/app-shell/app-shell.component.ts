import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLogOut } from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { AuthStore } from '../../core/auth';

@Component({
  selector: 'app-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, HlmButton, NgIcon],
  providers: [
    provideIcons({
      lucideLogOut,
    }),
  ],
  template: `
    <div class="min-h-screen flex flex-col bg-background text-foreground">
      <header class="border-b border-border bg-card">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div class="flex items-center gap-4">
            <span class="text-lg font-bold tracking-tight text-foreground font-sans">
              FinancialProgram
            </span>
          </div>
          <div class="flex items-center gap-4">
            @if (authStore.user(); as user) {
              <span class="text-sm text-muted-foreground font-medium" data-testid="user-name">
                {{ user.name }}
              </span>
            }
            <button
              hlmBtn
              variant="outline"
              size="sm"
              (click)="onLogout()"
              [disabled]="authStore.loading()"
              class="gap-1.5"
              data-testid="logout-button"
            >
              <ng-icon name="lucideLogOut" class="size-4" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </header>

      <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <router-outlet />
      </main>
    </div>
  `,
})
export class AppShellComponent {
  protected readonly authStore = inject(AuthStore);

  protected onLogout(): void {
    this.authStore.logout().subscribe();
  }
}
