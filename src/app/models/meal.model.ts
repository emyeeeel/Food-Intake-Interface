export type MenuMode = 'cyclic' | 'open';

export interface Meal {
  id: number;
  meal_name: string;
  meal_time: string;
  day_cycle: number;
  plate_type?: string;
  ingredients: number[];
  image?: string | null;
  menu_mode?: MenuMode;
  serve_date?: string | null;
  created_at: string;
  updated_at: string;
}
