import { HttpClient, HttpParams } from '@angular/common/http';
import { ApplicationRef, Injectable, inject, signal } from '@angular/core';
import { KpiModalData, KpiModalId, ModalFilters } from '../models/modal.models';
import { StatusColor } from '../models/dashboard.models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ModalService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;
  private readonly appRef = inject(ApplicationRef);

  readonly visible = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly data = signal<KpiModalData | null>(null);
  readonly filters = signal<ModalFilters>({});
  readonly currentStatus = signal<StatusColor | null>(null);
  private currentKpiId: KpiModalId | null = null;
  private yearRange: { anio_inicio: number; anio_fin: number } | null = null;

  setYearRange(anio_inicio: number, anio_fin: number): void {
    this.yearRange = { anio_inicio, anio_fin };
  }

  open(kpiId: KpiModalId, initial: Partial<ModalFilters> = {}, status: StatusColor | null = null): void {
    this.currentKpiId = kpiId;
    this.filters.set({ region: null, anio: null, trimestre: null, mes: null, categoria: null, ...initial });
    this.currentStatus.set(status);
    this.visible.set(true);
    this.load();
  }
  close(): void {
    this.visible.set(false);
    this.data.set(null);
    this.error.set(null);
    this.currentStatus.set(null);
    this.currentKpiId = null;
  }

  updateFilters(partial: Partial<ModalFilters>): void {
    this.filters.update((f) => ({ ...f, ...partial }));
    this.load();
  }

  private load(): void {
    if (!this.currentKpiId) return;
    this.loading.set(true);
    this.error.set(null);

    const f = this.filters();
    let params = new HttpParams();
    if (f.region) params = params.set('region', f.region);
    if (f.anio != null) params = params.set('anio', f.anio);
    if (f.trimestre != null) params = params.set('trimestre', f.trimestre);
    if (f.mes != null) params = params.set('mes', f.mes);
    if (f.categoria) params = params.set('categoria', f.categoria);

    if (this.currentKpiId === 'desarrollo' && this.yearRange) {
      params = params.set('anio_inicio', this.yearRange.anio_inicio);
      params = params.set('anio_fin', this.yearRange.anio_fin);
    }

    this.http
      .get<KpiModalData>(`${this.baseUrl}/kpis/${this.currentKpiId}/modal`, { params })
      .subscribe({
        next: (response) => {
          this.data.set(response);
          this.loading.set(false);
          this.appRef.tick();
        },
        error: (err) => {
          this.error.set(err?.error?.detail ?? err?.message ?? 'Error al cargar el detalle');
          this.loading.set(false);
          this.appRef.tick();
        },
      });
  }
}