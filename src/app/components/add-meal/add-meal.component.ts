import { Component } from '@angular/core';
import { Meal } from '../../models/meal.model';
import { Ingredient } from '../../models/ingredient.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MealsService } from '../../services/meals.service';
import { TagsComponent } from "../tags/tags.component";
import { IngredientsService } from '../../services/ingredients.service';
import { forkJoin } from 'rxjs';

interface MealPayload{
  id: number;
  meal_name: string;
  meal_time: string; 
  day_cycle?: string; 
  meal_description: string;
  plate_type: string;
  ingredients: number[]; 
  image?: string | null; 
  created_at: string;
  updated_at: string;
}

@Component({
  selector: 'app-add-meal',
  imports: [CommonModule, FormsModule, TagsComponent],
  templateUrl: './add-meal.component.html',
  styleUrl: './add-meal.component.scss'
})
export class AddMealComponent {
  meal: Partial<Meal> = {
    meal_name: '',
    meal_time: '',
    day_cycle: '',
    meal_description: '',
    plate_type: '',
    ingredients: [] as Ingredient[] // Explicitly type as Ingredient array
  };

  showFullForm = false;
  isLoading = false;
  isSubmitting = false;

  // Store generated ingredients separately for better management
  generatedIngredients: Ingredient[] = [];

  // Dropdown options based on your model
  mealTimeOptions = [
    { value: 'lunch', label: 'Lunch' },
    { value: 'dinner', label: 'Dinner' },
    { value: 'snack', label: 'Snack' }
  ];

  dayCycleOptions = [
    { value: 'day_1', label: 'Day 1' },
    { value: 'day_2', label: 'Day 2' },
    { value: 'day_3', label: 'Day 3' },
    { value: 'day_4', label: 'Day 4' },
    { value: 'day_5', label: 'Day 5' },
    { value: 'day_6', label: 'Day 6' },
    { value: 'day_7', label: 'Day 7' },
    { value: 'day_8', label: 'Day 8' },
    { value: 'day_9', label: 'Day 9' },
    { value: 'day_10', label: 'Day 10' },
    { value: 'day_11', label: 'Day 11' },
    { value: 'day_12', label: 'Day 12' },
    { value: 'day_13', label: 'Day 13' },
    { value: 'day_14', label: 'Day 14' }
  ];

  plateTypeOptions = [
    { value: 'metal_plate', label: 'Metal Plate' },
    { value: 'metal_bowl', label: 'Metal Bowl' },
    { value: 'ceramic_bowl', label: 'Ceramic Bowl' }
  ];

  constructor(private mealsService: MealsService, private ingredientsService: IngredientsService) {}

  mealImage: File | null = null;
  mealImagePreview: string | null = null;

  onImageSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.mealImage = file;

