import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export type Scenario = 'real' | 'positivista' | 'pesimista' | 'personalizado';

@Component({
  selector: 'app-scenario-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './scenario-selector.component.html',
})
export class ScenarioSelectorComponent {
  readonly activeScenario = signal<Scenario>('real');

  readonly scenarios: { id: Scenario; label: string; icon: string }[] = [
    { id: 'real', label: 'Real', icon: '◉' },
    { id: 'positivista', label: 'Positivista', icon: '▲' },
    { id: 'pesimista', label: 'Pesimista', icon: '▼' },
    { id: 'personalizado', label: 'Personalizado', icon: '✦' },
  ];

  select(scenario: Scenario): void {
    this.activeScenario.set(scenario);
  }
}
