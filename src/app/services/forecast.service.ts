import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { environment } from '../../environments/environment';

export type Scenario = 'real' | 'positivista' | 'pesimista' | 'personalizado';

export interface CustomParams {
  tasa_cambio: number;
  confianza: 'baja' | 'media' | 'alta';
}

export interface ForecastParams {
  margen_neto?: CustomParams;
  roi?: CustomParams;
  nps?: CustomParams;
  paises?: CustomParams;
  satisfaccion?: CustomParams;
  horas_capacitacion?: CustomParams;
  tasa_errores?: CustomParams;
  tiempo_desarrollo?: Record<string, CustomParams>;
}

export interface ForecastVariableResult {
  punto_medio: number;
  intervalo_inferior: number;
  intervalo_superior: number;
  n_datos_usados: number;
  advertencia?: string | null;
}

export interface ForecastResponse {
  [key: string]: any;
  margen_neto?: ForecastVariableResult;
  roi?: ForecastVariableResult;
  nps?: ForecastVariableResult;
  paises?: ForecastVariableResult;
  satisfaccion?: ForecastVariableResult;
  horas_capacitacion?: ForecastVariableResult;
  tasa_errores?: ForecastVariableResult;
  tiempo_desarrollo?: Record<string, ForecastVariableResult>;
}

@Injectable({ providedIn: 'root' })
export class ForecastService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  readonly activeScenario = signal<Scenario>('real');
  readonly customParams = signal<ForecastParams | null>(null);
  readonly forecastData = signal<ForecastResponse | null>(null);
  readonly loading = signal<boolean>(false);
  readonly paramsModalOpen = signal<boolean>(false);

  openParamsModal(): void { this.paramsModalOpen.set(true); }
  closeParamsModal(): void { this.paramsModalOpen.set(false); }

  setScenario(scenario: Scenario, region?: string, params?: ForecastParams): void {
    this.activeScenario.set(scenario);
    if (params) {
      this.customParams.set(params);
    }

    if (scenario === 'real') {
      this.forecastData.set(null);
      return;
    }

    this.loading.set(true);
    const body = {
      escenario: scenario,
      region: region ?? null,
      parametros_personalizados: this.customParams()
    };

    this.http.post<ForecastResponse>(`${this.baseUrl}/forecast/2031`, body).subscribe({
      next: (res) => {
        this.forecastData.set(res);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error fetching forecast:', err);
        this.forecastData.set(null);
        this.loading.set(false);
      }
    });
  }
}
