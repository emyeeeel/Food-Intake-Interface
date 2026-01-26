export interface Meal {
  id: number;
  meal_name: string;
  meal_time: '午餐' | '晚餐' | '晚餐' | string; 
  day_cycle: number;
  plate_type: '金属板' | '金属碗' | '陶瓷碗' | string;
  ingredients: number[]; 
  image?: string | null; 
  created_at: string;
  updated_at: string;
}
