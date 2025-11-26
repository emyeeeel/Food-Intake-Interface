import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-consumption-bar',
  imports: [CommonModule],
  templateUrl: './consumption-bar.component.html',
  styleUrl: './consumption-bar.component.scss'
})
export class ConsumptionBarComponent {
  @Input() percentage: number = 0;
  @Input() showPercentage: boolean = true; 
}
