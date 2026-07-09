import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomParams, ForecastParams, ForecastService } from '../../services/forecast.service';

export interface ParamRow {
  key: string;
  label: string;
  tasa_cambio: number;
  confianza: 'baja' | 'media' | 'alta';
}

@Component({
  selector: 'app-forecast-params-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './forecast-params-modal.component.html',
})
export class ForecastParamsModalComponent {
  private readonly forecastService = inject(ForecastService);
  readonly visible = this.forecastService.paramsModalOpen;

  // Using a flat list for UI simplicity, mapping back to ForecastParams on save
  readonly rows = signal<ParamRow[]>([
    { key: 'margen_neto', label: 'Margen Neto', tasa_cambio: 0, confianza: 'media' },
    { key: 'roi', label: 'ROI', tasa_cambio: 0, confianza: 'media' },
    { key: 'nps', label: 'NPS', tasa_cambio: 0, confianza: 'media' },
    { key: 'paises', label: 'Países Activos', tasa_cambio: 0, confianza: 'media' },
    { key: 'satisfaccion', label: 'Satisfacción Laboral', tasa_cambio: 0, confianza: 'media' },
    { key: 'horas_capacitacion', label: 'Horas de Capacitación', tasa_cambio: 0, confianza: 'media' },
    { key: 'tasa_errores', label: 'Tasa de Errores', tasa_cambio: 0, confianza: 'media' },
  ]);

  close(): void {
    this.forecastService.closeParamsModal();
  }

  onOverlayClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-overlay')) {
      this.close();
    }
  }

  apply(): void {
    const p: ForecastParams = {};
    for (const r of this.rows()) {
      (p as any)[r.key] = { tasa_cambio: r.tasa_cambio, confianza: r.confianza };
    }
    this.forecastService.setScenario('personalizado', undefined, p);
    this.close();
  }
}
