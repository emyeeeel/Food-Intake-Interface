import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';

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
  monthlyAvg: any = {};

  ngOnChanges() {
    if (!this.recommendationData) return;

    const weeklyData = this.recommendationData.weekly_data;
    const monthlyData = this.recommendationData.monthly_data;

    // ✅ 1. Sort daily data
    const days = Object.keys(monthlyData)
      .map(d => +d)
      .sort((a, b) => a - b)
      .map(d => monthlyData[d]);

    // ✅ 2. Split into chunks of 7 days
    const weekChunks: any[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weekChunks.push(days.slice(i, i + 7));
    }

    // ✅ 3. Build weeks with correct ranges
    this.weeks = Object.keys(weeklyData)
      .sort((a, b) => +a - +b)
      .map((key, index) => {
        const w = weeklyData[key];
        const chunk = weekChunks[index] || [];

        const startDate = chunk[0]?.date;
        const endDate = chunk[chunk.length - 1]?.date;

        return {
          week: key,
          avg: w.weekly_average_nutritional_content,
          remark: w.weekly_nutrition_remarks,
          start: this.formatDate(startDate),
          end: this.formatDate(endDate),
        };
      });

    // ✅ 4. Monthly avg
    this.monthlyAvg =
      this.recommendationData.monthly_average_nutritional_content;

    // ✅ 5. Build rows
    this.rows = [
      this.buildRow('Calories', 'kcal', 'calories_kcal'),
      this.buildRow('Protein', 'g', 'protein_g'),
      this.buildRow('Fats', 'g', 'fats_g'),
      this.buildRow('Carbohydrates', 'g', 'carbohydrates_g'),
      this.buildRow('Fiber', 'g', 'fiber_g'),
    ];
  }

  buildRow(label: string, unit: string, key: string) {
    const recommended = this.recommendationData.patient_dris[key];
    const values = this.weeks.map(w => w.avg[key]);
    return {
      nutrient: label,
      unit,
      recommended,
      values,
      monthlyAvg: this.monthlyAvg[key],
      frequencyRemark: this.getFrequencyRemark(values, recommended.min, recommended.max)
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
    if (c === 'none')  return '—';
    if (c === 'below') return '↓';
    if (c === 'above') return '↑';
    return '✓';
  }

  getFrequencyRemark(values: number[], min: number, max: number): string {
    const total = values.length;
    const recorded = values.filter(v => v > 0);
    if (recorded.length === 0) return 'No intake recorded';

    const below = recorded.filter(v => v < min).length;
    const meets = recorded.filter(v => v >= min && v <= max).length;
    const above = recorded.filter(v => v > max).length;

    const parts: string[] = [];
    if (below > 0) parts.push(`↓ Below: ${below}/${total} wks`);
    if (meets > 0) parts.push(`✓ Meets: ${meets}/${total} wks`);
    if (above > 0) parts.push(`↑ Above: ${above}/${total} wks`);

    return parts.join(' | ');
  }

  formatDate(dateStr: string) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }
}