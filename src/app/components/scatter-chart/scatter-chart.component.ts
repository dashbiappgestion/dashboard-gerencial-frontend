import { Component, computed, inject, input } from '@angular/core';
import { PuntoCapacitacion } from '../../models/dashboard.models';
import { TooltipService } from '../../services/tooltip.service';
import { fmt, prefersReducedMotion, statusForErrores } from '../../utils/format.util';
import { ForecastVariableResult } from '../../services/forecast.service';

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
  readonly forecastHoras = input<ForecastVariableResult | null>(null);
  readonly forecastErrores = input<ForecastVariableResult | null>(null);
  readonly activeScenario = input<string>('real');

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

  readonly forecastPlot = computed(() => {
    const data = this.puntos();
    const fh = this.forecastHoras();
    const fe = this.forecastErrores();
    if (!data.length || !fh || !fe) return null;

    const xVals = data.map((d) => d.horas_capacitacion);
    const yVals = data.map((d) => d.tasa_errores);
    const xMin = Math.min(...xVals) - 0.5;
    const xMax = Math.max(...xVals, fh.intervalo_superior) + 0.5;
    const yMin = 0;
    const yMax = Math.max(...yVals, fe.intervalo_superior) + 0.3;
    const plotW = this.w - this.left - this.right;
    const plotH = this.h - this.top - this.bottom;

    const xS = (v: number) => this.left + ((v - xMin) / (xMax - xMin)) * plotW;
    const yS = (v: number) => this.h - this.bottom - ((v - yMin) / (yMax - yMin)) * plotH;

    return {
      cx: xS(fh.punto_medio),
      cy: yS(fe.punto_medio),
      xInf: xS(fh.intervalo_inferior),
      xSup: xS(fh.intervalo_superior),
      yInf: yS(fe.intervalo_inferior),
      ySup: yS(fe.intervalo_superior),
      horas: fh.punto_medio,
      errores: fe.punto_medio,
      hInf: fh.intervalo_inferior,
      hSup: fh.intervalo_superior,
      eInf: fe.intervalo_inferior,
      eSup: fe.intervalo_superior,
    };
  });

readonly axisTicks = computed(() => {
    const data = this.puntos();
    if (!data.length) {
      return { xTicks: [] as { val: number; pos: number }[], yTicks: [] as { val: number; pos: number }[] };
    }

    const xVals = data.map((d) => d.horas_capacitacion);
    const yVals = data.map((d) => d.tasa_errores);
    const xMin = Math.min(...xVals) - 0.5;
    const xMax = Math.max(...xVals) + 0.5;
    const yMin = 0;
    const yMax = Math.max(...yVals) + 0.3;
    const plotW = this.w - this.left - this.right;
    const plotH = this.h - this.top - this.bottom;

    const xS = (v: number) => this.left + ((v - xMin) / (xMax - xMin)) * plotW;
    const yS = (v: number) => this.h - this.bottom - ((v - yMin) / (yMax - yMin)) * plotH;

    return {
      xTicks: this.buildTicks(xMin, xMax, xS),
      yTicks: this.buildTicks(yMin, yMax, yS),
    };
  });

  private buildTicks(min: number, max: number, scale: (v: number) => number): { val: number; pos: number }[] {
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

  onForecastEnter(event: MouseEvent, fd: any): void {
    const target = event.currentTarget as Element;
    this.tooltip.show(
      target,
      `<strong>Proyección 2031 (${this.activeScenario()})</strong><br>
       Horas: ${fmt(fd.horas, 1)} <small>[${fmt(fd.hInf, 1)} - ${fmt(fd.hSup, 1)}]</small><br>
       Errores: ${fmt(fd.errores, 2)}% <small>[${fmt(fd.eInf, 2)} - ${fmt(fd.eSup, 2)}]</small>`
    );
  }

  onLeave(): void {
    this.tooltip.hide();
  }
}