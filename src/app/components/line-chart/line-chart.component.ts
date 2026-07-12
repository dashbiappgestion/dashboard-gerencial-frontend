import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';

import { PuntoSatisfaccion, StatusColor } from '../../models/dashboard.models';
import { TooltipService } from '../../services/tooltip.service';
import { catmullRom2bezier, fmt, prefersReducedMotion } from '../../utils/format.util';
import { ForecastVariableResult } from '../../services/forecast.service';

interface LineMarker {
  anio: number;
  valor: number;
  cx: number;
  cy: number;
  status: StatusColor | null;
  delay: string;
}

interface YTick {
  y: number;
  value: number;
}

@Component({
  selector: 'app-line-chart',
  standalone: true,
  templateUrl: './line-chart.component.html',
})
export class LineChartComponent implements AfterViewInit, OnDestroy {
  readonly serie = input.required<PuntoSatisfaccion[]>();
  readonly meta = input.required<number>();
  readonly forecast = input<ForecastVariableResult | null>(null);
  readonly activeScenario = input<string>('real');

  private readonly tooltip = inject(TooltipService);
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly h = 320;
  readonly w = signal(900);

  private readonly left = 54;
  private readonly right = 30;
  private readonly top = 28;
  private readonly bottom = 48;

  readonly guideX = signal(0);
  readonly guideVisible = signal(false);
  readonly areaVisible = signal(false);

  @ViewChild('linePath') linePathRef!: ElementRef<SVGPathElement>;
  @ViewChild('chartHost') chartHostRef!: ElementRef<HTMLDivElement>;

  private resizeObserver?: ResizeObserver;

  readonly chart = computed(() => {
    const data = this.serie();
    const n = data.length;
    const w = this.w();
    const h = this.h;

    if (!n) {
      return {
        lineD: '',
        areaD: '',
        metaY: 0,
        markers: [] as LineMarker[],
        labels: [] as { x: number; anio: number }[],
        yTicks: [] as YTick[],
        forecastData: null as any,
      };
    }

    const plotW = w - this.left - this.right;
    const plotH = h - this.top - this.bottom;
    const vals = data.map((d) => d.valor);
    const dMin = Math.min(...vals, this.meta()) - 5;
    const dMax = Math.max(...vals, this.meta()) + 5;

    const f = this.forecast();
    const n_slots = n + (f ? 1 : 0);

    const xS = (i: number) => this.left + i * (plotW / Math.max(n_slots - 1, 1));
    const yS = (v: number) => this.top + ((dMax - v) / (dMax - dMin)) * plotH;

    const pts = data.map((d, i) => ({ x: xS(i), y: yS(d.valor) }));
    const lineD = catmullRom2bezier(pts);
    const baseline = h - this.bottom;
    const areaD = `${lineD} L ${pts[n - 1].x} ${baseline} L ${pts[0].x} ${baseline} Z`;
    const metaY = yS(this.meta());
    const labels = data.map((d, i) => ({ x: xS(i), anio: d.anio }));
    const yTicks = this.computeYTicks(dMin, dMax, yS);

    let forecastData = null;
    if (f) {
      const fX = xS(n);
      const fY = yS(f.punto_medio);
      const yInf = yS(f.intervalo_inferior);
      const ySup = yS(f.intervalo_superior);
      forecastData = {
        cx: fX,
        cy: fY,
        lineD: `M ${pts[n - 1].x},${pts[n - 1].y} L ${fX},${fY}`,
        bandD: `M ${pts[n - 1].x},${pts[n - 1].y} L ${fX},${ySup} L ${fX},${yInf} Z`,
        label: 'Proyección 2031',
        val: f.punto_medio,
        inf: f.intervalo_inferior,
        sup: f.intervalo_superior,
      };
      labels.push({ x: fX, anio: 2031 });
    }

    const markerDelayBase = prefersReducedMotion() ? 0 : 1100;

    const markers: LineMarker[] = data.map((d, i) => {
      let status: StatusColor | null = null;
      if (i > 0) {
        const prev = data[i - 1].valor;
        const delta = ((d.valor - prev) / prev) * 100;
        status = delta >= 1 ? 'green' : delta <= -1 ? 'red' : 'yellow';
      }
      return {
        anio: d.anio,
        valor: d.valor,
        cx: pts[i].x,
        cy: pts[i].y,
        status,
        delay: markerDelayBase + i * 55 + 'ms',
      };
    });

    return { lineD, areaD, metaY, markers, labels, forecastData, yTicks };
  });

