import { FoodGroup } from "./food-group.model";
import { Nutrient } from "./nutrient.model";

export interface Ingredient {
    id: number;            
    name: string;
    food_group?: FoodGroup; 
    nutrients?: Nutrient[]; 
    image?: string | null;  
  }