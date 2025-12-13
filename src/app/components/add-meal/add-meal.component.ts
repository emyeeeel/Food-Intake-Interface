import { Component } from '@angular/core';
import { Meal } from '../../models/meal.model';
import { Ingredient } from '../../models/ingredient.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MealsService } from '../../services/meals.service';
import { TagsComponent } from "../tags/tags.component";
import { IngredientsService } from '../../services/ingredients.service';
import { forkJoin } from 'rxjs';

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
    ingredients: [] as Ingredient[]
  };

  showFullForm = false;
  isLoading = false;
  isSubmitting = false;

  generatedIngredients: Ingredient[] = [];

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

  mealImage: File | null = null;
  mealImagePreview: string | null = null;
  isCapturing = false;

  constructor(
    private mealsService: MealsService,
    private ingredientsService: IngredientsService
  ) {}

  onImageSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.mealImage = file;

    const reader = new FileReader();
    reader.onload = () => {
      this.mealImagePreview = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  async onInitialSubmit(): Promise<void> {
    if (!this.meal.meal_name?.trim()) return;

    this.isLoading = true;

    try {
      const response = await this.generateIngredientsFromMeal(this.meal.meal_name);

      this.isLoading = false;
      this.showFullForm = true;

      if (response?.ingredients) {
        this.meal.ingredients = this.processIngredientsResponse(response.ingredients);
        this.generatedIngredients = [...this.meal.ingredients];
      }

      if (response?.meal) {
        const apiMeal = response.meal;
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
        if (apiMeal.id) {
          this.meal.id = apiMeal.id;
        }
      }

      // Fetch full meal by name
      this.mealsService.getMealByName(this.meal.meal_name!).subscribe({
        next: (mealsFromApi: Meal[]) => {
          if (mealsFromApi.length > 0) {
            this.meal = mealsFromApi[0];

            // If ingredients are just IDs, fetch full objects
            const ingredientIds = this.meal.ingredients
              ?.map(ing => typeof ing === 'number' ? ing : ing.id!)
              .filter(id => !!id) || [];

            this.fetchFullIngredients(ingredientIds);
          } else {
            console.warn('No meals found with the given name.');
          }
        },
        error: (err) => console.error('Failed to fetch meal by name:', err)
      });

    } catch (error) {
      this.isLoading = false;
      console.error('Error generating ingredients:', error);
      this.showFullForm = true;
    }
  }

  private fetchFullIngredients(ids: number[]): void {
    if (!ids.length) {
      this.generatedIngredients = [];
      this.meal.ingredients = [];
      return;
    }

    const requests = ids.map(id => this.ingredientsService.getIngredient(id));
    forkJoin(requests).subscribe({
      next: (fullIngredients: Ingredient[]) => {
        this.generatedIngredients = fullIngredients;
        this.meal.ingredients = fullIngredients;
        console.log('Full ingredients fetched:', fullIngredients);
      },
      error: (err) => {
        console.error('Failed to fetch ingredients:', err);
        this.generatedIngredients = [];
        this.meal.ingredients = [];
      }
    });
  }

  private processIngredientsResponse(ingredients: any[]): Ingredient[] {
    return ingredients.map(ingredient => ({
      id: ingredient.id || 0,
      name: ingredient.name,
      food_group: ingredient.food_group,
      nutrients: ingredient.nutrients || [],
      created: ingredient.created || false
    } as Ingredient));
  }

  private generateIngredientsFromMeal(mealName: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('meal_name', mealName);
      formData.append('meal', mealName);

      if (this.meal.meal_time) formData.append('meal_time', this.meal.meal_time);
      if (this.meal.day_cycle) formData.append('day_cycle', this.meal.day_cycle);
      if (this.meal.plate_type) formData.append('plate_type', this.meal.plate_type);
      if (this.mealImage) formData.append('image', this.mealImage, this.mealImage.name);

      this.mealsService.generateIngredientsFromMeal(formData).subscribe({
        next: resolve,
        error: reject
      });
    });
  }

  onSubmit(): void {
    if (!this.isValidMeal()) return;
  
    this.isSubmitting = true;
  
    // Check if meal has an ID -> if yes, update it; if no, create a new meal
    const mealToSubmit: Meal = {
      ...this.meal,
      ingredients: this.meal.ingredients as Ingredient[] // Ensure full ingredient objects
    } as Meal;
  
    if (mealToSubmit.id) {
      // Update existing meal
      this.mealsService.updateMeal(mealToSubmit.id, mealToSubmit).subscribe({
        next: (updatedMeal) => {
          this.isSubmitting = false;
          this.meal = updatedMeal;
          console.log('Meal updated successfully:', updatedMeal);
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Failed to update meal:', err);
        }
      });
    } else {
      // Add new meal
      this.mealsService.addMeal(mealToSubmit).subscribe({
        next: (newMeal) => {
          this.isSubmitting = false;
          this.meal = newMeal;
          console.log('Meal added successfully:', newMeal);
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Failed to add meal:', err);
        }
      });
    }
  }
  

  onCancel(): void {
    this.resetForm();
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

  getIngredientNames(): string[] {
    return this.meal.ingredients?.map(ing => ing.name) || [];
  }

  captureMealImage(): void {
    this.isCapturing = true;

    this.mealsService.captureMealImage().subscribe({
      next: (blob: Blob) => {
        this.isCapturing = false;
        const file = new File([blob], 'meal.jpg', { type: blob.type });
        this.mealImage = file;

        const reader = new FileReader();
        reader.onload = () => this.mealImagePreview = reader.result as string;
        reader.readAsDataURL(file);
      },
      error: (error) => {
        this.isCapturing = false;
        console.error('Image capture failed:', error);
      }
    });
  }
}
