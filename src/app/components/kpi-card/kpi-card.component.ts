import { ChangeDetectorRef, Component, effect, inject, input, output, signal } from '@angular/core';

import { KpiCard } from '../../models/dashboard.models';
import { animateCount, fmt, formatDiff, formatMeta, prefersReducedMotion } from '../../utils/format.util';
import { ForecastVariableResult } from '../../services/forecast.service';

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
  readonly yearLabel = input<number | null>(null);
  readonly forecast = input<ForecastVariableResult | null>(null);
  readonly activeScenario = input<string>('real');
  readonly cardClick = output<void>();
  private readonly cdr = inject(ChangeDetectorRef);

  readonly displayValue = signal('0');
  readonly barPct = signal(0);
  readonly forecastStatus = signal<string | null>(null);

  formatMeta = formatMeta;
  formatDiff = formatDiff;
  fmt = fmt;

  private calcStatus(value: number, meta: number, higherIsBetter: boolean): string {
    const ratio = higherIsBetter ? value / meta : meta / value;
    if (ratio >= 1) return 'green';
    if (ratio >= 0.85) return 'yellow';
    return 'red';
  }

  constructor() {
    effect(() => {
      const c = this.card();
      const f = this.forecast();
      const delay = prefersReducedMotion() ? 0 : 250 + this.index() * 130;
      const suffix = c.suffix || '';

      if (f) {
        this.displayValue.set('…');
        animateCount(f.punto_medio, c.decimals, '', suffix, delay, (text) => {
          this.displayValue.set(text);
          this.cdr.detectChanges();
        });
        const higherIsBetter = c.id !== 'tasa_errores';
        const status = this.calcStatus(f.punto_medio, c.meta, higherIsBetter);
        this.forecastStatus.set(status);
        const rawPct = higherIsBetter
          ? (f.punto_medio / c.meta) * 100
          : (c.meta / f.punto_medio) * 100;
        setTimeout(() => {
          this.barPct.set(Math.min(rawPct, 100));
          this.cdr.detectChanges();
        }, delay + 60);
      } else {
        this.forecastStatus.set(null);
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
      }
    });
  }
}