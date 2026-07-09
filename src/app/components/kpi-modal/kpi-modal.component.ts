import { Component, inject } from '@angular/core';

import { ScatterDetailChartComponent } from '../scatter-detail-chart/scatter-detail-chart.component';
import { TrendDetailChartComponent } from '../trend-detail-chart/trend-detail-chart.component';
import { DispersionModalData, KpiModalData, ProductosModalData, TrendModalData } from '../../models/modal.models';
import { ModalService } from '../../services/modal.service';

@Component({
  selector: 'app-kpi-modal',
  standalone: true,
  imports: [TrendDetailChartComponent, ScatterDetailChartComponent],
  templateUrl: './kpi-modal.component.html',
})
export class KpiModalComponent {
  readonly modal = inject(ModalService);

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
}
