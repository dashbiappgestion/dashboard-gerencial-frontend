export type StatusColor = 'green' | 'yellow' | 'red';

export interface Periodo {
  anio: number;
  trimestre: number;
}

export interface KpiCard {
  id: string;
  label: string;
  valor: number;
  meta: number;
  suffix: string;
  decimals: number;
  pct: number;
  status: StatusColor;
}

export interface TarjetasResponse {
  periodo: Periodo;
  tarjetas: KpiCard[];
}

export interface CategoriaDesarrollo {
  categoria: string;
  promedio_meses: number;
  n_productos: number;
  pct: number;
  color: string;
}

export interface DesarrolloResponse {
  categorias: CategoriaDesarrollo[];
  promedio_global: number;
  meta: number;
  status: StatusColor;
}

export interface PuntoCapacitacion {
  anio: number;
  mes: number;
  nombre_region: string;
  horas_capacitacion: number;
  tasa_errores: number;
}

export interface CapacitacionErroresResponse {
  puntos: PuntoCapacitacion[];
  stats: { r_pearson?: number };
  meta_horas: number;
}

export interface PuntoSatisfaccion {
  anio: number;
  valor: number;
}

export interface SatisfaccionResponse {
  serie: PuntoSatisfaccion[];
  meta: number;
  ultimo_valor: number;
  status: StatusColor;
}

export interface DashboardData {
  tarjetas: TarjetasResponse;
  desarrollo: DesarrolloResponse;
  capacitacion_errores: CapacitacionErroresResponse;
  satisfaccion: SatisfaccionResponse;
}
