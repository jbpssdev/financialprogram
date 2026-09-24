import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-border">
      <div class="space-y-1">
        <h1 class="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {{ title() }}
        </h1>
        @if (description() && description()!.trim().length > 0) {
          <p class="text-sm text-muted-foreground">
            {{ description() }}
          </p>
        }
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <ng-content />
      </div>
    </header>
  `,
})
export class PageHeaderComponent {
  public readonly title = input.required<string>();
  public readonly description = input<string>();
}
