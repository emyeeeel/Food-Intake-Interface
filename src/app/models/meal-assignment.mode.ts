import { LTCPatient } from "./ltc-patient.model";
import { Meal } from "./meal.model";
import { Patient } from "./patient.model";

export interface MealAssignment {
  id: number;
  patient: number | null;
  ltc_patient: number | null;
  meal: number;
  patient_detail: Patient | null;
  ltc_patient_detail: LTCPatient | null;
  meal_detail: Meal;
  patient_identifier: string;
  meal_type: string;
  day_cycle: string;
  meal_name: string;
}

// Optional: Create a type for creating new meal assignments (without computed fields)
export interface CreateMealAssignment {
  patient?: number;
  ltc_patient?: number;
  meal: number;
}

// Optional: Helper type for meal assignment creation with multiple meals
export interface MealAssignmentRequest {
  patient_id?: number;
  ltc_patient_id?: number;
  meal_assignments: {
    day_cycle: number;
    lunch_meal_ids?: number[];
    dinner_meal_ids?: number[];
  }[];
}
