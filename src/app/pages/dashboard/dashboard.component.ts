import { ChangeDetectorRef, Component, inject, signal } from '@angular/core';

import { ChartTooltipComponent } from '../../components/chart-tooltip/chart-tooltip.component';
import { DonutChartComponent } from '../../components/donut-chart/donut-chart.component';
import { KpiCardComponent } from '../../components/kpi-card/kpi-card.component';
import { KpiModalComponent } from '../../components/kpi-modal/kpi-modal.component';
import { LineChartComponent } from '../../components/line-chart/line-chart.component';
import { ScatterChartComponent } from '../../components/scatter-chart/scatter-chart.component';
import { YearRangeSliderComponent, YearRange } from '../../components/year-range-slider/year-range-slider.component';
import { ScenarioSelectorComponent } from '../../components/scenario-selector/scenario-selector.component';
import { DashboardData } from '../../models/dashboard.models';
import { KpiModalId } from '../../models/modal.models';
import { DashboardService } from '../../services/dashboard.service';
import { ModalService } from '../../services/modal.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    KpiCardComponent,
    DonutChartComponent,
    ScatterChartComponent,
    LineChartComponent,
    ChartTooltipComponent,
    KpiModalComponent,
    YearRangeSliderComponent,
    ScenarioSelectorComponent,
  ],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  private readonly dashboardService = inject(DashboardService);
  private readonly modalService = inject(ModalService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly data = signal<DashboardData | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly dimmed = signal(false);
  readonly blurred = signal(false);
  readonly cardBlurs = signal<number[]>([0, 0, 0, 0]);
  readonly panelBlurs = signal<{ donut: number; scatter: number; line: number }>({
    donut: 0,
    scatter: 0,
    line: 0,
  });

  private currentRange: YearRange = { from: 2026, to: 2030 };
  private pendingRange: YearRange | null = null;
  private debounceId: ReturnType<typeof setTimeout> | null = null;
  private readonly DEBOUNCE_MS = 1500;
  private readonly FADE_MS = 380;
  private readonly BLUR_MS = 420;
  private readonly BLUR_MIN_PX = 4;
  private readonly BLUR_MAX_PX = 10;

  constructor() {
    this.loadData(2026, 2030);
  }

  private loadData(anioInicio: number, anioFin: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.dashboardService.getDashboard(anioInicio, anioFin).subscribe({
      next: (response) => {
        this.data.set(response);
        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: (err) => {
        const detail = err?.error?.detail ?? err?.message ?? 'Error desconocido';
        this.error.set(
          `${detail}. ¿Backend corriendo en http://localhost:8000? Ejecuta: uvicorn app.main:app --reload`,
        );
        this.loading.set(false);
        this.cdr.detectChanges();
      },
    });
  }

  private randomBlur(): number {
    return Math.round((this.BLUR_MIN_PX + Math.random() * (this.BLUR_MAX_PX - this.BLUR_MIN_PX)) * 10) / 10;
  }

  private refreshData(anioInicio: number, anioFin: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.cardBlurs.set([this.randomBlur(), this.randomBlur(), this.randomBlur(), this.randomBlur()]);
    this.panelBlurs.set({
      donut: this.randomBlur(),
      scatter: this.randomBlur(),
      line: this.randomBlur(),
    });
    this.dimmed.set(true);
    this.blurred.set(true);
    this.cdr.detectChanges();

    this.dashboardService.getDashboard(anioInicio, anioFin).subscribe({
      next: (response) => {
        this.dimmed.set(false);
        this.cdr.detectChanges();
        setTimeout(() => {
          this.data.set(response);
          this.blurred.set(false);
          this.cdr.detectChanges();
          setTimeout(() => {
            this.loading.set(false);
            this.cdr.detectChanges();
          }, this.BLUR_MS);
        }, this.FADE_MS);
      },
      error: (err) => {
        const detail = err?.error?.detail ?? err?.message ?? 'Error desconocido';
        this.error.set(
          `${detail}. ¿Backend corriendo en http://localhost:8000? Ejecuta: uvicorn app.main:app --reload`,
        );
        this.dimmed.set(false);
        this.blurred.set(false);
        this.loading.set(false);
        this.cdr.detectChanges();
      },
    });
  }

  onYearRangeChange(range: YearRange): void {
    if (range.from === this.currentRange.from && range.to === this.currentRange.to) {
      this.pendingRange = null;
      if (this.debounceId) {
        clearTimeout(this.debounceId);
        this.debounceId = null;
      }
      return;
    }

    this.pendingRange = range;

    if (this.debounceId) {
      clearTimeout(this.debounceId);
    }
    this.debounceId = setTimeout(() => {
      this.debounceId = null;
      const finalRange = this.pendingRange;
      if (!finalRange) return;
      this.pendingRange = null;
      this.currentRange = finalRange;
      this.refreshData(finalRange.from, finalRange.to);
    }, this.DEBOUNCE_MS);
  }

  openCardModal(kpiId: string): void {
    this.modalService.open(kpiId as KpiModalId);
  }

  openDesarrolloModal(categoria: string): void {
    this.modalService.open('desarrollo', { categoria });
  }

  openScatterModal(): void {
    this.modalService.open('capacitacion_errores');
  }

  openSatisfaccionModal(): void {
    this.modalService.open('satisfaccion');
  }
}