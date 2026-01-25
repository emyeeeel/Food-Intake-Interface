import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Meal } from '../../models/meal.model';
import { MealsService } from '../../services/meals.service';
import { IngredientsService } from '../../services/ingredients.service';
import { Ingredient } from '../../models/ingredient.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, Observable } from 'rxjs';

@Component({
  selector: 'app-print-all-meals',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './print-all-meals.component.html',
  styleUrl: './print-all-meals.component.scss'
})
export class PrintAllMealsComponent implements OnInit {
  @ViewChild('printContent') printContent!: ElementRef;
  @ViewChild('popupModal') popupModal!: ElementRef;

  meals: Meal[] = [];
  paginatedMeals: Meal[] = [];
  ingredients: Ingredient[] = [];
  loading: boolean = true;
  error: string | null = null;
  
  // Pagination properties
  currentPage = 1;
  pageSize = 6; // Default to 5 items per page for table view
  totalMeals = 0;
  totalPages = 0;
  targetPage: number | null = null;
  
  // Print functionality - Updated for popup
  selectedMeals: Set<number> = new Set();
  showPrintModal: boolean = false;
  mealsForPrint: Meal[] = [];
  currentDate: Date = new Date();
  printMode: 'all' | 'selected' | 'current' = 'all';

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
        this.totalMeals = response.meals.length;
        this.calculatePagination();
        this.updatePaginatedMeals();
        this.loading = false;

        // Log detailed meal information
        response.meals.forEach((meal, index) => {
          console.log(`Meal ${index + 1}:`, {
            id: meal.id,
            name: meal.meal_name,
            description: meal.meal_description,
            mealTime: meal.meal_time,
            dayCycle: meal.day_cycle,
            plateType: meal.plate_type,
            ingredientsCount: meal.ingredients?.length || 0,
            createdAt: meal.created_at,
            updatedAt: meal.updated_at
          });
        });