    // Preview
    const reader = new FileReader();
    reader.onload = () => {
      this.mealImagePreview = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  onInitialSubmit(): void {
    if (this.meal.meal_name?.trim()) {
      this.isLoading = true;
      
      // Generate ingredients using MealsService
      this.generateIngredientsFromMeal(this.meal.meal_name).then((response) => {
        this.isLoading = false;
        this.showFullForm = true;
        
        // Process the API response
        if (response && response.ingredients) {
          this.generatedIngredients = response.ingredients;
          // Convert to Ingredient objects if needed
          this.meal.ingredients = this.processIngredientsResponse(response.ingredients);
          console.log('Generated ingredients:', this.meal.ingredients);
        }
        
        // Process the meal data from API response
        if (response && response.meal) {
          const apiMeal = response.meal;
          
          // Auto-fill fields from API response if they exist and current fields are empty
          if (apiMeal.meal_description && !this.meal.meal_description?.trim()) {
            this.meal.meal_description = apiMeal.meal_description;
          }
          
          if (apiMeal.meal_time && !this.meal.meal_time) {
            this.meal.meal_time = apiMeal.meal_time;
          }
          
          if (apiMeal.day_cycle && !this.meal.day_cycle) {
            this.meal.day_cycle = apiMeal.day_cycle;
          }
          
          if (apiMeal.plate_type && !this.meal.plate_type) {
            this.meal.plate_type = apiMeal.plate_type;
          }
          
          // Store the meal ID if it was created/updated on the backend
          if (apiMeal.id) {
            this.meal.id = apiMeal.id;
          }
        }

        // 🔹 Fetch the full meal by name using MealsService
        this.mealsService.getMealByName(this.meal.meal_name!).subscribe({
          next: (mealsFromApi: Meal[]) => {
            if (mealsFromApi.length > 0) {
              this.meal = mealsFromApi[0];

              console.log('Meal fetched from API:', this.meal);

              // Get list of ingredient IDs
              const ingredientIds = this.getIngredientIds();
              console.log('Ingredient IDs:', ingredientIds);

              if (ingredientIds.length > 0) {
                // Fetch all ingredients by their IDs
                const ingredientRequests = ingredientIds.map(id =>
                  this.ingredientsService.getIngredient(id)
                );
              
                forkJoin(ingredientRequests).subscribe({
                  next: (ingredients: Ingredient[]) => {
                    this.generatedIngredients = ingredients;
                    console.log('Populated generatedIngredients:', this.generatedIngredients);
                  },
                  error: (err) => {
                    console.error('Failed to fetch ingredients by IDs:', err);
                  }
                });
              } else {
                // If no ingredient IDs, just clear
                this.generatedIngredients = [];
              }
            } else {
              console.warn('No meals found with the given name.');
            }
          },
          error: (err) => {
            console.error('Failed to fetch meal by name:', err);
          }
        });
        
      }).catch((error) => {
        this.isLoading = false;
        console.error('Error generating ingredients:', error);
        // Still show the form even if ingredients generation fails
        this.showFullForm = true;
      });
    }
  }

  getIngredientIds(): number[] {
    return this.meal.ingredients!.map(ingredient => ingredient.id) || [];
  }

  // Process the ingredients response from the API
  private processIngredientsResponse(ingredients: any[]): Ingredient[] {
    return ingredients.map(ingredient => ({
      id: ingredient.id || 0, // API might not return ID for new ingredients
      name: ingredient.name,
      food_group: ingredient.food_group,
      nutrients: ingredient.nutrients || [],
      created: ingredient.created || false
    } as Ingredient));
  }

  // Generate ingredients using MealsService
  private generateIngredientsFromMeal(mealName: string): Promise<any> {
  return new Promise((resolve, reject) => {

    const formData = new FormData();

    formData.append('meal_name', mealName);
    formData.append('meal', mealName);

    if (this.meal.meal_time) {
      formData.append('meal_time', this.meal.meal_time);
    }

    if (this.meal.day_cycle) {
      formData.append('day_cycle', this.meal.day_cycle);
    }

    if (this.meal.plate_type) {
      formData.append('plate_type', this.meal.plate_type);
    }

    if (this.mealImage) {
      formData.append('image', this.mealImage, this.mealImage.name);
    }

    this.mealsService.generateIngredientsFromMeal(formData).subscribe({
      next: resolve,
      error: reject
    });
  });
}



  // Final form submit
  onSubmit(): void {
    if (!this.isValidMeal()) return;
  
    this.isSubmitting = true;
  
    // Map this.meal to MealPayload
    const mealPayload: MealPayload = {
      id: this.meal.id || 0,
      meal_name: this.meal.meal_name!,
      meal_time: this.meal.meal_time!,
      day_cycle: this.meal.day_cycle,
      meal_description: this.meal.meal_description!,
      plate_type: this.meal.plate_type!,
      ingredients: (this.meal.ingredients || []).map(ing => ing.id),
      image: this.mealImagePreview || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  
    // Determine whether to create or update
    if (this.meal.id && this.meal.id > 0) {
      // Update existing meal
      this.mealsService.updateMeal(this.meal.id, mealPayload as unknown as Meal)
        .subscribe({
          next: (updatedMeal) => {
            console.log('Meal updated successfully:', updatedMeal);
            this.isSubmitting = false;
            this.resetForm();
          },
          error: (err) => {
            console.error('Failed to update meal:', err);
            this.isSubmitting = false;
          }
        });
    } else {
      // Add new meal
      this.mealsService.addMeal(mealPayload as unknown as Meal)
        .subscribe({
          next: (newMeal) => {
            console.log('Meal created successfully:', newMeal);
            this.isSubmitting = false;
            this.resetForm();
          },
          error: (err) => {
            console.error('Failed to create meal:', err);
            this.isSubmitting = false;
          }
        });
    }
  }
  

  onCancel(): void {
    this.resetForm();
    // Add navigation back or close modal logic here
  }

  private isValidMeal(): boolean {
    return !!(
      this.meal.meal_name?.trim() &&
      this.meal.meal_description?.trim() &&
      this.meal.meal_time &&
      this.meal.day_cycle &&
      this.meal.plate_type
    );
  }

  private resetForm(): void {
    this.meal = {
      meal_name: '',
      meal_time: '',
      day_cycle: '',
      meal_description: '',
      plate_type: '',
      ingredients: [] as Ingredient[]
    };
    this.generatedIngredients = [];
    this.mealImage = null;
    this.mealImagePreview = null;
    this.showFullForm = false;
    this.isLoading = false;
    this.isSubmitting = false;
  }

  // Helper method to get ingredient names for display
  getIngredientNames(): string[] {
    return this.meal.ingredients?.map(ing => ing.name) || [];
  }

  isCapturing = false;

  captureMealImage(): void {
    this.isCapturing = true;
  
    this.mealsService.captureMealImage().subscribe({
      next: (blob: Blob) => {
        this.isCapturing = false;
  
        // Convert Blob → File
        const file = new File([blob], 'meal.jpg', { type: blob.type });
        this.mealImage = file;
  
        // Preview
        const reader = new FileReader();
        reader.onload = () => {
          this.mealImagePreview = reader.result as string;
        };
        reader.readAsDataURL(file);
      },
      error: (error) => {
        this.isCapturing = false;
        console.error('Image capture failed:', error);
      }
    });
  }
  
}