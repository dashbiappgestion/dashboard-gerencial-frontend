import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ForecastService, Scenario } from '../../services/forecast.service';

@Component({
  selector: 'app-scenario-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './scenario-selector.component.html',
})
export class ScenarioSelectorComponent {
  readonly forecast = inject(ForecastService);
  readonly activeScenario = this.forecast.activeScenario;

  readonly scenarios: { id: Scenario; label: string; icon: string }[] = [
    { id: 'real', label: 'Real', icon: '◉' },
    { id: 'positivista', label: 'Positivista', icon: '▲' },
    { id: 'pesimista', label: 'Pesimista', icon: '▼' },
    { id: 'personalizado', label: 'Personalizado', icon: '✦' },
  ];

  select(scenario: Scenario): void {
    if (scenario === 'personalizado') {
      this.forecast.openParamsModal();
    } else {
      this.forecast.setScenario(scenario);
    }
  }
}

