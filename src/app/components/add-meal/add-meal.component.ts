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
    ingredients: [] as Ingredient[] // Explicitly type as Ingredient array
  };

  showFullForm = false;
  isLoading = false;
  isSubmitting = false;

  // Store generated ingredients separately for better management
  generatedIngredients: Ingredient[] = [];

  // Dropdown options based on your model
  mealTimeOptions = [
  { value: '午餐', label: 'Lunch' },
  { value: '晚餐', label: 'Dinner' },
  { value: '點心', label: 'Snack' }
];


  dayCycleOptions = Array.from({ length: 14 }, (_, i) => ({
  value: i + 1,            // ✅ INTEGER
  label: `Day ${i + 1}`
}));


  plateTypeOptions = [
  { value: '金属板', label: 'Metal Plate' },
  { value: '金属碗', label: 'Metal Bowl' },
  { value: '陶瓷碗', label: 'Ceramic Bowl' }
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


  // Process the ingredients response from the API
  private processIngredientsResponse(ingredients: any[]): Ingredient[] {
    return ingredients.map(ingredient => ({
      id: ingredient.id, 
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


private buildMealFormData(): FormData {
  const formData = new FormData();

  formData.append('meal_name', this.meal.meal_name!);
  formData.append('meal_description', this.meal.meal_description!);
  formData.append('meal_time', this.meal.meal_time!);
  formData.append('day_cycle', this.meal.day_cycle!);
  formData.append('plate_type', this.meal.plate_type!);

  // Ingredients (IDs or names depending on backend)
  if (this.meal.ingredients?.length) {
    this.meal.ingredients.forEach((ing, index) => {
      formData.append(`ingredients[${index}]`, String(ing.id));
    });
  }

  if (this.mealImage) {
    formData.append('image', this.mealImage, this.mealImage.name);
  }

  return formData;
}



  onSubmit(): void {
  if (!this.isValidMeal() || !this.meal.id) {
    console.warn('Meal is invalid or missing ID');
    return;
  }

  this.isSubmitting = true;

  const formData = this.buildMealFormData();

  this.mealsService.updateMeal(this.meal.id, formData).subscribe({
    next: (updatedMeal) => {
      this.isSubmitting = false;
      this.meal = updatedMeal;

      console.log('Meal successfully updated:', updatedMeal);
      alert('Meal updated successfully!');
    },
    error: (error) => {
      this.isSubmitting = false;
      console.error('Failed to update meal:', error);
      alert('Failed to update meal. Please try again.');
    }
  });
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