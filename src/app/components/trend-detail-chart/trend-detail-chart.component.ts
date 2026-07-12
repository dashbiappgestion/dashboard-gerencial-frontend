import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { KpiStats, TrendPoint } from '../../models/modal.models';
import { TooltipService } from '../../services/tooltip.service';
import { catmullRom2bezier, fmt } from '../../utils/format.util';
import { ForecastVariableResult } from '../../services/forecast.service';

@Component({
  selector: 'app-trend-detail-chart',
  standalone: true,
  templateUrl: './trend-detail-chart.component.html',
})
export class TrendDetailChartComponent {
  readonly serie = input.required<TrendPoint[]>();
  readonly stats = input<KpiStats | null>(null);
  readonly meta = input.required<number>();
  readonly forecast = input<ForecastVariableResult | null>(null);
  readonly activeScenario = input<string>('real');
  readonly rotarEtiquetas = input<boolean>(false);

  private readonly tooltip = inject(TooltipService);
  private readonly hostRef = inject(ElementRef<HTMLElement>);

  private readonly size = signal({ w: 640, h: 280 });
  readonly viewW = computed(() => this.size().w);
  readonly viewH = computed(() => this.size().h);

  private readonly left = 60;
  private readonly right = 24;
  private readonly top = 24;
  private readonly bottom = 70;

  readonly axisLeftX = this.left;
  readonly axisTopY = this.top;
  readonly axisBottomY = computed(() => this.viewH() - this.bottom);
  readonly axisRightX = computed(() => this.viewW() - this.right);

  constructor() {
    const ro = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (box && box.width > 4 && box.height > 4) {
        this.size.set({ w: box.width, h: box.height });
      }
    });
    ro.observe(this.hostRef.nativeElement);
    inject(DestroyRef).onDestroy(() => ro.disconnect());
  }

  readonly chart = computed(() => {
    const data = this.serie();
    const st = this.stats();
    const n = data.length;
    if (!n) return null;

    const plotW = this.viewW() - this.left - this.right;
    const plotH = this.viewH() - this.top - this.bottom;
    const vals = data.map((d) => d.valor);
    const allVals = [...vals];
    if (st?.q1 != null) allVals.push(st.q1);
    if (st?.q3 != null) allVals.push(st.q3);
    if (st?.limite_inferior != null) allVals.push(st.limite_inferior);
    if (st?.limite_superior != null) allVals.push(st.limite_superior);
    allVals.push(this.meta());
    const dMin = Math.min(...allVals) - 2;
    const dMax = Math.max(...allVals) + 2;

    const f = this.forecast();
    const n_slots = n + (f ? 1 : 0);

    const xS = (i: number) => this.left + i * (plotW / Math.max(n_slots - 1, 1));
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

    const metaRef = { key: 'meta', val: this.meta(), label: 'Meta', y: yS(this.meta()) };
    const medianY = st?.mediana != null ? yS(st.mediana) : null;

    const iqrBox = (st?.q1 != null && st?.q3 != null)
      ? {
        x: this.left,
        y: yS(st.q3),
        width: plotW,
        height: Math.abs(yS(st.q1) - yS(st.q3)),
        yQ1: yS(st.q1),
        yQ3: yS(st.q3),
        yMin: st.limite_inferior != null ? yS(st.limite_inferior) : null,
        yMax: st.limite_superior != null ? yS(st.limite_superior) : null,
        labelQ1: st.q1,
        labelQ3: st.q3,
        labelMin: st.limite_inferior,
        labelMax: st.limite_superior,
      }
      : null;

    let forecastData = null;
    let labels = data.map((d, i) => ({ x: xS(i), label: d.label }));

    if (f) {
      const fX = xS(n);
      const fY = yS(f.punto_medio);
      const yInf = yS(f.intervalo_inferior);
      const ySup = yS(f.intervalo_superior);
      forecastData = {
        cx: fX,
        cy: fY,
        lineD: `M ${pts[n - 1].cx},${pts[n - 1].cy} L ${fX},${fY}`,
        bandD: `M ${pts[n - 1].cx},${pts[n - 1].cy} L ${fX},${yInf} L ${fX},${ySup} Z`,
        label: 'Proyección 2031',
        val: f.punto_medio,
        inf: f.intervalo_inferior,
        sup: f.intervalo_superior,
        advertencia: f.advertencia,
      };
      labels.push({ x: fX, label: '2031' });
    }

    const yTicks = this.buildYTicks(dMin, dMax, yS);

    return { pts, lineD, bandD, trendLineD, metaRef, medianY, iqrBox, metaY: yS(this.meta()), dMin, dMax, forecastData, labels, yTicks };
  });

  private buildYTicks(min: number, max: number, yS: (v: number) => number): { val: number; y: number }[] {
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
    const ticks: { val: number; y: number }[] = [];
    for (let v = niceMin; v <= max + step * 0.001; v += step) {
      ticks.push({ val: Math.round(v * 100) / 100, y: yS(v) });
    }
    return ticks;
  }

  onEnter(event: MouseEvent, pt: TrendPoint & { cx: number; cy: number }): void {
    const outlier = pt.outlier ? '<br><span class="t-status">Valor atípico</span>' : '';
    this.tooltip.show(
      event.currentTarget as Element,
      `<strong>${pt.label}</strong>: ${fmt(pt.valor, 1)}${outlier}`,
    );
  }

  onForecastEnter(event: MouseEvent, fd: any): void {
    const target = event.currentTarget as Element;
    let adv = '';
    if (fd.advertencia) {
      adv = `<br><span class="t-status" style="color:var(--c-red); font-size:0.8rem">${fd.advertencia}</span>`;
    }
    this.tooltip.show(
      target,
      `<strong>Proyección 2031 (${this.activeScenario()})</strong><br>
       Valor esperado: ${fmt(fd.val, 1)}<br>
       <small>IC 90%: [${fmt(fd.inf, 1)} - ${fmt(fd.sup, 1)}]</small>${adv}`
    );
  }

  onLeave(): void {
    this.tooltip.hide();
  }
}