import { Component, computed, inject, input } from '@angular/core';
import { PuntoCapacitacion } from '../../models/dashboard.models';
import { TooltipService } from '../../services/tooltip.service';
import { fmt, prefersReducedMotion, statusForErrores } from '../../utils/format.util';

interface ScatterPoint extends PuntoCapacitacion {
  cx: number;
  cy: number;
  status: 'green' | 'yellow' | 'red';
  delay: string;
}

@Component({
  selector: 'app-scatter-chart',
  standalone: true,
  templateUrl: './scatter-chart.component.html',
})
export class ScatterChartComponent {
  readonly puntos = input.required<PuntoCapacitacion[]>();
  readonly meta_horas = input.required<number>();

  private readonly tooltip = inject(TooltipService);

  private readonly left = 48;
  private readonly right = 16;
  private readonly top = 16;
  private readonly bottom = 42;
  private readonly w = 480;
  private readonly h = 300;

  readonly guideMetaX = computed(() => {
    const data = this.puntos();
    if (!data.length) return 0;
    const xVals = data.map((d) => d.horas_capacitacion);
    const xMin = Math.min(...xVals) - 0.5;
    const xMax = Math.max(...xVals) + 0.5;
    const plotW = this.w - this.left - this.right;
    return this.left + ((this.meta_horas() - xMin) / (xMax - xMin)) * plotW;
  });

  readonly plotPoints = computed(() => {
    const data = this.puntos();
    if (!data.length) return [];

    const xVals = data.map((d) => d.horas_capacitacion);
    const yVals = data.map((d) => d.tasa_errores);
    const xMin = Math.min(...xVals) - 0.5;
    const xMax = Math.max(...xVals) + 0.5;
    const yMin = 0;
    const yMax = Math.max(...yVals) + 0.3;
    const plotW = this.w - this.left - this.right;
    const plotH = this.h - this.top - this.bottom;
    const step = prefersReducedMotion() ? 0 : 700 / Math.max(data.length - 1, 1);

    const xS = (v: number) => this.left + ((v - xMin) / (xMax - xMin)) * plotW;
    const yS = (v: number) => this.h - this.bottom - ((v - yMin) / (yMax - yMin)) * plotH;

    return data.map((d, i) => ({
      ...d,
      cx: xS(d.horas_capacitacion),
      cy: yS(d.tasa_errores),
      status: statusForErrores(d.tasa_errores, 1.2),
      delay: i * step + 'ms',
    })) satisfies ScatterPoint[];
  });

  readonly axisBottomY = this.h - this.bottom;
  readonly axisRightX = this.w - this.right;
  readonly axisTitleX = (this.left + this.w - this.right) / 2;

  onEnter(event: MouseEvent, pt: ScatterPoint): void {
    const target = event.currentTarget as Element;
    const mes = String(pt.mes).padStart(2, '0');
    this.tooltip.show(
      target,
      `<strong>${pt.nombre_region}</strong><br>${pt.anio}-${mes} · ${fmt(pt.horas_capacitacion, 1)} h · ${fmt(pt.tasa_errores, 2)}% errores`,
    );
  }

  onLeave(): void {
    this.tooltip.hide();
  }
}