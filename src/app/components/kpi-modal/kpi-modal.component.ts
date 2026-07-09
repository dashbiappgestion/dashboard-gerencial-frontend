import { Component, inject } from '@angular/core';

import { ScatterDetailChartComponent } from '../scatter-detail-chart/scatter-detail-chart.component';
import { TrendDetailChartComponent } from '../trend-detail-chart/trend-detail-chart.component';
import { GaussCurveChartComponent } from '../gauss-curve-chart/gauss-curve-chart.component';
import { DispersionModalData, KpiModalData, KpiStats, ProductosModalData, TrendModalData } from '../../models/modal.models';
import { ModalService } from '../../services/modal.service';
import { ForecastService } from '../../services/forecast.service';
import { fmt } from '../../utils/format.util';

@Component({
  selector: 'app-kpi-modal',
  standalone: true,
  imports: [TrendDetailChartComponent, ScatterDetailChartComponent, GaussCurveChartComponent],
  templateUrl: './kpi-modal.component.html',
})
export class KpiModalComponent {
  readonly modal = inject(ModalService);
  readonly forecastService = inject(ForecastService);

  isTrend(data: KpiModalData): data is TrendModalData {
    return data.tipo === 'tendencia';
  }

  isDispersion(data: KpiModalData): data is DispersionModalData {
    return data.tipo === 'dispersion';
  }

  isProductos(data: KpiModalData): data is ProductosModalData {
    return data.tipo === 'productos';
  }

  close(): void {
    this.modal.close();
  }

  onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close();
  }

  onRegionChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.modal.updateFilters({ region: value || null });
  }

  onAnioChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.modal.updateFilters({ anio: value ? Number(value) : null });
  }

  onTrimestreChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.modal.updateFilters({ trimestre: value ? Number(value) : null });
  }

  onMesChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.modal.updateFilters({ mes: value ? Number(value) : null });
  }

  onCategoriaChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.modal.updateFilters({ categoria: value || null });
  }

  outlierCount(serie: { outlier?: boolean }[]): number {
    return serie.filter((p) => p.outlier).length;
  }

  isGaussVisible(data: KpiModalData): boolean {
    return ['desarrollo', 'capacitacion_errores', 'satisfaccion'].includes(data.kpi_id);
  }

  getValores(data: KpiModalData): number[] {
    if (this.isTrend(data) || this.isProductos(data)) {
      return data.serie.map((p) => p.valor);
    }
    if (this.isDispersion(data)) {
      return data.puntos.map((p) => p.tasa_errores);
    }
    return [];
  }

  get currentSeason(): string {
    const month = new Date().getMonth(); // 0-indexed (0=Jan, 11=Dec)
    if (month >= 2 && month <= 4) return 'Primavera'; // Mar, Apr, May
    if (month >= 5 && month <= 7) return 'Verano'; // Jun, Jul, Aug
    if (month >= 8 && month <= 10) return 'Otoño'; // Sep, Oct, Nov
    return 'Invierno'; // Dec, Jan, Feb
  }

  getIndicatorsList(stats: KpiStats | null): string[] {
    if (!stats) return [];
    const list: string[] = [];
    if (stats.error_estandar != null) list.push(`margen de error ±${fmt(stats.error_estandar, 2)}`);
    if (stats.desviacion_estandar != null) list.push(`desviación estándar de ${fmt(stats.desviacion_estandar, 2)}`);
    if (stats.r_pearson != null) list.push(`correlación (r de Pearson) de ${fmt(stats.r_pearson, 2)}`);
    if (stats.pendiente_tendencia != null) list.push(`tendencia lineal de ${fmt(stats.pendiente_tendencia, 2)} por periodo`);
    return list;
  }
}
