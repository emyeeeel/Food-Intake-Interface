import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MealsService } from '../../services/meals.service';
import { Meal } from '../../models/meal.model';
import { MealItemComponent } from '../meal-item/meal-item.component'; // Import meal-item component

@Component({
  selector: 'app-display-meal',
  imports: [CommonModule, FormsModule, RouterModule, MealItemComponent], // Add MealItemComponent
  templateUrl: './display-meal.component.html',
  styleUrl: './display-meal.component.scss'
})
export class DisplayMealComponent implements OnInit {
  meals: Meal[] = [];
  paginatedMeals: Meal[] = [];
  isLoading = false;
  error: string | null = null;
  
  // Pagination properties - Default to 4 items per page
  currentPage = 1;
  pageSize = 2;
  totalMeals = 0;
  totalPages = 0;
  targetPage: number | null = null;

  constructor(private mealsService: MealsService) {}

  ngOnInit(): void {
    this.getMeals();
  }

  //utilize getMeals from meals services and log them on init
  getMeals(): void {
    this.isLoading = true;
    this.error = null;

    this.mealsService.getMeals().subscribe({
      next: (meals: Meal[]) => {
        this.meals = meals;
        this.totalMeals = meals.length;
        this.calculatePagination();
        this.updatePaginatedMeals();
        
        console.log('Meals loaded successfully:', meals);
        console.log(`Total meals count: ${meals.length}`);
        console.log(`Displaying ${this.pageSize} meals per page`);
        
        // Log detailed meal information
        meals.forEach((meal, index) => {
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

        this.isLoading = false;
      },
      error: (error) => {
        this.error = 'Failed to load meals';
        console.error('Error loading meals:', error);
        console.error('Error details:', {
          message: error.message,
          status: error.status,
          url: error.url
        });
        this.isLoading = false;
      },
      complete: () => {
        console.log('Meals loading completed');
      }
    });
  }

  // Pagination methods
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

  // Helper methods for meal-item component
  getMealCode(meal: Meal): string {
    if (!meal) return '';
  
    const mealTypeMap: Record<string, string> = {
      '午餐': 'L',    
      '晚餐': 'D',    
      '點心': 'S',    
    };
  
    const mealLetter = meal.meal_time && mealTypeMap[meal.meal_time]
      ? mealTypeMap[meal.meal_time]
      : '';  // fallback if undefined
  
    const dayCycle = meal.day_cycle ?? '';
    const mealId = meal.id ?? '';
  
    return `${mealLetter}-${dayCycle}-${mealId}`;
  }

  truncateDescription(description: string | null | undefined, maxLength: number): string {
    if (!description) return 'No description available';
    return description.length > maxLength 
      ? description.substring(0, maxLength) + '...' 
      : description;
  }

  // Event handlers for meal-item component
  onMealSelect(meal: Meal): void {
    console.log('Selected meal from item:', meal);
    // Handle meal selection (e.g., navigate to details, show modal, etc.)
  }

  viewMealDetails(meal: Meal): void {
    console.log('View meal details:', meal);
    // Navigate to meal details page or open modal
    // Example: this.router.navigate(['/meal-details', meal.id]);
  }

  editMeal(meal: Meal): void {
    console.log('Edit meal:', meal);
    // Navigate to edit meal page
    // Example: this.router.navigate(['/edit-meal', meal.id]);
  }

  deleteMeal(meal: Meal): void {
    console.log('Delete meal:', meal);
    // Show confirmation dialog and delete meal
    if (confirm(`Are you sure you want to delete "${meal.meal_name}"?`)) {
      // Call delete service method
      // this.mealsService.deleteMeal(meal.id).subscribe(() => {
      //   this.getMeals(); // Refresh the list
      // });
    }
  }

  // Utility methods
  refreshMeals(): void {
    console.log('Refreshing meals...');
    this.getMeals();
  }

  trackByMealId(index: number, meal: Meal): number {
    return meal.id;
  }
}
