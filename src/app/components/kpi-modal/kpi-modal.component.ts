import { Component, inject } from '@angular/core';

import { ScatterDetailChartComponent } from '../scatter-detail-chart/scatter-detail-chart.component';
import { TrendDetailChartComponent } from '../trend-detail-chart/trend-detail-chart.component';
import { GaussCurveChartComponent } from '../gauss-curve-chart/gauss-curve-chart.component';
import { DispersionModalData, KpiModalData, KpiStats, ProductosModalData, TrendModalData } from '../../models/modal.models';
import { ModalService } from '../../services/modal.service';
import { ForecastService } from '../../services/forecast.service';
import { fmt, linearRegression } from '../../utils/format.util';

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
  esKpiPrincipal(kpiId: string): boolean {
    return ['margen_neto', 'roi', 'nps', 'paises'].includes(kpiId);
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
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'Primavera';
    if (month >= 5 && month <= 7) return 'Verano';
    if (month >= 8 && month <= 10) return 'Otoño';
    return 'Invierno';
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

  getMetaPredictionText(data: KpiModalData): string | null {
    const status = this.modal.currentStatus();
    if (status === 'green') return null;

    let lastVal = 0;
    if (data.tipo === 'tendencia' || data.tipo === 'productos') {
      if (!data.serie.length) return null;
      lastVal = data.serie[data.serie.length - 1].valor;
    } else if (data.tipo === 'dispersion') {
      if (!data.puntos.length) return null;
      lastVal = data.puntos[data.puntos.length - 1].horas_capacitacion;
    }
    const meta = data.config.meta;
    const lowerIsBetter = data.kpi_id === 'desarrollo';

    if (status == null) {
      const alreadyReached = lowerIsBetter ? lastVal <= meta : lastVal >= meta;
      if (alreadyReached) return null;
    }

    const f = this.forecastService.forecastData();
    if (f) {
      let predictedValue: number | undefined;
      if (data.kpi_id === 'desarrollo') {
        const cat = (data as ProductosModalData).categoria;
        predictedValue = f['tiempo_desarrollo']?.[cat]?.punto_medio;
      } else if (data.kpi_id === 'capacitacion_errores') {
        predictedValue = f['horas_capacitacion']?.punto_medio;
      } else {
        predictedValue = (f as any)[data.kpi_id]?.punto_medio;
      }
      if (predictedValue !== undefined) {
        const reachedIn2031 = lowerIsBetter ? predictedValue <= meta : predictedValue >= meta;
        if (reachedIn2031) return '2031';
      }
    }

    let m: number;
    let b: number;
    let targetYear: number;

    if (this.isProductos(data)) {
      const reg = linearRegression(data.serie.map((p) => ({ x: p.x, y: p.valor })));
      if (!reg || reg.slope === 0) return null;
      m = reg.slope;
      b = reg.intercept;
      targetYear = (meta - b) / m;
    } else if (this.isDispersion(data)) {
      const reg = linearRegression(
        data.puntos.map((p) => ({ x: p.anio + (p.mes - 1) / 12, y: p.horas_capacitacion })),
      );
      if (!reg || reg.slope === 0) return null;
      m = reg.slope;
      b = reg.intercept;
      targetYear = (meta - b) / m;
    } else {
      if (!data.stats || data.stats.pendiente_tendencia == null || data.stats.intercepto_tendencia == null) {
        return null;
      }
      m = data.stats.pendiente_tendencia;
      b = data.stats.intercepto_tendencia;
      if (m === 0) return null;
      const targetX = (meta - b) / m;
      if (['margen_neto', 'nps', 'roi'].includes(data.kpi_id)) {
        targetYear = targetX / 4;
      } else if (['satisfaccion', 'paises'].includes(data.kpi_id)) {
        targetYear = targetX;
      } else {
        return null;
      }
    }

    if (lowerIsBetter && m > 0) return null;
    if (!lowerIsBetter && m < 0) return null;

    const finalYear = Math.ceil(targetYear);
    if (finalYear <= 2030) return 'finales del 2030';
    if (finalYear > 2050) return 'después de 2050';
    return finalYear.toString();
  }
}
