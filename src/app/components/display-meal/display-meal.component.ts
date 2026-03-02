import { Component, OnInit } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MealsService } from '../../services/meals.service';
import { DateService } from '../../services/date.service'; // Add DateService import
import { Meal } from '../../models/meal.model';
import { MealItemComponent } from '../meal-item/meal-item.component'; 
import { environment } from '../../../environments/environment';

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-display-meal',
  imports: [FormsModule, RouterModule, MealItemComponent], // Add MealItemComponent
  templateUrl: './display-meal.component.html',
  styleUrl: './display-meal.component.scss'
})
export class DisplayMealComponent implements OnInit {
  meals: Meal[] = [];
  paginatedMeals: Meal[] = [];
  isLoading = false;
  error: string | null = null;
  isDownloading: boolean = false; // Add this property

  // Pagination properties - Default to 4 items per page
  currentPage = 1;
  pageSize = 2;
  totalMeals = 0;
  totalPages = 0;
  targetPage: number | null = null;

  constructor(
    private mealsService: MealsService,
    private dateService: DateService,
    private settingsService: SettingsService
  ) {}

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

  downloadMealCycleAsExcel(): void {
    console.log('Downloading meal cycle as Excel...');
    
    if (this.meals.length === 0) {
      alert('No meals available to export');
      return;
    }

    this.isDownloading = true;

    try {
      // Use the grouped format with day cycle
      const excelData = this.prepareExcelDataFromArray2(this.meals);
      
      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      
      // Set column widths for better formatting - Updated for 4 columns
      const columnWidths = [
        { wch: 12 },  // 日期 (Date)
        { wch: 10 },  // 日週期 (Day Cycle)
        { wch: 15 },  // 用餐時間 (Meal Time)
        { wch: 60 },  // 菜色名稱 (Meals - wider for multiple meal names)
      ];
      worksheet['!cols'] = columnWidths;
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Meal Cycle Menu');
      
      // Generate filename using environment and DateService
      const today = this.dateService.getTodayDate();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const dateString = `${year}${month}${day}`;
      const filename = `${this.settingsService.careCenterName}-循環選單-${dateString}.xlsx`;
      
      // Save the file
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      saveAs(blob, filename);
      
      console.log(`Meal cycle Excel file exported successfully: ${filename}`);
      
    } catch (error) {
      console.error('Error exporting meal cycle to Excel:', error);
      alert('Failed to export Excel file. Please try again.');
    } finally {
      this.isDownloading = false;
    }
  }

  private prepareExcelDataFromArray2(mealsArray: any[]): any[] {
    // Create a map to group meals by day cycle and meal time
    const groupedMeals = new Map<number, Map<string, any[]>>();

    // Group meals by day cycle and meal time
    mealsArray.forEach(meal => {
      const dayCycle = meal.day_cycle;
      const mealTime = meal.meal_time || 'Unknown';

      // Skip meals with invalid day cycles
      if (!dayCycle || dayCycle < 1) return;

      // Create day cycle group if it doesn't exist
      if (!groupedMeals.has(dayCycle)) {
        groupedMeals.set(dayCycle, new Map<string, any[]>());
      }

      const dayCycleGroup = groupedMeals.get(dayCycle)!;

      // Create meal time group if it doesn't exist
      if (!dayCycleGroup.has(mealTime)) {
        dayCycleGroup.set(mealTime, []);
      }

      // Add meal to the appropriate group
      dayCycleGroup.get(mealTime)!.push(meal);
    });

    // Convert grouped data to Excel format
    const excelData: any[] = [];

    // Sort day cycles in ascending order (1, 2, 3, ..., 14)
    const sortedDayCycles = Array.from(groupedMeals.keys()).sort((a, b) => a - b);

    sortedDayCycles.forEach(dayCycle => {
      const dayCycleGroup = groupedMeals.get(dayCycle)!;
      
      // Define meal time order for consistent display
      const mealTimeOrder = ['早餐', '午餐', '晚餐', '點心'];
      
      // Get all meal times for this day cycle and sort them
      const sortedMealTimes = Array.from(dayCycleGroup.keys()).sort((a, b) => {
        const indexA = mealTimeOrder.indexOf(a);
        const indexB = mealTimeOrder.indexOf(b);
        
        // If both are in the order array, sort by their position
        if (indexA !== -1 && indexB !== -1) {
          return indexA - indexB;
        }
        // If one is not in the order array, put it at the end
        if (indexA === -1 && indexB !== -1) return 1;
        if (indexA !== -1 && indexB === -1) return -1;
        // If neither is in the order array, sort alphabetically
        return a.localeCompare(b);
      });

      sortedMealTimes.forEach(mealTime => {
        const meals = dayCycleGroup.get(mealTime)!;
        
        // Create meal names string
        const mealNames = meals
          .map(meal => meal.meal_name || 'Unknown Meal')
          .join(', ');

        // Calculate date for this day cycle
        const dateString = this.calculateDateFromDayCycle(dayCycle);
        const formattedDate = this.formatDateForDisplay(dateString);

        // Add row with 4 columns: 日期, 日週期, 用餐時間, 菜色名稱
        excelData.push({
          '日期': formattedDate,
          '日週期': dayCycle, // Add day cycle column (1-14)
          '用餐時間': mealTime,
          '菜色名稱': mealNames,
        });
      });
    });

    return excelData;
  }

  private calculateDateFromDayCycle(dayCycle: number | null): string {
    if (!dayCycle || dayCycle < 1) {
      return 'N/A';
    }

    try {
      // Use DateService to get the date for the cycle day
      const date = this.dateService.getDateForCycleDay(dayCycle);
      
      // Format as YYYYMMDD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      return `${year}${month}${day}`;
    } catch (error) {
      console.error('Error calculating date from day cycle:', error);
      return 'N/A';
    }
  }

  private formatDateForDisplay(dateString: string): string {
    if (dateString === 'N/A' || dateString.length !== 8) {
      return dateString;
    }

    // Return as-is since calculateDateFromDayCycle already provides YYYYMMDD format
    return dateString;
  }
}
