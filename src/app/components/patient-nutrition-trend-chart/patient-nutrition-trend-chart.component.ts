import { Component, Input, OnChanges, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const NUTRIENTS = [
  { label: 'Calories (kcal)', key: 'calories_kcal',  color: '#FF6384' },
  { label: 'Protein (g)',     key: 'protein_g',       color: '#36A2EB' },
  { label: 'Fats (g)',        key: 'fats_g',          color: '#FFCE56' },
  { label: 'Carbs (g)',       key: 'carbohydrates_g', color: '#4BC0C0' },
  { label: 'Fiber (g)',       key: 'fiber_g',         color: '#9966FF' },
];

@Component({
  selector: 'app-patient-nutrition-trend-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './patient-nutrition-trend-chart.component.html',
  styleUrls: ['./patient-nutrition-trend-chart.component.scss'],
})
export class PatientNutritionTrendChartComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() recommendationData!: any;
  @Input() mode!: 'weekly' | 'monthly';

  @ViewChild('trendChart') chartRef!: ElementRef<HTMLCanvasElement>;

  private chart?: Chart;
  private viewReady = false;

  ngAfterViewInit() {
    this.viewReady = true;
    if (this.recommendationData) this.buildChart();
  }

  ngOnChanges() {
    if (this.viewReady && this.recommendationData) this.buildChart();
  }

  ngOnDestroy() {
    this.chart?.destroy();
  }

  private buildChart() {
    const { labels, datasets } = this.mode === 'weekly'
      ? this.buildWeeklyData()
      : this.buildMonthlyData();

    this.chart?.destroy();

    this.chart = new Chart(this.chartRef.nativeElement, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: true, position: 'top', labels: { font: { family: 'Quicksand', size: 11 }, boxWidth: 12, padding: 16 } },
          tooltip: { mode: 'index', intersect: false }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { family: 'Quicksand', size: 11 } } },
          y: { beginAtZero: true, ticks: { font: { family: 'Quicksand', size: 11 } } }
        }
      }
    });
  }

  private buildWeeklyData() {
    const weekly = this.recommendationData.weekly_data;
    const sortedKeys = Object.keys(weekly).map(Number).sort((a, b) => a - b);
    const days = sortedKeys.map(k => weekly[k]);

    const labels = days.map((d: any) => {
      const date = new Date(d.date);
      const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      return `${weekday} ${mm}/${dd}`;
    });

    const datasets = NUTRIENTS.map(n => ({
      label:            n.label,
      data:             days.map((d: any) => d?.total_nutritional_content?.[n.key] ?? 0),
      borderColor:      n.color,
      backgroundColor:  n.color + '22',
      tension:          0.3,
      fill:             false,
      pointRadius:      4,
      pointHoverRadius: 6,
      borderWidth:      2,
    }));

    return { labels, datasets };
  }

  private buildMonthlyData() {
    const weeklyData = this.recommendationData.weekly_data;
    const monthlyData = this.recommendationData.monthly_data;

    if (!weeklyData || !monthlyData) return { labels: [] as string[], datasets: [] };

    const days = Object.keys(monthlyData)
      .map(Number).sort((a, b) => a - b)
      .map(d => monthlyData[d]);

    const weekChunks: any[][] = [];
    for (let i = 0; i < days.length; i += 7) weekChunks.push(days.slice(i, i + 7));

    const fmt = (dateStr: string) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    };

    const weeks = Object.keys(weeklyData)
      .sort((a, b) => +a - +b)
      .map((key, i) => {
        const chunk = weekChunks[i] || [];

        // Compute averages from daily total_nutritional_content
        const avg: Record<string, number> = {};
        for (const n of NUTRIENTS.map(n => n.key)) {
          const vals = chunk
            .map((d: any) => d?.total_nutritional_content?.[n] ?? 0)
            .filter((v: number) => v > 0);
          avg[n] = vals.length > 0
            ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length
            : 0;
        }

        return {
          label: `W${key} (${fmt(chunk[0]?.date)}–${fmt(chunk[chunk.length - 1]?.date)})`,
          avg,
        };
      });

    const labels = weeks.map(w => w.label);

    const datasets = NUTRIENTS.map(n => ({
      label:            n.label,
      data:             weeks.map(w => w.avg[n.key] ?? 0),
      borderColor:      n.color,
      backgroundColor:  n.color + '22',
      tension:          0.3,
      fill:             false,
      pointRadius:      4,
      pointHoverRadius: 6,
      borderWidth:      2,
    }));

    return { labels, datasets };
  }
}
