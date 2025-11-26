import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-intake-legend',
  imports: [],
  templateUrl: './intake-legend.component.html',
  styleUrl: './intake-legend.component.scss'
})
export class IntakeLegendComponent {
  @Input() legendColor: string = '#40C1AC'; 
  @Input() legendText: string = 'Legend';
  @Input() legendPercent: string = '00%';
}
