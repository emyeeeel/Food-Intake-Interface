import { Component } from '@angular/core';
import { Meal } from '../../models/meal.model';
import { Ingredient } from '../../models/ingredient.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MealsService } from '../../services/meals.service';
import { TagsComponent } from "../tags/tags.component";

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

  constructor(private mealsService: MealsService) {}

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
        
      }).catch((error) => {
        this.isLoading = false;
        console.error('Error generating ingredients:', error);
        // Still show the form even if ingredients generation fails
        this.showFullForm = true;
      });
    }
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
    if (this.isValidMeal()) {
      this.isSubmitting = true;
      console.log('Submitting meal:', this.meal);
      
      // If meal already exists (has ID), we might not need to create it again
      // since the API already created/updated it during ingredient generation
      if (this.meal.id) {
        console.log('Meal already exists with ID:', this.meal.id);
        this.isSubmitting = false;
        // Maybe just show success message or navigate away
        return;
      }
      
      // Prepare meal data for API with required fields
      const mealData: Partial<Meal> = {
        ...this.meal,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // // Use MealsService to create the meal (if it wasn't created during ingredient generation)
      // this.mealsService.createMeal(mealData).subscribe({
      //   next: (response) => {
      //     console.log('Meal added successfully!', response);
      //     this.isSubmitting = false;
      //     this.resetForm();
      //     // Add navigation or success message here
      //   },
      //   error: (error) => {
      //     console.error('Error creating meal:', error);
      //     this.isSubmitting = false;
      //     // Handle error - show error message
      //   }
      // });
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