  readonly axisRightX = computed(() => this.w() - this.right);
  readonly axisBottomY = this.h - this.bottom;
  readonly viewBox = computed(() => `0 0 ${this.w()} ${this.h}`);

  constructor() {
    effect(() => {
      const data = this.serie();
      if (!data.length) return;
      setTimeout(() => this.runLineAnimation(), prefersReducedMotion() ? 50 : 200);
    });
  }

  ngAfterViewInit(): void {
    const el = this.chartHostRef?.nativeElement;
    if (!el) return;

    const updateWidth = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const aspect = rect.width / rect.height;
        const nextW = Math.round(this.h * aspect);
        if (nextW !== this.w()) {
          this.w.set(nextW);
          const path = this.linePathRef?.nativeElement;
          if (path) {
            path.style.strokeDasharray = '';
            path.style.strokeDashoffset = '';
          }
          this.cdr.detectChanges();
        }
      }
    };

    updateWidth();
    this.resizeObserver = new ResizeObserver(() => updateWidth());
    this.resizeObserver.observe(el);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  private computeYTicks(
    dMin: number,
    dMax: number,
    yS: (v: number) => number,
    count = 5,
  ): YTick[] {
    const range = dMax - dMin;
    if (range <= 0) return [];
    const rawStep = range / (count - 1);
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const norm = rawStep / mag;
    let step: number;
    if (norm < 1.5) step = 1 * mag;
    else if (norm < 3) step = 2 * mag;
    else if (norm < 7) step = 5 * mag;
    else step = 10 * mag;

    const niceMin = Math.ceil(dMin / step) * step;
    const ticks: YTick[] = [];
    for (let v = niceMin; v <= dMax + 1e-9; v += step) {
      ticks.push({ y: yS(v), value: Math.round(v * 10) / 10 });
    }
    return ticks;
  }

  private runLineAnimation(attempt = 0): void {
    const path = this.linePathRef?.nativeElement;
    if (!path) {
      if (attempt < 10) setTimeout(() => this.runLineAnimation(attempt + 1), 50);
      return;
    }
    const length = path.getTotalLength();
    if (!prefersReducedMotion()) {
      path.style.strokeDasharray = String(length);
      path.style.strokeDashoffset = String(length);
      requestAnimationFrame(() => {
        path.style.strokeDashoffset = '0';
      });
    }
    setTimeout(
      () => {
        this.areaVisible.set(true);
        this.cdr.detectChanges();
      },
      prefersReducedMotion() ? 0 : 1150,
    );
  }

  onMarkerEnter(event: MouseEvent, marker: LineMarker, index: number): void {
    const data = this.serie();
    this.guideX.set(marker.cx);
    this.guideVisible.set(true);

    let deltaTxt = '';
    if (index > 0) {
      const prev = data[index - 1].valor;
      const delta = ((marker.valor - prev) / prev) * 100;
      const arrow = delta >= 0 ? '▲' : '▼';
      deltaTxt = `<br><span class="t-status">${arrow} ${fmt(Math.abs(delta), 1)}% vs. año anterior</span>`;
    }

    this.tooltip.show(
      event.currentTarget as Element,
      `<strong>${marker.anio}</strong>: ${fmt(marker.valor, 1)} pts${deltaTxt}`,
    );
  }

  onForecastEnter(event: MouseEvent, fd: any): void {
    this.guideX.set(fd.cx);
    this.guideVisible.set(true);
    this.tooltip.show(
      event.currentTarget as Element,
      `<strong>${fd.label} (${this.activeScenario()})</strong><br>
       Valor esperado: ${fmt(fd.val, 1)}<br>
       <small>IC 90%: [${fmt(fd.inf, 1)} - ${fmt(fd.sup, 1)}]</small>`
    );
  }

  onMarkerLeave(): void {
    this.guideVisible.set(false);
    this.tooltip.hide();
  }
}