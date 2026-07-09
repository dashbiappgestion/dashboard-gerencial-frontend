import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { DashboardData } from '../models/dashboard.models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getDashboard(anioInicio?: number, anioFin?: number): Observable<DashboardData> {
    let params = new HttpParams();
    if (anioInicio !== undefined) params = params.set('anio_inicio', anioInicio);
    if (anioFin !== undefined) params = params.set('anio_fin', anioFin);
    return this.http.get<DashboardData>(`${this.baseUrl}/dashboard`, { params });
  }
}
