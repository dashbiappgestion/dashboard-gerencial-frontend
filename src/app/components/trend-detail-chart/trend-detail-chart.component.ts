import { Component, computed, inject, input } from '@angular/core';

import { KpiStats, TrendPoint } from '../../models/modal.models';
import { TooltipService } from '../../services/tooltip.service';
import { catmullRom2bezier, fmt } from '../../utils/format.util';

@Component({
  selector: 'app-trend-detail-chart',
  standalone: true,
  templateUrl: './trend-detail-chart.component.html',
})
export class TrendDetailChartComponent {
  readonly serie = input.required<TrendPoint[]>();
  readonly stats = input<KpiStats | null>(null);
  readonly meta = input.required<number>();

  private readonly tooltip = inject(TooltipService);

  private readonly w = 640;
  private readonly h = 280;
  private readonly left = 48;
  private readonly right = 24;
  private readonly top = 24;
  private readonly bottom = 44;

  readonly chart = computed(() => {
    const data = this.serie();
    const st = this.stats();
    const n = data.length;
    if (!n) return null;

    const plotW = this.w - this.left - this.right;
    const plotH = this.h - this.top - this.bottom;
    const vals = data.map((d) => d.valor);
    const allVals = [...vals];
    if (st?.q1 != null) allVals.push(st.q1);
    if (st?.q3 != null) allVals.push(st.q3);
    allVals.push(this.meta());
    const dMin = Math.min(...allVals) - 2;
    const dMax = Math.max(...allVals) + 2;

    const xS = (i: number) => this.left + i * (plotW / Math.max(n - 1, 1));
    const yS = (v: number) => this.top + ((dMax - v) / (dMax - dMin)) * plotH;

    const pts = data.map((d, i) => ({ ...d, cx: xS(i), cy: yS(d.valor) }));
    const lineD = catmullRom2bezier(pts.map((p) => ({ x: p.cx, y: p.cy })));

    const err = st?.error_estandar ?? 0;
    const slope = st?.pendiente_tendencia ?? 0;
    const intercept = st?.intercepto_tendencia ?? 0;

    const trendPts = data.map((d, i) => {
      const ty = intercept + slope * d.x;
      return { cx: xS(i), cy: yS(ty), cyUpper: yS(ty + err), cyLower: yS(ty - err) };
    });

    let bandD = '';
    if (trendPts.length) {
      const upper = trendPts.map((p) => `${p.cx},${p.cyUpper}`).join(' L ');
      const lower = [...trendPts].reverse().map((p) => `${p.cx},${p.cyLower}`).join(' L ');
      bandD = `M ${upper} L ${lower} Z`;
    }

    const trendLineD =
      trendPts.length >= 2
        ? `M ${trendPts[0].cx} ${trendPts[0].cy} L ${trendPts[trendPts.length - 1].cx} ${trendPts[trendPts.length - 1].cy}`
        : '';

    const refLines = [
      { key: 'q1', val: st?.q1, label: 'Q1' },
      { key: 'mediana', val: st?.mediana, label: 'Mediana' },
      { key: 'q3', val: st?.q3, label: 'Q3' },
      { key: 'meta', val: this.meta(), label: 'Meta' },
    ]
      .filter((r) => r.val != null)
      .map((r) => ({ ...r, y: yS(r.val as number) }));

    return { pts, lineD, bandD, trendLineD, refLines, metaY: yS(this.meta()), dMin, dMax };
  });

  readonly axisBottomY = this.h - this.bottom;
  readonly axisRightX = this.w - this.right;

  onEnter(event: MouseEvent, pt: TrendPoint & { cx: number; cy: number }): void {
    const outlier = pt.outlier ? '<br><span class="t-status">Valor atípico</span>' : '';
    this.tooltip.show(
      event.currentTarget as Element,
      `<strong>${pt.label}</strong>: ${fmt(pt.valor, 1)}${outlier}`,
    );
  }

  onLeave(): void {
    this.tooltip.hide();
  }
}
