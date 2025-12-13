import { Ingredient } from "./ingredient.model";

export interface Meal {
  id: number;
  meal_name: string;
  meal_time: 'lunch' | 'dinner' | 'snack' | string; 
  day_cycle?: 'day_1' | 'day_2' | 'day_3' | 'day_4' | 'day_5' | 'day_6' | 'day_7' |
               'day_8' | 'day_9' | 'day_10' | 'day_11' | 'day_12' | 'day_13' | 'day_14' | string; 
  meal_description: string;
  plate_type: 'metal_plate' | 'metal_bowl' | 'ceramic_bowl' | string;
  ingredients: number[]; 
  image?: string | null; 
  created_at: string;
  updated_at: string;
}
