import { RecommendedIntake } from "./recommended-intake.model";

export interface RecommendedIntakeApiResponse {
  patient_id: number;
  patient_name: string;
  patient_info: {
    sex: string;
    age: number;
    height_cm: number;
    weight_kg: number;
    activity_level: string;
    bmi: number;
  };
  nutritional_recommendations: RecommendedIntake;
  units: {
    daily_caloric_needs: string;
    carbohydrate: string;
    total_fiber: string;
    protein: string;
    fat: string;
    saturated_fatty_acids?: string;
    trans_fatty_acids?: string;
    alpha_linolenic_acid: string;
    linoleic_acid: string;
    dietary_cholesterol?: string;
    total_water: string;
  };
}
