export interface Ingredient {
    id: number;            
    name: string;
    food_group?: number; 
    nutrients?: number[]; 
    image?: string | null;  
  }