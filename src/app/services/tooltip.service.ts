import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TooltipService {
  readonly visible = signal(false);
  readonly html = signal('');
  readonly left = signal(0);
  readonly top = signal(0);

  show(target: Element, html: string): void {
    const r = target.getBoundingClientRect();
    this.html.set(html);
    this.left.set(r.left + r.width / 2);
    this.top.set(r.top);
    this.visible.set(true);
  }

  hide(): void {
    this.visible.set(false);
  }
}
