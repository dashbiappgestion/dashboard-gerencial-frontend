import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  OnInit,
  Output,
  ViewChild,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface YearRange {
  from: number;
  to: number;
}

const MIN_YEAR = 2026;
const MAX_YEAR = 2030;

@Component({
  selector: 'app-year-range-slider',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './year-range-slider.component.html',
})
export class YearRangeSliderComponent implements OnInit {
  @Output() rangeChange = new EventEmitter<YearRange>();
  @ViewChild('track') trackRef!: ElementRef<HTMLDivElement>;

  readonly years = Array.from(
    { length: MAX_YEAR - MIN_YEAR + 1 },
    (_, i) => MIN_YEAR + i,
  );

  fromYear = signal(MIN_YEAR);
  toYear = signal(MAX_YEAR);

  /** El handle activo se dibuja encima (z-index mayor). */
  activeHandle = signal<'from' | 'to' | null>(null);

  private dragging: 'from' | 'to' | null = null;

  ngOnInit(): void {
    this.emitRange();
  }

  yearToLeftPct(year: number): number {
    return ((year - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100;
  }

  get fromLeftPct(): number {
    return this.yearToLeftPct(this.fromYear());
  }

  get toLeftPct(): number {
    return this.yearToLeftPct(this.toYear());
  }

  get fillLeft(): number {
    return Math.min(this.fromLeftPct, this.toLeftPct);
  }
  get fillWidth(): number {
    return Math.abs(this.toLeftPct - this.fromLeftPct);
  }

  startDrag(handle: 'from' | 'to', event: MouseEvent | TouchEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragging = handle;
    this.activeHandle.set(handle);
  }

  @HostListener('document:mousemove', ['$event'])
  @HostListener('document:touchmove', ['$event'])
  onMove(event: MouseEvent | TouchEvent): void {
    if (!this.dragging || !this.trackRef) return;

    const clientX =
      event instanceof MouseEvent ? event.clientX : event.touches[0].clientX;
    const rect = this.trackRef.nativeElement.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const year = Math.round(MIN_YEAR + pct * (MAX_YEAR - MIN_YEAR));
    const clamped = Math.max(MIN_YEAR, Math.min(MAX_YEAR, year));

    if (this.dragging === 'from') {
      if (clamped > this.toYear()) {
        this.fromYear.set(this.toYear());
        this.toYear.set(clamped);
        this.dragging = 'to';
        this.activeHandle.set('to');
      } else {
        this.fromYear.set(clamped);
      }
    } else {
      if (clamped < this.fromYear()) {
        this.toYear.set(this.fromYear());
        this.fromYear.set(clamped);
        this.dragging = 'from';
        this.activeHandle.set('from');
      } else {
        this.toYear.set(clamped);
      }
    }
    this.emitRange();
  }

  @HostListener('document:mouseup')
  @HostListener('document:touchend')
  stopDrag(): void {
    this.dragging = null;
    this.activeHandle.set(null);
  }

  private emitRange(): void {
    this.rangeChange.emit({ from: this.fromYear(), to: this.toYear() });
  }

  selectYear(year: number): void {
    const distFrom = Math.abs(year - this.fromYear());
    const distTo = Math.abs(year - this.toYear());
    if (distFrom <= distTo) {
      this.fromYear.set(year);
      if (this.fromYear() > this.toYear()) this.toYear.set(this.fromYear());
    } else {
      this.toYear.set(year);
      if (this.toYear() < this.fromYear()) this.fromYear.set(this.toYear());
    }
    this.emitRange();
  }

  resetRange(): void {
    this.fromYear.set(MIN_YEAR);
    this.toYear.set(MAX_YEAR);
    this.emitRange();
  }
}
