export interface FoodItem {
  id: number;
  food_class: string;
  confidence_score: number;
  volume_ml: number;
}

export interface EstimationResult {
  id: number;
  total_volume_ml: number;
  food_items: FoodItem[];
  segmented_image: string;
}