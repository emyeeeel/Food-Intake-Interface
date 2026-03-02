import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges  } from '@angular/core';

@Component({
  selector: 'app-pie-chart',
  imports: [CommonModule],
  templateUrl: './pie-chart.component.html',
  styleUrl: './pie-chart.component.scss'
})
export class PieChartComponent implements OnChanges {
@Input() data: { color: string; percent: string }[] = [];

  segments: { color: string; dashArray: string; dashOffset: number }[] = [];

  private radius = 40;
  private circumference = 2 * Math.PI * this.radius;

  ngOnChanges() {
    this.generateSegments();
  }

  private generateSegments() {
    let offset = 0;

    this.segments = this.data.map(item => {
      const percent = parseFloat(item.percent);
      const value = (percent / 100) * this.circumference;

      const segment = {
        color: item.color,
        dashArray: `${value} ${this.circumference}`,
        dashOffset: -offset
      };

      offset += value;
      return segment;
    });
  }
}
