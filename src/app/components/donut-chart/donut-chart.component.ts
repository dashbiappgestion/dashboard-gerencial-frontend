import {
  Component,
  ElementRef,
  QueryList,
  ViewChildren,
  effect,
  input,
  signal,
  output,
} from '@angular/core';

import { CategoriaDesarrollo } from '../../models/dashboard.models';
import { prefersReducedMotion } from '../../utils/format.util';

interface DonutSegment extends CategoriaDesarrollo {
  segLen: number;
  circumference: number;
  rotation: number;
  dashOffset: number;
}

@Component({
  selector: 'app-donut-chart',
  standalone: true,
  templateUrl: './donut-chart.component.html',
})
export class DonutChartComponent {
  readonly categorias = input.required<CategoriaDesarrollo[]>();
  readonly categoryClick = output<string>();

  readonly centerValue = signal('');
  readonly centerSub = signal('5 categorías');
  readonly segments = signal<DonutSegment[]>([]);
  readonly hoveredIndex = signal<number | null>(null);

  private readonly C = 2 * Math.PI * 70;

  @ViewChildren('segmentRef') segmentRefs!: QueryList<ElementRef<SVGCircleElement>>;

  constructor() {
    effect(() => {
      const cats = this.categorias();
      if (!cats.length) return;
      this.buildSegments(cats);
      setTimeout(() => this.animateSegments(), prefersReducedMotion() ? 50 : 250);
    });
  }

  private buildSegments(cats: CategoriaDesarrollo[]): void {
    let cum = 0;
    const segs: DonutSegment[] = cats.map((cat) => {
      const startAngle = cum * 3.6;
      const segLen = this.C * (cat.pct / 100);
      const seg: DonutSegment = {
        ...cat,
        segLen,
        circumference: this.C,
        rotation: startAngle - 90,
        dashOffset: prefersReducedMotion() ? 0 : segLen,
      };
      cum += cat.pct;
      return seg;
    });
    this.segments.set(segs);
    this.centerValue.set('');
    this.centerSub.set(segs.length + ' categorías');
  }

  private animateSegments(attempt = 0): void {
    const refs = this.segmentRefs?.toArray() ?? [];
    if (!refs.length && attempt < 10) {
      setTimeout(() => this.animateSegments(attempt + 1), 50);
      return;
    }
    refs.forEach((ref, i) => {
      setTimeout(
        () => {
          ref.nativeElement.style.strokeDashoffset = '0';
        },
        prefersReducedMotion() ? 0 : i * 140,
      );
    });
  }

  onSegmentEnter(index: number): void {
    const seg = this.segments()[index];
    this.centerValue.set(seg.promedio_meses + ' m · ' + seg.pct + '%');
    this.centerSub.set(seg.categoria);
    this.hoveredIndex.set(index);
  }

  onGroupLeave(): void {
    this.centerValue.set('');
    this.centerSub.set(this.segments().length + ' categorías');
    this.hoveredIndex.set(null);
  }

  segmentOpacity(index: number): number | string {
    const hovered = this.hoveredIndex();
    if (hovered === null) return '';
    return hovered === index ? 1 : 0.32;
  }

  segmentWidth(index: number): number {
    return this.hoveredIndex() === index ? 31 : 26;
  }
}
