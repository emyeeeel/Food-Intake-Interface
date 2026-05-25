export interface RollingDeficit {
  protein_g: number;
  fat_g: number;
  carbohydrates_g: number;
  fiber_g: number;
}

export interface MealRecommendation {
  rank: number;
  meal_id: number;
  meal_name: string;
  meal_time: string;
  day_cycle: string;
  knn_score: number;
  calories_kcal: number;
  protein_g: number;
  fat_g: number;
  carbohydrates_g: number;
  fiber_g: number;
  rolling_deficit: RollingDeficit;
  explanation: string;
  generated_at: string;
}

export interface MealRecommendationsResponse {
  ltc_patient_id: number;
  period: string;
  count: number;
  recommendations: MealRecommendation[];
}
