import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-patient-nutrition-daily-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './patient-nutrition-daily-table.component.html',
  styleUrls: ['./patient-nutrition-daily-table.component.scss'],
})
export class PatientNutritionDailyTableComponent implements OnChanges {
  @Input() recommendationData!: any;

  nutritionData: any[] = [];

  constructor() { }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['recommendationData'] && this.recommendationData) {
      this.mapRecommendationDataToTable(this.recommendationData);
    }
  }

  mapRecommendationDataToTable(res: any) {
    if (!res) return;

    const total  = res.total_nutritional_content  || {};
    const lunch  = res.lunch_nutritional_content  || { calories_kcal: 0, protein_g: 0, fats_g: 0, carbohydrates_g: 0, fiber_g: 0 };
    const dinner = res.dinner_nutritional_content || { calories_kcal: 0, protein_g: 0, fats_g: 0, carbohydrates_g: 0, fiber_g: 0 };
    const dris   = res.patient_dris || {};

    const build = (nutrient: string, driKey: string, valueKey: string) => ({
      nutrient,
      recommended: dris[driKey],
      lunch:  lunch[valueKey],
      dinner: dinner[valueKey],
      total:  total[valueKey],
      classification: this.classify(total[valueKey], dris[driKey]?.min, dris[driKey]?.max),
      remark: res.daily_nutrition_remarks?.[driKey]
    });

    this.nutritionData = [
      build('Calories',     'calories_kcal',    'calories_kcal'),
      build('Protein',      'protein_g',        'protein_g'),
      build('Fats',         'fats_g',           'fats_g'),
      build('Carbohydrates','carbohydrates_g',  'carbohydrates_g'),
      build('Fiber',        'fiber_g',          'fiber_g'),
    ];
  }

  classify(value: number, min: number, max: number): 'below' | 'meets' | 'above' | 'none' {
    if (!value || value === 0) return 'none';
    if (value < min) return 'below';
    if (value > max) return 'above';
    return 'meets';
  }

  getIcon(classification: string): string {
    if (classification === 'below') return 'arrow_downward';
    if (classification === 'above') return 'arrow_upward';
    if (classification === 'meets') return 'check';
    return 'remove';
  }

  getRemarkLabel(classification: string): string {
    if (classification === 'below') return 'Below';
    if (classification === 'above') return 'Above';
    if (classification === 'meets') return 'Meets';
    return 'No intake';
  }
}