        console.log(`Total meals count: ${this.totalMeals}`);
        console.log(`Displaying ${this.pageSize} meals per page`);
      },
      error: (err) => {
        console.error('Error loading data:', err);
        this.error = 'Failed to load meals and ingredients';
        this.loading = false;
      }
    });
  }

  // Pagination Methods
  calculatePagination(): void {
    this.totalPages = Math.ceil(this.totalMeals / this.pageSize);
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }
  }

  updatePaginatedMeals(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedMeals = this.meals.slice(startIndex, endIndex);
    console.log(`Page ${this.currentPage}: Showing ${this.paginatedMeals.length} meals`);
  }

  goToPage(page: number | string): void {
    if (typeof page === 'number' && page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedMeals();
      // Clear selection when changing pages to avoid confusion
      this.clearPageSelections();
      console.log(`Navigated to page ${page}`);
    }
  }

  goToFirstPage(): void {
    this.goToPage(1);
  }

  goToLastPage(): void {
    this.goToPage(this.totalPages);
  }

  goToNextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.goToPage(this.currentPage + 1);
    }
  }

  goToPreviousPage(): void {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  goToTargetPage(): void {
    if (this.targetPage && this.targetPage >= 1 && this.targetPage <= this.totalPages) {
      this.goToPage(this.targetPage);
      this.targetPage = null; // Clear input after navigation
    }
  }

  onPageSizeChange(): void {
    console.log(`Page size changed to: ${this.pageSize}`);
    this.currentPage = 1;
    this.calculatePagination();
    this.updatePaginatedMeals();
    // Clear selections when page size changes
    this.clearSelection();
  }

  getVisiblePages(): (number | string)[] {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;
    
    if (this.totalPages <= maxVisiblePages) {
      // Show all pages if total is less than max visible
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show pages with ellipsis
      const halfVisible = Math.floor(maxVisiblePages / 2);
      let startPage = Math.max(1, this.currentPage - halfVisible);
      let endPage = Math.min(this.totalPages, this.currentPage + halfVisible);
      
      // Adjust if we're near the beginning or end
      if (this.currentPage <= halfVisible) {
        endPage = maxVisiblePages;
      } else if (this.currentPage > this.totalPages - halfVisible) {
        startPage = this.totalPages - maxVisiblePages + 1;
      }
      
      // Add first page and ellipsis if needed
      if (startPage > 1) {
        pages.push(1);
        if (startPage > 2) {
          pages.push('...');
        }
      }
      
      // Add visible pages
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      // Add ellipsis and last page if needed
      if (endPage < this.totalPages) {
        if (endPage < this.totalPages - 1) {
          pages.push('...');
        }
        pages.push(this.totalPages);
      }
    }
    
    return pages;
  }

  getStartIndex(): number {
    return this.totalMeals === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  getEndIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalMeals);
  }

  getRowNumber(index: number): number {
    return (this.currentPage - 1) * this.pageSize + index + 1;
  }

  // Selection Methods
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
    console.log(`Selected meals: ${Array.from(this.selectedMeals).join(', ')}`);
  }

  selectAllCurrentPage(): void {
    this.paginatedMeals.forEach(meal => {
      this.selectedMeals.add(meal.id);
    });
    console.log(`Selected all meals on page ${this.currentPage}`);
  }

  deselectAllCurrentPage(): void {
    this.paginatedMeals.forEach(meal => {
      this.selectedMeals.delete(meal.id);
    });
    console.log(`Deselected all meals on page ${this.currentPage}`);
  }

  clearSelection(): void {
    this.selectedMeals.clear();
    console.log('Cleared all selections');
  }

  clearPageSelections(): void {
    // Clear selections only for current page items
    this.paginatedMeals.forEach(meal => {
      this.selectedMeals.delete(meal.id);
    });
  }

  isAllCurrentPageSelected(): boolean {
    if (this.paginatedMeals.length === 0) return false;
    return this.paginatedMeals.every(meal => this.selectedMeals.has(meal.id));
  }

  isAnyCurrentPageSelected(): boolean {
    return this.paginatedMeals.some(meal => this.selectedMeals.has(meal.id));
  }

  getSelectedCount(): number {
    return this.selectedMeals.size;
  }

  // Print Methods - Updated for popup modal
  printAllMeals(): void {
    this.mealsForPrint = [...this.meals]; // Print all meals, not just current page
    this.printMode = 'all';
    this.showPrintModal = true;
    console.log(`Preparing to print all ${this.meals.length} meals`);
  }

  printSelectedMeals(): void {
    this.mealsForPrint = this.meals.filter(meal => this.selectedMeals.has(meal.id));
    this.printMode = 'selected';
    this.showPrintModal = true;
    console.log(`Preparing to print ${this.mealsForPrint.length} selected meals`);
  }

  printCurrentPage(): void {
    this.mealsForPrint = [...this.paginatedMeals];
    this.printMode = 'current';
    this.showPrintModal = true;
    console.log(`Preparing to print current page (${this.paginatedMeals.length} meals)`);
  }

  closePrintModal(): void {
    this.showPrintModal = false;
    console.log('Closed print modal');
  }

  // Handle modal backdrop click
  onModalBackdropClick(event: Event): void {
    if (event.target === this.popupModal.nativeElement) {
      this.closePrintModal();
    }
  }

  // Handle escape key
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.showPrintModal) {
      this.closePrintModal();
    }
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

  // Ingredient Methods
  getIngredientName(ingredientId: number): string {
    const ingredient = this.ingredients.find(ing => ing.id === ingredientId);
    
    if (ingredient) {
      return ingredient.name || ingredient.name || `Ingredient ${ingredientId}`;
    }

    return `Unknown Ingredient (ID: ${ingredientId})`;
  }

  getIngredientNameAsync(ingredientId: number): Observable<string> {
    return new Observable(observer => {
      const cachedIngredient = this.ingredients.find(ing => ing.id === ingredientId);
      
      if (cachedIngredient) {
        observer.next(cachedIngredient.name || cachedIngredient.name || `Ingredient ${ingredientId}`);
        observer.complete();
      } else {
        this.ingredientsService.getIngredient(ingredientId).subscribe({
          next: (ingredient) => {
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

  getMealIngredients(meal: Meal): string {
    if (!meal.ingredients || meal.ingredients.length === 0) {
      return 'No ingredients';
    }

    return meal.ingredients
      .map(id => this.getIngredientName(id))
      .join(', ');
  }

  getMealIngredientsArray(meal: Meal): string[] {
    if (!meal.ingredients || meal.ingredients.length === 0) {
      return [];
    }

    return meal.ingredients.map(id => this.getIngredientName(id));
  }

  // Helper Methods
  getMealCount(): number {
    return this.totalMeals;
  }

  getCurrentPageCount(): number {
    return this.paginatedMeals.length;
  }

  refreshMeals(): void {
    console.log('Refreshing meals...');
    this.clearSelection();
    this.loadAllData();
  }

  // TrackBy functions for performance
  trackByMealId(index: number, meal: Meal): number {
    return meal.id;
  }

  trackByIngredientId(index: number, ingredientName: string): string {
    return ingredientName;
  }

  // Utility methods for meal codes (similar to display-meal component)
  getMealCode(meal: Meal): string {
    if (!meal) return '';

    const mealTypeMap: Record<string, string> = {
      '午餐': 'L',    
      '晚餐': 'D',    
      '點心': 'S',    
    };

    const mealLetter = meal.meal_time && mealTypeMap[meal.meal_time]
      ? mealTypeMap[meal.meal_time]
      : '';

    const dayCycle = meal.day_cycle ?? '';
    const mealId = meal.id ?? '';

    return `${mealLetter}-${dayCycle}-${mealId}`;
  }

  getPrintModeTitle(): string {
    switch (this.printMode) {
      case 'all':
        return 'All Meals';
      case 'selected':
        return `Selected Meals (${this.selectedMeals.size})`;
      case 'current':
        return `Current Page (Page ${this.currentPage})`;
      default:
        return 'Meals';
    }
  }
}