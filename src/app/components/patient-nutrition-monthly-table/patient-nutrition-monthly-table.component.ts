import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';

const NUTRIENT_KEYS = ['calories_kcal', 'protein_g', 'fats_g', 'carbohydrates_g', 'fiber_g'];

@Component({
  selector: 'app-patient-nutrition-monthly-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './patient-nutrition-monthly-table.component.html',
  styleUrls: ['./patient-nutrition-monthly-table.component.scss'],
})
export class PatientNutritionMonthlyTableComponent implements OnChanges {
  @Input() recommendationData: any;

  weeks: any[] = [];
  rows: any[] = [];
  monthlyTotal: any = {};

  ngOnChanges() {
    if (!this.recommendationData) return;

    const weeklyData = this.recommendationData.weekly_data;
    const monthlyData = this.recommendationData.monthly_data;

    if (!weeklyData || !monthlyData) return;

    // Sort daily entries by numeric key
    const days = Object.keys(monthlyData)
      .map(d => +d)
      .sort((a, b) => a - b)
      .map(d => monthlyData[d]);

    // Split into chunks of 7 for week grouping
    const weekChunks: any[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weekChunks.push(days.slice(i, i + 7));
    }

    // Build weeks — compute averages from daily total_nutritional_content
    this.weeks = Object.keys(weeklyData)
      .sort((a, b) => +a - +b)
      .map((key, index) => {
        const chunk = weekChunks[index] || [];
        const avg: Record<string, number> = {};

        for (const n of NUTRIENT_KEYS) {
          const vals = chunk
            .map((d: any) => d?.total_nutritional_content?.[n] ?? 0)
            .filter((v: number) => v > 0);
          avg[n] = vals.length > 0
            ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length
            : 0;
        }

        return {
          week:  key,
          avg,
          start: this.formatDate(chunk[0]?.date),
          end:   this.formatDate(chunk[chunk.length - 1]?.date),
        };
      });

    // Monthly total (used for the Monthly Avg column)
    this.monthlyTotal = this.recommendationData.monthly_total_nutritional_content ?? {};

    // Build rows
    this.rows = [
      this.buildRow('Calories',      'kcal', 'calories_kcal'),
      this.buildRow('Protein',       'g',    'protein_g'),
      this.buildRow('Fats',          'g',    'fats_g'),
      this.buildRow('Carbohydrates', 'g',    'carbohydrates_g'),
      this.buildRow('Fiber',         'g',    'fiber_g'),
    ];
  }

  buildRow(label: string, unit: string, key: string) {
    const recommended = this.recommendationData.monthly_dri[key];
    const values = this.weeks.map(w => w.avg[key] ?? 0);
    return {
      nutrient:    label,
      unit,
      recommended,
      values,
      monthlyTotal:  this.monthlyTotal[key] ?? 0,
      remarkParts: this.getRemarkParts(values, recommended.min, recommended.max)
    };
  }

  classify(value: number, min: number, max: number): 'below' | 'meets' | 'above' | 'none' {
    if (!value || value === 0) return 'none';
    if (value < min) return 'below';
    if (value > max) return 'above';
    return 'meets';
  }

  getIcon(value: number, min: number, max: number): string {
    const c = this.classify(value, min, max);
    if (c === 'none')  return 'remove';
    if (c === 'below') return 'arrow_downward';
    if (c === 'above') return 'arrow_upward';
    return 'check_circle';
  }

  getRemarkParts(values: number[], min: number, max: number): {icon: string, label: string, cls: string}[] {
    const recorded = values.filter(v => v > 0);
    if (recorded.length === 0) return [{icon: 'remove', label: 'No data', cls: 'none'}];

    const parts: {icon: string, label: string, cls: string}[] = [];
    if (recorded.some(v => v < min))              parts.push({icon: 'arrow_downward', label: 'Below', cls: 'below'});
    if (recorded.some(v => v >= min && v <= max)) parts.push({icon: 'check_circle',   label: 'Meets', cls: 'meets'});
    if (recorded.some(v => v > max))              parts.push({icon: 'arrow_upward',   label: 'Above', cls: 'above'});

    return parts;
  }

  formatDate(dateStr: string) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }
}
