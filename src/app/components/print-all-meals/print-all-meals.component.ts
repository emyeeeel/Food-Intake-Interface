import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Meal } from '../../models/meal.model';
import { MealsService } from '../../services/meals.service';
import { IngredientsService } from '../../services/ingredients.service';
import { Ingredient } from '../../models/ingredient.model';
import { CommonModule } from '@angular/common';
import { forkJoin, Observable } from 'rxjs';

@Component({
  selector: 'app-print-all-meals',
  imports: [CommonModule],
  templateUrl: './print-all-meals.component.html',
  styleUrl: './print-all-meals.component.scss'
})
export class PrintAllMealsComponent implements OnInit {
  @ViewChild('printContent') printContent!: ElementRef;

  meals: Meal[] = [];
  ingredients: Ingredient[] = [];
  loading: boolean = true;
  error: string | null = null;
  
  // Print functionality
  selectedMeals: Set<number> = new Set();
  showPrintPreview: boolean = false;
  mealsForPrint: Meal[] = [];
  currentDate: Date = new Date();

  constructor(
    private mealService: MealsService,
    private ingredientsService: IngredientsService
  ) {}

  ngOnInit(): void {
    this.loadAllData();
  }

  loadAllData(): void {
    this.loading = true;
    this.error = null;

    // Load both meals and ingredients simultaneously
    forkJoin({
      meals: this.mealService.getMeals(),
      ingredients: this.ingredientsService.getIngredients()
    }).subscribe({
      next: (response) => {
        console.log('Meals Service Response:', response.meals);
        console.log('Ingredients Service Response:', response.ingredients);
        
        this.meals = response.meals;
        this.ingredients = response.ingredients;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading data:', err);
        this.error = 'Failed to load meals and ingredients';
        this.loading = false;
      }
    });
  }

  // Selection Methods
  // Update the toggleMealSelection method to handle both row clicks and checkbox clicks
  toggleMealSelection(mealId: number, event?: Event): void {
    if (event) {
      // If called from checkbox, use the checkbox state
      const checkbox = event.target as HTMLInputElement;
      if (checkbox.checked) {
        this.selectedMeals.add(mealId);
      } else {
        this.selectedMeals.delete(mealId);
      }
    } else {
      // If called from row click, toggle the selection
      if (this.selectedMeals.has(mealId)) {
        this.selectedMeals.delete(mealId);
      } else {
        this.selectedMeals.add(mealId);
      }
    }
  }

  // Remove the toggleAllSelection method since we no longer have "Select All"
  // Remove isAllSelected and isIndeterminate methods as well

  clearSelection(): void {
    this.selectedMeals.clear();
  }

  // Print Methods
  printAllMeals(): void {
    this.mealsForPrint = [...this.meals];
    this.showPrintPreview = true;
  }

  printSelectedMeals(): void {
    this.mealsForPrint = this.meals.filter(meal => this.selectedMeals.has(meal.id));
    this.showPrintPreview = true;
  }

  closePrintPreview(): void {
    this.showPrintPreview = false;
  }

  executePrint(): void {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const printContent = this.printContent.nativeElement.innerHTML;
      
      printWindow.document.write(`
        <html>
          <head>
            <title>Meal Records Report</title>
            <style>
              ${this.getPrintStyles()}
            </style>
          </head>
          <body>
            ${printContent}
          </body>
        </html>
      `);
      
      printWindow.document.close();
      printWindow.focus();
      
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  }

  private getPrintStyles(): string {
    return `
      body {
        font-family: 'Arial', sans-serif;
        margin: 20px;
        color: #333;
      }
      
      .print-document {
        max-width: 100%;
      }
      
      .print-header {
        text-align: center;
        margin-bottom: 30px;
        border-bottom: 2px solid #40C1AC;
        padding-bottom: 15px;
      }
      
      .print-header h1 {
        color: #00313C;
        margin: 0 0 10px 0;
        font-size: 24px;
      }
      
      .print-header p {
        margin: 5px 0;
        color: #666;
        font-size: 14px;
      }
      
      .print-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
        font-size: 12px;
      }
      
      .print-table th,
      .print-table td {
        border: 1px solid #ddd;
        padding: 8px;
        text-align: left;
        word-wrap: break-word;
      }
      
      .print-table th {
        background-color: #40C1AC;
        color: white;
        font-weight: bold;
      }
      
      .print-table tr:nth-child(even) {
        background-color: #f9f9f9;
      }
      
      @media print {
        body { margin: 0; }
        .print-table { font-size: 10px; }
        .print-table th,
        .print-table td { padding: 4px; }
      }
    `;
  }

  // Method to get ingredient name by ID using the loaded ingredients
  getIngredientName(ingredientId: number): string {
    const ingredient = this.ingredients.find(ing => ing.id === ingredientId);
    
    if (ingredient) {
      return ingredient.name || ingredient.name || `Ingredient ${ingredientId}`;
    }

    // Fallback if ingredient not found
    return `Unknown Ingredient (ID: ${ingredientId})`;
  }

  // Alternative method if you want to load ingredients on demand
  getIngredientNameAsync(ingredientId: number): Observable<string> {
    return new Observable(observer => {
      // First check if ingredient is already loaded
      const cachedIngredient = this.ingredients.find(ing => ing.id === ingredientId);
      
      if (cachedIngredient) {
        observer.next(cachedIngredient.name || cachedIngredient.name || `Ingredient ${ingredientId}`);
        observer.complete();
      } else {
        // Load individual ingredient if not cached
        this.ingredientsService.getIngredient(ingredientId).subscribe({
          next: (ingredient) => {
            // Cache the ingredient for future use
            this.ingredients.push(ingredient);
            observer.next(ingredient.name || ingredient.name || `Ingredient ${ingredientId}`);
            observer.complete();
          },
          error: (err) => {
            console.error(`Error loading ingredient ${ingredientId}:`, err);
            observer.next(`Unknown Ingredient (ID: ${ingredientId})`);
            observer.complete();
          }
        });
      }
    });
  }

  // Get all ingredient names for a meal as a comma-separated string
  getMealIngredients(meal: Meal): string {
    if (!meal.ingredients || meal.ingredients.length === 0) {
      return 'No ingredients';
    }

    return meal.ingredients
      .map(id => this.getIngredientName(id))
      .join(', ');
  }

  // Get ingredient names as an array for *ngFor usage
  getMealIngredientsArray(meal: Meal): string[] {
    if (!meal.ingredients || meal.ingredients.length === 0) {
      return [];
    }

    return meal.ingredients.map(id => this.getIngredientName(id));
  }

  // Helper method for template
  getMealCount(): number {
    return this.meals.length;
  }

  // TrackBy function for better performance
  trackByMealId(index: number, meal: Meal): number {
    return meal.id;
  }

  // TrackBy function for ingredients
  trackByIngredientId(index: number, ingredientName: string): string {
    return ingredientName;
  }
}