export type KpiModalId =
  | 'margen_neto'
  | 'roi'
  | 'nps'
  | 'paises'
  | 'desarrollo'
  | 'capacitacion_errores'
  | 'satisfaccion';

export interface ModalFilters {
  region?: string | null;
  anio?: number | null;
  trimestre?: number | null;
  mes?: number | null;
  categoria?: string | null;
}

export interface KpiModalConfig {
  titulo: string;
  frecuencia: 'trimestral' | 'anual' | 'mensual' | 'evento';
  region: boolean;
  region_msg?: string;
  meta: number;
  suffix: string;
  decimals: number;
}

export interface KpiStats {
  n_periodos?: number;
  promedio?: number;
  desviacion_estandar?: number;
  error_estandar?: number;
  q1?: number;
  mediana?: number;
  q3?: number;
  limite_inferior?: number;
  limite_superior?: number;
  pendiente_tendencia?: number;
  intercepto_tendencia?: number;
  r_pearson?: number;
  pendiente?: number;
  intercepto?: number;
}

export interface TrendPoint {
  label: string;
  valor: number;
  x: number;
  anio?: number;
  trimestre?: number;
  mes?: number;
  outlier?: boolean;
}

export interface TrendModalData {
  kpi_id: KpiModalId;
  tipo: 'tendencia';
  config: KpiModalConfig;
  filtros: {
    anios: number[];
    trimestres: number[];
    meses: number[];
    regiones: string[];
  };
  filtros_activos: ModalFilters;
  serie: TrendPoint[];
  stats: KpiStats | null;
  meta: number;
}

export interface DispersionModalData {
  kpi_id: KpiModalId;
  tipo: 'dispersion';
  config: KpiModalConfig;
  filtros: TrendModalData['filtros'];
  filtros_activos: ModalFilters;
  puntos: {
    anio: number;
    mes: number;
    nombre_region: string;
    horas_capacitacion: number;
    tasa_errores: number;
    outlier: boolean;
  }[];
  stats: KpiStats;
  regresion: { x: number; y: number }[];
  banda: { x: number; y_upper: number; y_lower: number }[];
  meta: number;
}

export interface ProductosModalData {
  kpi_id: KpiModalId;
  tipo: 'productos';
  config: KpiModalConfig;
  filtros: TrendModalData['filtros'];
  filtros_activos: ModalFilters;
  serie: TrendPoint[];
  stats: KpiStats | null;
  meta: number;
  categoria: string;
  categorias: string[];
}

export type KpiModalData = TrendModalData | DispersionModalData | ProductosModalData;
