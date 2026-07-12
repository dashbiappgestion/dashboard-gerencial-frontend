import { CapacitacionErroresResponse, DesarrolloResponse, KpiCard, PuntoSatisfaccion } from '../models/dashboard.models';
import { ForecastVariableResult } from '../services/forecast.service';

export function fmt(n: number, decimals: number): string {
  return Number(n).toLocaleString('es-PE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatMeta(card: KpiCard): string {
  if (card.id === 'paises') return fmt(card.meta, 0) + ' países';
  if (card.id === 'nps') return fmt(card.meta, 0) + ' pts';
  return fmt(card.meta, card.decimals) + card.suffix;
}

export function formatDiff(card: KpiCard, forecast?: ForecastVariableResult | null): string {
  const valorActual = forecast ? forecast.punto_medio : card.valor;
  const diferencia = valorActual - card.meta;
  const signo = diferencia >= 0 ? '+' : '-';
  return `${signo}${fmt(Math.abs(diferencia), card.decimals)}${card.suffix}`;
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function animateCount(
  end: number,
  decimals: number,
  prefix: string,
  suffix: string,
  delay: number,
  onUpdate: (text: string) => void,
): void {
  const duration = prefersReducedMotion() ? 1 : 1700;
  setTimeout(() => {
    let start: number | null = null;
    const tick = (ts: number) => {
      if (start === null) start = ts;
      const t = Math.min((ts - start) / duration, 1);
      const current = end * easeOutCubic(t);
      onUpdate(prefix + fmt(current, decimals) + suffix);
      if (t < 1) requestAnimationFrame(tick);
      else onUpdate(prefix + fmt(end, decimals) + suffix);
    };
    requestAnimationFrame(tick);
  }, delay);
}

export function statusForErrores(tasa: number, meta: number): 'green' | 'yellow' | 'red' {
  return tasa <= meta ? 'green' : tasa <= meta * 1.3 ? 'yellow' : 'red';
}

export interface ChartPoint {
  x: number;
  y: number;
}

export function catmullRom2bezier(pts: ChartPoint[]): string {
  let d = '';
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    if (i === 0) d += `M ${p1.x} ${p1.y} `;
    d += `C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y} `;
  }
  return d;
}

export interface RegressionResult {
  slope: number;
  intercept: number;
}
export function linearRegression(points: { x: number; y: number }[]): RegressionResult | null {
  const n = points.length;
  if (n < 2) return null;
  const meanX = points.reduce((s, p) => s + p.x, 0) / n;
  const meanY = points.reduce((s, p) => s + p.y, 0) / n;
  const varX = points.reduce((s, p) => s + (p.x - meanX) ** 2, 0);
  if (varX === 0) return null;
  const cov = points.reduce((s, p) => s + (p.x - meanX) * (p.y - meanY), 0);
  const slope = cov / varX;
  const intercept = meanY - slope * meanX;
  return { slope, intercept };
}

export function buildDonutTitle(d: Pick<DesarrolloResponse, 'promedio_global' | 'meta'> | null | undefined): string {
  const FALLBACK = 'Tiempo de Desarrollo de Productos en Meses';
  if (!d || !d.meta) return FALLBACK;
  const diff = d.promedio_global - d.meta;
  if (Math.abs(diff) < 0.05) {
    return `El desarrollo de productos está exactamente en la meta de ${fmt(d.meta, 0)} meses`;
  }
  const pct = Math.round((Math.abs(diff) / d.meta) * 100);
  return diff > 0
    ? `El desarrollo de productos está ${pct}% sobre la meta de ${fmt(d.meta, 0)} meses`
    : `El desarrollo de productos está ${pct}% bajo la meta de ${fmt(d.meta, 0)} meses`;
}

export function buildScatterTitle(stats: CapacitacionErroresResponse['stats'] | null | undefined): string {
  const FALLBACK = 'Capacitación vs. Tasa de Errores';
  const r = stats?.r_pearson;
  if (r == null || Number.isNaN(r)) return FALLBACK;
  const rTxt = fmt(r, 2);
  return r < 0
    ? `Más horas de capacitación reducen los errores (r = ${rTxt})`
    : `Más horas de capacitación no reducen los errores (r = ${rTxt})`;
}

export function buildLineTitle(serie: PuntoSatisfaccion[] | null | undefined): string {
  const FALLBACK = 'Índice de Satisfacción Laboral';
  if (!serie || serie.length < 2) return FALLBACK;
  const first = serie[0];
  const last = serie[serie.length - 1];
  const diff = last.valor - first.valor;
  if (Math.abs(diff) < 0.05) {
    return `La satisfacción laboral se mantuvo estable desde ${first.anio}`;
  }
  const pct = first.valor !== 0 ? Math.round((Math.abs(diff) / first.valor) * 100) : 0;
  return diff > 0
    ? `La satisfacción laboral subió ${pct}% desde ${first.anio}`
    : `La satisfacción laboral bajó ${pct}% desde ${first.anio}`;
}