import { Component, inject } from '@angular/core';

import { TooltipService } from '../../services/tooltip.service';

@Component({
  selector: 'app-chart-tooltip',
  standalone: true,
  template: `
    <div
      class="tooltip"
      [class.visible]="tooltip.visible()"
      [style.left.px]="tooltip.left()"
      [style.top.px]="tooltip.top()"
      [innerHTML]="tooltip.html()"
    ></div>
  `,
})
export class ChartTooltipComponent {
  readonly tooltip = inject(TooltipService);
}
