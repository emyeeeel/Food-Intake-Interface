import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';

@Component({
  selector: 'app-patient-nutrition-weekly-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './patient-nutrition-weekly-table.component.html',
  styleUrls: ['./patient-nutrition-weekly-table.component.scss'],
})
export class PatientNutritionWeeklyTableComponent implements OnChanges {
  @Input() recommendationData!: any;

  days: any[] = [];
  rows: any[] = [];

  ngOnChanges() {
    if (!this.recommendationData) return;

    const res = this.recommendationData;
    const weekly = res.weekly_data;

    const sortedKeys = Object.keys(weekly)
      .map(k => Number(k))
      .sort((a, b) => a - b);

    const daysArray = sortedKeys.map(k => weekly[k]);
    this.days = daysArray;

    const get = (d: any, key: string) =>
      d?.total_nutritional_content?.[key] ?? 0;

    const dris = res.patient_dris;

    const buildRow = (nutrient: string, unit: string, key: string, driKey: string) => {
      const recommended = dris[driKey];
      const values = daysArray.map(d => get(d, key));
      return {
        nutrient,
        unit,
        recommended,
        values,
        frequencyRemark: this.getFrequencyRemark(values, recommended.min, recommended.max, 'days')
      };
    };

    this.rows = [
      buildRow('Calories', 'kcal', 'calories_kcal', 'calories_kcal'),
      buildRow('Protein',  'g',    'protein_g',      'protein_g'),
      buildRow('Fats',     'g',    'fats_g',         'fats_g'),
      buildRow('Carbohydrates', 'g', 'carbohydrates_g', 'carbohydrates_g'),
      buildRow('Fiber',    'g',    'fiber_g',        'fiber_g'),
    ];
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

  getFrequencyRemark(values: number[], min: number, max: number, unit: string): string {
    const total = values.length;
    const recorded = values.filter(v => v > 0);
    if (recorded.length === 0) return 'No intake recorded';

    const below = recorded.filter(v => v < min).length;
    const meets = recorded.filter(v => v >= min && v <= max).length;
    const above = recorded.filter(v => v > max).length;

    const parts: string[] = [];
    if (below > 0) parts.push(`↓ Below: ${below}/${total} ${unit}`);
    if (meets > 0) parts.push(`✓ Meets: ${meets}/${total} ${unit}`);
    if (above > 0) parts.push(`↑ Above: ${above}/${total} ${unit}`);

    return parts.join(' | ');
  }

  getWeekDay(date: string): string {
    return new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
  }
}