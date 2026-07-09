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

  private dragging: 'from' | 'to' | null = null;

  ngOnInit(): void {
    this.emitRange();
  }

  /** Convert year → percentage from TOP (0% = top = MAX, 100% = bottom = MIN) */
  yearToTopPct(year: number): number {
    return ((MAX_YEAR - year) / (MAX_YEAR - MIN_YEAR)) * 100;
  }

  get fromTopPct(): number {
    return this.yearToTopPct(this.fromYear());
  }

  get toTopPct(): number {
    return this.yearToTopPct(this.toYear());
  }

  /** Track fill: between toYear (higher, lower top%) and fromYear (lower, higher top%) */
  get fillTop(): number {
    return Math.min(this.fromTopPct, this.toTopPct);
  }
  get fillHeight(): number {
    return Math.abs(this.fromTopPct - this.toTopPct);
  }

  startDrag(handle: 'from' | 'to', event: MouseEvent | TouchEvent): void {
    event.preventDefault();
    this.dragging = handle;
  }

  @HostListener('document:mousemove', ['$event'])
  @HostListener('document:touchmove', ['$event'])
  onMove(event: MouseEvent | TouchEvent): void {
    if (!this.dragging || !this.trackRef) return;
    const clientY =
      event instanceof MouseEvent ? event.clientY : event.touches[0].clientY;
    const rect = this.trackRef.nativeElement.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    // pct=0 → MAX_YEAR, pct=1 → MIN_YEAR
    const year = Math.round(MAX_YEAR - pct * (MAX_YEAR - MIN_YEAR));
    const clamped = Math.max(MIN_YEAR, Math.min(MAX_YEAR, year));

    if (this.dragging === 'from') {
      this.fromYear.set(Math.min(clamped, this.toYear()));
    } else {
      this.toYear.set(Math.max(clamped, this.fromYear()));
    }
    this.emitRange();
  }

  @HostListener('document:mouseup')
  @HostListener('document:touchend')
  stopDrag(): void {
    this.dragging = null;
  }

  private emitRange(): void {
    this.rangeChange.emit({ from: this.fromYear(), to: this.toYear() });
  }

  selectSingleYear(year: number): void {
    this.fromYear.set(year);
    this.toYear.set(year);
    this.emitRange();
  }

  resetRange(): void {
    this.fromYear.set(MIN_YEAR);
    this.toYear.set(MAX_YEAR);
    this.emitRange();
  }
}
