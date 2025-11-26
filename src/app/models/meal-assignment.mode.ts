import { Meal } from "./meal.model";
import { Patient } from "./patient.model";

export interface MealAssignment {
  id: number;
  meal_type: string;
  day_cycle: number;
  assigned_at: string;
  patient: number;
  meal: number; // just the ID
}
