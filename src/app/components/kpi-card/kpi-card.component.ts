import { ChangeDetectorRef, Component, effect, inject, input, output, signal } from '@angular/core';

import { KpiCard } from '../../models/dashboard.models';
import { animateCount, fmt, formatMeta, prefersReducedMotion } from '../../utils/format.util';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  templateUrl: './kpi-card.component.html',
})
export class KpiCardComponent {
  readonly card = input.required<KpiCard>();
  readonly index = input.required<number>();
  readonly blurPx = input<number>(0);
  readonly blurred = input<boolean>(false);
  readonly cardClick = output<void>();
  private readonly cdr = inject(ChangeDetectorRef);

  readonly displayValue = signal('0');
  readonly barPct = signal(0);

  formatMeta = formatMeta;
  fmt = fmt;

  constructor() {
    effect(() => {
      const c = this.card();
      const delay = prefersReducedMotion() ? 0 : 250 + this.index() * 130;
      const suffix = c.suffix || '';

      this.displayValue.set('0' + suffix);
      this.barPct.set(0);

      animateCount(c.valor, c.decimals, '', suffix, delay, (text) => {
        this.displayValue.set(text);
        this.cdr.detectChanges();
      });

      setTimeout(() => {
        this.barPct.set(Math.min(c.pct, 100));
        this.cdr.detectChanges();
      }, delay + 60);
    });
  }
}