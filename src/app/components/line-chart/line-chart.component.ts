import {
  ChangeDetectorRef,
  Component,
  ElementRef,
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

interface LineMarker {
  anio: number;
  valor: number;
  cx: number;
  cy: number;
  status: StatusColor | null;
  delay: string;
}

@Component({
  selector: 'app-line-chart',
  standalone: true,
  templateUrl: './line-chart.component.html',
})
export class LineChartComponent {
  readonly serie = input.required<PuntoSatisfaccion[]>();
  readonly meta = input.required<number>();

  private readonly tooltip = inject(TooltipService);
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly w = 900;
  private readonly h = 320;
  private readonly left = 54;
  private readonly right = 30;
  private readonly top = 28;
  private readonly bottom = 48;

  readonly guideX = signal(0);
  readonly guideVisible = signal(false);
  readonly areaVisible = signal(false);

  @ViewChild('linePath') linePathRef!: ElementRef<SVGPathElement>;

  readonly chart = computed(() => {
    const data = this.serie();
    const n = data.length;
    if (!n) {
      return {
        lineD: '',
        areaD: '',
        metaY: 0,
        markers: [] as LineMarker[],
        labels: [] as { x: number; anio: number }[],
      };
    }

    const plotW = this.w - this.left - this.right;
    const plotH = this.h - this.top - this.bottom;
    const vals = data.map((d) => d.valor);
    const dMin = Math.min(...vals) - 5;
    const dMax = Math.max(...vals) + 5;

    const xS = (i: number) => this.left + i * (plotW / Math.max(n - 1, 1));
    const yS = (v: number) => this.top + ((dMax - v) / (dMax - dMin)) * plotH;

    const pts = data.map((d, i) => ({ x: xS(i), y: yS(d.valor) }));
    const lineD = catmullRom2bezier(pts);
    const baseline = this.h - this.bottom;
    const areaD = `${lineD} L ${pts[n - 1].x} ${baseline} L ${pts[0].x} ${baseline} Z`;
    const metaY = yS(this.meta());

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

    const labels = data.map((d, i) => ({ x: xS(i), anio: d.anio }));

    return { lineD, areaD, metaY, markers, labels };
  });

  readonly axisRightX = this.w - this.right;
  readonly axisBottomY = this.h - this.bottom;

  constructor() {
    effect(() => {
      const data = this.serie();
      if (!data.length) return;
      setTimeout(() => this.runLineAnimation(), prefersReducedMotion() ? 50 : 200);
    });
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

  onMarkerLeave(): void {
    this.guideVisible.set(false);
    this.tooltip.hide();
  }
}
