import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBanknote,
  lucideCalendarCheck,
  lucideChevronDown,
  lucideChevronRight,
  lucideHandCoins,
  lucideLandmark,
  lucideLayoutDashboard,
  lucideLogOut,
  lucideMenu,
  lucidePackage,
  lucidePackageOpen,
  lucideShoppingBag,
  lucideShoppingCart,
  lucideTrendingDown,
  lucideTrendingUp,
  lucideTruck,
  lucideX,
} from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { HlmToaster } from '../../shared/ui/sonner/src';
import { filter } from 'rxjs/operators';
import { AuthStore } from '../../core/auth';
import { APP_NAVIGATION, NavItem } from './app-navigation';

@Component({
  selector: 'app-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    HlmButton,
    HlmSheetImports,
    HlmToaster,
    NgIcon,
  ],
  providers: [
    provideIcons({
      lucideBanknote,
      lucideCalendarCheck,
      lucideChevronDown,
      lucideChevronRight,
      lucideHandCoins,
      lucideLandmark,
      lucideLayoutDashboard,
      lucideLogOut,
      lucideMenu,
      lucidePackage,
      lucidePackageOpen,
      lucideShoppingBag,
      lucideShoppingCart,
      lucideTrendingDown,
      lucideTrendingUp,
      lucideTruck,
      lucideX,
    }),
  ],
  template: `
    <div class="min-h-screen flex flex-col bg-background text-foreground">
      <!-- ============================================================ -->
      <!-- DESKTOP FIXED SIDEBAR                                         -->
      <!-- ============================================================ -->
      <aside
        class="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30 border-r border-border bg-card"
        aria-label="Navegação principal desktop"
      >
        <!-- Wordmark / Brand Header -->
        <div class="h-16 flex items-center px-6 border-b border-border">
          <a
            routerLink="/dashboard"
            class="flex items-center gap-2.5 font-bold text-lg tracking-tight text-foreground hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          >
            <div class="size-7 rounded bg-primary text-primary-foreground flex items-center justify-center font-mono text-sm font-semibold">
              FP
            </div>
            <span class="font-sans font-bold">FinancialProgram</span>
          </a>
        </div>

        <!-- Navigation Menu -->
        <nav class="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Menu principal">
          @for (item of navigationItems; track item.id) {
            @if (!item.children) {
              <!-- Single Item -->
              <a
                [routerLink]="item.path"
                routerLinkActive="bg-accent text-accent-foreground font-semibold"
                [routerLinkActiveOptions]="{ exact: !!item.exact }"
                class="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                [attr.data-testid]="'nav-' + item.id"
              >
                <ng-icon [name]="item.icon" class="size-4 shrink-0 text-muted-foreground" />
                <span>{{ item.label }}</span>
              </a>
            } @else {
              <!-- Parent Item with Collapsible Children (Financeiro) -->
              <div class="space-y-1">
                <button
                  type="button"
                  (click)="toggleFinanceExpanded()"
                  [attr.aria-expanded]="financeExpanded()"
                  class="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  [ngClass]="{
                    'text-foreground font-semibold bg-accent/30': isFinanceActive(),
                    'text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground': !isFinanceActive()
                  }"
                  [attr.data-testid]="'nav-' + item.id"
                >
                  <div class="flex items-center gap-3">
                    <ng-icon [name]="item.icon" class="size-4 shrink-0 text-muted-foreground" />
                    <span>{{ item.label }}</span>
                  </div>
                  <ng-icon
                    [name]="financeExpanded() ? 'lucideChevronDown' : 'lucideChevronRight'"
                    class="size-3.5 shrink-0 text-muted-foreground transition-transform"
                  />
                </button>

                @if (financeExpanded()) {
                  <div class="pl-7 pr-1 space-y-1 pt-0.5" role="region" [attr.aria-label]="item.label">
                    @for (child of item.children; track child.id) {
                      <a
                        [routerLink]="child.path"
                        routerLinkActive="bg-accent text-accent-foreground font-semibold"
                        class="flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        [attr.data-testid]="'nav-' + child.id"
                      >
                        <ng-icon [name]="child.icon" class="size-3.5 shrink-0 text-muted-foreground" />
                        <span>{{ child.label }}</span>
                      </a>
                    }
                  </div>
                }
              </div>
            }
          }
        </nav>

        <!-- User Profile & Logout Section (Bottom of Sidebar) -->
        <div class="p-3 border-t border-border bg-card/60">
          <div class="flex items-center gap-3 px-2 py-2 mb-2">
            <div
              class="size-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-medium text-xs border border-border shrink-0 select-none"
              data-testid="user-avatar-desktop"
            >
              {{ userInitials() }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-xs font-medium text-foreground truncate" data-testid="user-name-desktop">
                {{ authStore.user()?.name || 'Usuário' }}
              </p>
              <p class="text-[11px] text-muted-foreground truncate" data-testid="user-email-desktop">
                {{ authStore.user()?.email || '' }}
              </p>
            </div>
          </div>
          <button
            hlmBtn
            variant="outline"
            size="sm"
            (click)="onLogout()"
            [disabled]="authStore.loading()"
            class="w-full justify-center gap-2 text-xs"
            data-testid="logout-button-desktop"
          >
            <ng-icon name="lucideLogOut" class="size-3.5" />
            <span>Sair do Sistema</span>
          </button>
        </div>
      </aside>

      <!-- ============================================================ -->
      <!-- TOPBAR / HEADER (Mobile + Desktop Topbar)                    -->
      <!-- ============================================================ -->
      <header
        class="sticky top-0 z-20 md:pl-64 border-b border-border bg-card/95 backdrop-blur-xs"
      >
        <div class="h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <!-- Left: Mobile Menu Trigger + Context Title -->
          <div class="flex items-center gap-3">
            <!-- Mobile Menu Trigger via Spartan Sheet -->
            <div class="md:hidden">
              <hlm-sheet side="left">
                <button
                  hlmBtn
                  variant="ghost"
                  size="icon-sm"
                  hlmSheetTrigger
                  aria-label="Abrir menu de navegação"
                  data-testid="mobile-menu-trigger"
                >
                  <ng-icon name="lucideMenu" class="size-5" />
                </button>

                <hlm-sheet-content *hlmSheetPortal="let ctx" class="w-72 p-0 flex flex-col justify-between">
                  <div>
                    <!-- Mobile Drawer Header -->
                    <div class="h-16 flex items-center px-6 border-b border-border">
                      <div class="flex items-center gap-2.5 font-bold text-base tracking-tight text-foreground">
                        <div class="size-7 rounded bg-primary text-primary-foreground flex items-center justify-center font-mono text-xs font-semibold">
                          FP
                        </div>
                        <span>FinancialProgram</span>
                      </div>
                    </div>

                    <!-- Mobile Navigation List -->
                    <nav class="px-3 py-4 space-y-1 overflow-y-auto" aria-label="Menu móvel">
                      @for (item of navigationItems; track item.id) {
                        @if (!item.children) {
                          <a
                            [routerLink]="item.path"
                            (click)="ctx.close()"
                            routerLinkActive="bg-accent text-accent-foreground font-semibold"
                            [routerLinkActiveOptions]="{ exact: !!item.exact }"
                            class="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground transition-colors"
                            [attr.data-testid]="'mobile-nav-' + item.id"
                          >
                            <ng-icon [name]="item.icon" class="size-4 shrink-0 text-muted-foreground" />
                            <span>{{ item.label }}</span>
                          </a>
                        } @else {
                          <div class="space-y-1">
                            <button
                              type="button"
                              (click)="toggleFinanceExpanded()"
                              [attr.aria-expanded]="financeExpanded()"
                              class="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground transition-colors"
                              [ngClass]="{ 'text-foreground font-semibold bg-accent/30': isFinanceActive() }"
                            >
                              <div class="flex items-center gap-3">
                                <ng-icon [name]="item.icon" class="size-4 shrink-0 text-muted-foreground" />
                                <span>{{ item.label }}</span>
                              </div>
                              <ng-icon
                                [name]="financeExpanded() ? 'lucideChevronDown' : 'lucideChevronRight'"
                                class="size-3.5 shrink-0 text-muted-foreground"
                              />
                            </button>

                            @if (financeExpanded()) {
                              <div class="pl-7 pr-1 space-y-1 pt-0.5">
                                @for (child of item.children; track child.id) {
                                  <a
                                    [routerLink]="child.path"
                                    (click)="ctx.close()"
                                    routerLinkActive="bg-accent text-accent-foreground font-semibold"
                                    class="flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground transition-colors"
                                    [attr.data-testid]="'mobile-nav-' + child.id"
                                  >
                                    <ng-icon [name]="child.icon" class="size-3.5 shrink-0 text-muted-foreground" />
                                    <span>{{ child.label }}</span>
                                  </a>
                                }
                              </div>
                            }
                          </div>
                        }
                      }
                    </nav>
                  </div>

                  <!-- Mobile Drawer Footer with User & Logout -->
                  <div class="p-4 border-t border-border bg-card/60">
                    <div class="flex items-center gap-3 mb-3">
                      <div class="size-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-medium text-xs border border-border shrink-0 select-none">
                        {{ userInitials() }}
                      </div>
                      <div class="min-w-0 flex-1">
                        <p class="text-xs font-medium text-foreground truncate" data-testid="user-name-mobile">
                          {{ authStore.user()?.name || 'Usuário' }}
                        </p>
                        <p class="text-[11px] text-muted-foreground truncate">
                          {{ authStore.user()?.email || '' }}
                        </p>
                      </div>
                    </div>
                    <button
                      hlmBtn
                      variant="outline"
                      size="sm"
                      (click)="onLogout(); ctx.close()"
                      [disabled]="authStore.loading()"
                      class="w-full justify-center gap-2 text-xs"
                      data-testid="logout-button-mobile"
                    >
                      <ng-icon name="lucideLogOut" class="size-3.5" />
                      <span>Sair do Sistema</span>
                    </button>
                  </div>
                </hlm-sheet-content>
              </hlm-sheet>
            </div>

            <!-- Context Title -->
            <span class="text-sm font-medium text-muted-foreground">
              {{ currentPageTitle() }}
            </span>
          </div>

          <!-- Right: User Identification & Quick Action -->
          <div class="flex items-center gap-3">
            <span class="hidden sm:inline-block text-xs font-medium text-foreground" data-testid="user-name-topbar">
              {{ authStore.user()?.name }}
            </span>
            <div
              class="size-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-medium text-xs border border-border select-none"
              data-testid="user-avatar-topbar"
              [title]="authStore.user()?.email || ''"
            >
              {{ userInitials() }}
            </div>
            <button
              hlmBtn
              variant="ghost"
              size="icon-sm"
              (click)="onLogout()"
              [disabled]="authStore.loading()"
              aria-label="Sair do sistema"
              class="hidden sm:flex text-muted-foreground hover:text-foreground"
              data-testid="logout-button-topbar"
            >
              <ng-icon name="lucideLogOut" class="size-4" />
            </button>
          </div>
        </div>
      </header>

      <!-- ============================================================ -->
      <!-- MAIN CONTENT VIEWPORT                                         -->
      <!-- ============================================================ -->
      <main class="flex-1 md:pl-64 w-full min-w-0">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 min-w-0">
          <router-outlet />
        </div>
      </main>


      <!-- Authenticated Global Feedback Toast -->
      <hlm-toaster position="top-right" richColors />
    </div>
  `,
})
export class AppShellComponent {
  protected readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly navigationItems: readonly NavItem[] = APP_NAVIGATION;
  private readonly currentUrl = signal<string>(this.router.url);

  protected readonly financeExpanded = signal<boolean>(true);

  protected readonly isFinanceActive = computed(() =>
    this.currentUrl().startsWith('/finance'),
  );

  protected readonly userInitials = computed(() => {
    const name = this.authStore.user()?.name?.trim();
    if (!name) return 'FP';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  });

  protected readonly currentPageTitle = computed(() => {
    const url = this.currentUrl().split('?')[0];
    for (const item of this.navigationItems) {
      if (item.path && item.path === url) return item.label;
      if (item.children) {
        for (const child of item.children) {
          if (child.path === url) return `${item.label} / ${child.label}`;
        }
      }
    }
    return 'FinancialProgram';
  });

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((e) => {
        this.currentUrl.set(e.urlAfterRedirects || e.url);
        if (this.currentUrl().startsWith('/finance')) {
          this.financeExpanded.set(true);
        }
      });

    if (this.currentUrl().startsWith('/finance')) {
      this.financeExpanded.set(true);
    }
  }

  protected toggleFinanceExpanded(): void {
    this.financeExpanded.update((val) => !val);
  }

  protected onLogout(): void {
    this.authStore.logout().subscribe();
  }
}
