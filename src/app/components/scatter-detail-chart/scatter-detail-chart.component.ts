import { Component, computed, inject, input } from '@angular/core';
import { DispersionModalData } from '../../models/modal.models';
import { TooltipService } from '../../services/tooltip.service';
import { fmt } from '../../utils/format.util';

@Component({
  selector: 'app-scatter-detail-chart',
  standalone: true,
  templateUrl: './scatter-detail-chart.component.html',
})
export class ScatterDetailChartComponent {
  readonly modalData = input.required<DispersionModalData>();

  private readonly tooltip = inject(TooltipService);

  private readonly w = 640;
  private readonly h = 300;
  private readonly left = 56;
  private readonly right = 24;
  private readonly top = 20;
  private readonly bottom = 56;

  readonly chart = computed(() => {
    const d = this.modalData();
    const pts = d.puntos;
    if (!pts.length) return null;

    const plotW = this.w - this.left - this.right;
    const plotH = this.h - this.top - this.bottom;

    const xVals = pts.map((p) => p.horas_capacitacion);
    const yVals = pts.map((p) => p.tasa_errores);
    const regY = d.regresion.map((r) => r.y);
    const bandY = d.banda.flatMap((b) => [b.y_upper, b.y_lower]);

    const xMin = Math.min(...xVals) - 0.3;
    const xMax = Math.max(...xVals) + 0.3;
    const yMin = 0;
    const yMax = Math.max(...yVals, ...regY, ...bandY) + 0.2;

    const xS = (v: number) => this.left + ((v - xMin) / (xMax - xMin)) * plotW;
    const yS = (v: number) => this.h - this.bottom - ((v - yMin) / (yMax - yMin)) * plotH;

    const points = pts.map((p) => ({
      ...p,
      cx: xS(p.horas_capacitacion),
      cy: yS(p.tasa_errores),
    }));

    const regLine =
      d.regresion.length >= 2
        ? `M ${xS(d.regresion[0].x)} ${yS(d.regresion[0].y)} L ${xS(d.regresion[1].x)} ${yS(d.regresion[1].y)}`
        : '';

    let bandD = '';
    if (d.banda.length >= 2) {
      const upper = d.banda.map((b) => `${xS(b.x)},${yS(b.y_upper)}`).join(' L ');
      const lower = [...d.banda].reverse().map((b) => `${xS(b.x)},${yS(b.y_lower)}`).join(' L ');
      bandD = `M ${upper} L ${lower} Z`;
    }

    const metaX = xS(d.meta);
    const xTicks = this.buildTicks(xMin, xMax, xS, 'x');
    const yTicks = this.buildTicks(yMin, yMax, yS, 'y');

    return { points, regLine, bandD, r: d.stats.r_pearson, metaX, xTicks, yTicks };
  });

  readonly axisBottomY = this.h - this.bottom;
  readonly axisRightX = this.w - this.right;
  readonly axisLeftX = this.left;
  readonly axisTopY = this.top;
  readonly axisTitleX = (this.left + this.w - this.right) / 2;

  private buildTicks(
    min: number,
    max: number,
    scale: (v: number) => number,
    axis: 'x' | 'y',
  ): { val: number; pos: number }[] {
    const targetCount = 5;
    const rawStep = (max - min) / targetCount || 1;
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const candidates = [1, 2, 2.5, 5, 10];
    let step = candidates[candidates.length - 1] * mag;
    for (const c of candidates) {
      if (rawStep <= c * mag) {
        step = c * mag;
        break;
      }
    }
    const niceMin = Math.ceil(min / step) * step;
    const ticks: { val: number; pos: number }[] = [];
    for (let v = niceMin; v <= max + step * 0.001; v += step) {
      ticks.push({ val: Math.round(v * 100) / 100, pos: scale(v) });
    }
    return ticks;
  }

  onEnter(event: MouseEvent, pt: { nombre_region: string; anio: number; mes: number; horas_capacitacion: number; tasa_errores: number; outlier: boolean }): void {
    const mes = String(pt.mes).padStart(2, '0');
    const outlier = pt.outlier ? '<br><span class="t-status">Outlier (residual)</span>' : '';
    this.tooltip.show(
      event.currentTarget as Element,
      `<strong>${pt.nombre_region}</strong><br>${pt.anio}-${mes} · ${fmt(pt.horas_capacitacion, 1)} h · ${fmt(pt.tasa_errores, 2)}%${outlier}`,
    );
  }

  onLeave(): void {
    this.tooltip.hide();
  }
}