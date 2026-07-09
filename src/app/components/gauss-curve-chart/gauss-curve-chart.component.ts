import { Component, computed, inject, input } from '@angular/core';
import { KpiStats } from '../../models/modal.models';
import { TooltipService } from '../../services/tooltip.service';
import { fmt } from '../../utils/format.util';

@Component({
  selector: 'app-gauss-curve-chart',
  standalone: true,
  templateUrl: './gauss-curve-chart.component.html',
})
export class GaussCurveChartComponent {
  readonly valores = input.required<number[]>();
  readonly stats = input<KpiStats | null>(null);
  readonly label = input<string>('Valor');

  private readonly tooltip = inject(TooltipService);

  private readonly w = 560;
  private readonly h = 160;
  private readonly padL = 16;
  private readonly padR = 16;
  private readonly padT = 16;
  private readonly padB = 36;

  readonly chart = computed(() => {
    const vals = this.valores();
    const st = this.stats();
    if (!vals.length || !st?.promedio || !st?.desviacion_estandar) return null;

    const mu = st.promedio;
    const sigma = st.desviacion_estandar;
    if (sigma <= 0) return null;

    const plotW = this.w - this.padL - this.padR;
    const plotH = this.h - this.padT - this.padB;

    const xLo = mu - 3.8 * sigma;
    const xHi = mu + 3.8 * sigma;
    const xRange = xHi - xLo;

    const xS = (v: number) => this.padL + ((v - xLo) / xRange) * plotW;
    const gaussY = (v: number) => {
      const exp = Math.exp(-0.5 * ((v - mu) / sigma) ** 2);
      return exp / (sigma * Math.sqrt(2 * Math.PI));
    };

    const N = 90;
    const step = xRange / N;
    const curvePts: { x: number; y: number; raw: number }[] = [];
    for (let i = 0; i <= N; i++) {
      const raw = xLo + i * step;
      curvePts.push({ x: xS(raw), y: gaussY(raw), raw });
    }

    const yMax = Math.max(...curvePts.map((p) => p.y));
    const yS = (gy: number) => this.padT + plotH - (gy / yMax) * plotH;

    const axisY = this.padT + plotH;
    const curveD =
      curvePts.length > 1
        ? 'M ' + curvePts.map((p) => `${p.x.toFixed(1)},${yS(p.y).toFixed(1)}`).join(' L ')
        : '';

    const q1 = st.q1 ?? mu - sigma;
    const q3 = st.q3 ?? mu + sigma;
    const mediana = st.mediana ?? mu;
    const limInf = st.limite_inferior;
    const limSup = st.limite_superior;

    const iqrAreaPts = curvePts.filter((p) => p.raw >= q1 && p.raw <= q3);
    let iqrD = '';
    if (iqrAreaPts.length >= 2) {
      const top = iqrAreaPts.map((p) => `${p.x.toFixed(1)},${yS(p.y).toFixed(1)}`).join(' L ');
      const x0 = xS(q1).toFixed(1);
      const x1 = xS(q3).toFixed(1);
      iqrD = `M ${x0},${axisY} L ${top} L ${x1},${axisY} Z`;
    }

    const medianX = xS(mediana);

    const rugPts = vals.map((v) => {
      const isOutlier =
        limInf != null && limSup != null ? v < limInf || v > limSup : false;
      const cx = Math.max(this.padL, Math.min(this.padL + plotW, xS(v)));
      return { v, cx, isOutlier };
    });

    return { curveD, iqrD, medianX, rugPts, axisY, yS, plotW, mu, sigma };
  });

  readonly axisRightX = this.w - this.padR;
  readonly axisBottomY = this.h - this.padB;

  onRugEnter(event: MouseEvent, pt: { v: number; isOutlier: boolean }): void {
    const label = this.label();
    const tag = pt.isOutlier ? '<br><span class="t-status">Valor atípico</span>' : '';
    this.tooltip.show(
      event.currentTarget as Element,
      `<strong>${label}</strong>: ${fmt(pt.v, 2)}${tag}`,
    );
  }

  onRugLeave(): void {
    this.tooltip.hide();
  }
}
