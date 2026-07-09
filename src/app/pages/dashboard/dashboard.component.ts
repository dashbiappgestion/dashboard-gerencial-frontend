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

  private currentRange: YearRange = { from: 2026, to: 2030 };

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

  onYearRangeChange(range: YearRange): void {
    if (range.from === this.currentRange.from && range.to === this.currentRange.to) return;
    this.currentRange = range;
    this.loadData(range.from, range.to);
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
