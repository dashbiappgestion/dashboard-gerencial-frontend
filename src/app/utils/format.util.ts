import { KpiCard } from '../models/dashboard.models';

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
