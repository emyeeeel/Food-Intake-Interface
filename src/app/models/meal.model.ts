export interface Meal {
  id: number;
  meal_name: string;
  meal_time: string; 
  day_cycle: number;
  ingredients: number[]; 
  image?: string | null; 
  created_at: string;
  updated_at: string;
}
