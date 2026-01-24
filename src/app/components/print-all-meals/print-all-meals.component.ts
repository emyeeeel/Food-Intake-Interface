import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Meal } from '../../models/meal.model';
import { MealsService } from '../../services/meals.service';
import { IngredientsService } from '../../services/ingredients.service';
import { Ingredient } from '../../models/ingredient.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, Observable } from 'rxjs';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { environment } from '../../../environments/environment';

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
  pageSize = 5; // Default to 10 items per page for table view
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

  // Excel Export Methods - Updated with clearer naming and functionality
  downloadAllMealsAsExcel(): void {
    console.log('Downloading ALL meals as Excel...');
    
    if (this.meals.length === 0) {
      alert('No meals available to export');
      return;
    }

    try {
      // Use ALL meals, not paginated meals
      const excelData = this.prepareExcelDataFromArray(this.meals);
      
      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      
      // Set column widths for better formatting
      const columnWidths = [
        { wch: 8 },   // ID
        { wch: 25 },  // Meal Name
        { wch: 15 },  // Meal Time
        { wch: 12 },  // Day Cycle
        { wch: 15 },  // Plate Type
        { wch: 40 },  // Ingredients (wider for more content)
        { wch: 20 },  // Created Date
      ];
      worksheet['!cols'] = columnWidths;
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'All Meal Records');
      
      // Generate filename with current date and total count
      const currentDate = new Date();
      const dateString = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      const filename = `all-meal-records-${this.meals.length}-meals-${dateString}.xlsx`;
      
      // Save the file
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      saveAs(blob, filename);
      
      console.log(`Excel file exported successfully: ${filename}`);
      console.log(`Total meals exported: ${this.meals.length}`);
      alert(`Successfully exported ${this.meals.length} meals to Excel!`);
      
    } catch (error) {
      console.error('Error exporting all meals to Excel:', error);
      alert('Failed to export Excel file. Please try again.');
    }
  }

  // Keep your existing method but rename for clarity
  downloadAsExcel(): void {
    // This method calls the all meals download
    this.downloadAllMealsAsExcel();
  }

  // Add method for current page only if needed
  downloadCurrentPageAsExcel(): void {
    console.log('Downloading current page meals as Excel...');
    
    if (this.paginatedMeals.length === 0) {
      alert('No meals on current page to export');
      return;
    }

    try {
      // Use only current page meals
      const excelData = this.prepareExcelDataFromArray(this.paginatedMeals);
      
      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      
      // Set column widths
      const columnWidths = [
        { wch: 8 }, { wch: 25 }, { wch: 15 }, { wch: 12 }, 
        { wch: 15 }, { wch: 40 }, { wch: 20 }
      ];
      worksheet['!cols'] = columnWidths;
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, `Page ${this.currentPage} Meal Records`);
      
      // Generate filename
      const currentDate = new Date();
      const dateString = currentDate.toISOString().split('T')[0];
      const filename = `meal-records-page-${this.currentPage}-${dateString}.xlsx`;
      
      // Save the file
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      saveAs(blob, filename);
      
      console.log(`Current page exported to Excel: ${filename}`);
      console.log(`Meals on current page: ${this.paginatedMeals.length}`);
      alert(`Successfully exported ${this.paginatedMeals.length} meals from current page!`);
      
    } catch (error) {
      console.error('Error exporting current page to Excel:', error);
      alert('Failed to export current page. Please try again.');
    }
  }

  private prepareExcelData(): any[] {
    return this.prepareExcelDataFromArray(this.meals);
  }

  private prepareExcelDataFromArray(mealsArray: Meal[]): any[] {
    return mealsArray.map((meal, index) => ({
      'Meal ID': meal.id || 'N/A',
      'Meal Name': meal.meal_name || 'N/A',
      'Meal Time': meal.meal_time || 'N/A',
      'Day Cycle': meal.day_cycle ? `${meal.day_cycle}` : 'N/A',
      'Date': this.calculateDateFromDayCycle(meal.day_cycle ?? null),
      'Plate Type': meal.plate_type || 'N/A',
    }));
  }

  private prepareExcelDataFromArray2(mealsArray: Meal[]): any[] {
    // Create a map to group meals by date and meal time
    const groupedMeals = new Map<string, Map<string, Meal[]>>();
  
    // Group meals by date and meal time
    mealsArray.forEach(meal => {
      const date = this.calculateDateFromDayCycle(meal.day_cycle);
      const mealTime = meal.meal_time || 'Unknown';
  
      // Skip meals with invalid dates
      if (date === 'N/A') return;
  
      // Create date group if it doesn't exist
      if (!groupedMeals.has(date)) {
        groupedMeals.set(date, new Map<string, Meal[]>());
      }
  
      const dateGroup = groupedMeals.get(date)!;
  
      // Create meal time group if it doesn't exist
      if (!dateGroup.has(mealTime)) {
        dateGroup.set(mealTime, []);
      }
  
      // Add meal to the appropriate group
      dateGroup.get(mealTime)!.push(meal);
    });
  
    // Convert grouped data to Excel format
    const excelData: any[] = [];
  
    // Sort dates to ensure chronological order
    const sortedDates = Array.from(groupedMeals.keys()).sort();
  
    sortedDates.forEach(date => {
      const dateGroup = groupedMeals.get(date)!;
      
      // Define meal time order for consistent display
      const mealTimeOrder = ['早餐', '午餐', '晚餐', '點心'];
      
      // Get all meal times for this date and sort them
      const sortedMealTimes = Array.from(dateGroup.keys()).sort((a, b) => {
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
        const meals = dateGroup.get(mealTime)!;
        
        // Create meal names string
        const mealNames = meals
          .map(meal => meal.meal_name || 'Unknown Meal')
          .join(', ');
  
        // Format date for display (convert YYYYMMDD to readable format)
        const formattedDate = this.formatDateForDisplay(date);
  
        excelData.push({
          '日期': formattedDate,
          '用餐時間': mealTime,
          '菜色名稱': mealNames,
          // 'Meal Count': meals.length
        });
      });
    });
  
    return excelData;
  }
  
  // Helper method to format date for display
  private formatDateForDisplay(dateString: string): string {
    if (dateString === 'N/A' || dateString.length !== 8) {
      return dateString;
    }
  
    // Return as-is since calculateDateFromDayCycle already provides YYYYMMDD format
    // No need to convert to readable format for Excel export
    return dateString;
  }
  
  // Add a method to use this new format for Excel export
  downloadGroupedMealsAsExcel(): void {
    console.log('Downloading grouped meals as Excel...');
    
    if (this.meals.length === 0) {
      alert('No meals available to export');
      return;
    }
  
    try {
      // Use the new grouped format
      const excelData = this.prepareExcelDataFromArray2(this.meals);
      
      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      
      // Set column widths for better formatting
      const columnWidths = [
        { wch: 25 },  // Date
        { wch: 15 },  // Meal Time
        { wch: 60 },  // Meals (wider for multiple meal names)
        { wch: 12 },  // Meal Count
      ];
      worksheet['!cols'] = columnWidths;
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Grouped Meal Records');
      
      // Generate filename
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const dateString = `${year}${month}${day}`;
      const filename = `${environment.careCenterName}-循環選單-${dateString}.xlsx`;
      
      // Save the file
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      saveAs(blob, filename);
      
      console.log(`Grouped Excel file exported successfully: ${filename}`);
      const uniqueDates = new Set(this.meals.map(m => this.calculateDateFromDayCycle(m.day_cycle ?? null)));
      // alert(`Successfully exported grouped meal records for ${uniqueDates.size} dates!`);
      
    } catch (error) {
      console.error('Error exporting grouped meals to Excel:', error);
      // alert('Failed to export Excel file. Please try again.');
    }
  }

  // Add this method to calculate the date based on day cycle
  private calculateDateFromDayCycle(dayCycle: number | null): string {
    if (!dayCycle || dayCycle < 1) {
      return 'N/A';
    }

    // Get cycle configuration from environment
    const cycleStartDate = new Date(environment.mealCycle.startDate);
    const cycleLength = environment.mealCycle.cycleLength;
    
    // Calculate which day in the cycle (1-14)
    const dayInCycle = ((dayCycle - 1) % cycleLength) + 1;
    
    // Calculate the actual date by adding days to the start date
    const actualDate = new Date(cycleStartDate);
    actualDate.setDate(cycleStartDate.getDate() + (dayInCycle - 1));
    
    // Format as YYYYMMDD
    const year = actualDate.getFullYear();
    const month = String(actualDate.getMonth() + 1).padStart(2, '0');
    const day = String(actualDate.getDate()).padStart(2, '0');
    
    return `${year}${month}${day}`;
  }

  // Alternative method if you want to show the current cycle iteration
  private calculateDateFromDayCycleWithIteration(dayCycle: number | null): string {
    if (!dayCycle || dayCycle < 1) {
      return 'N/A';
    }

    // Get cycle configuration from environment
    const cycleStartDate = new Date(environment.mealCycle.startDate);
    const cycleLength = environment.mealCycle.cycleLength;
    
    // Calculate which cycle iteration we're in (0-based)
    const cycleIteration = Math.floor((dayCycle - 1) / cycleLength);
    
    // Calculate which day in the current cycle (1-14)
    const dayInCycle = ((dayCycle - 1) % cycleLength) + 1;
    
    // Calculate the actual date
    const actualDate = new Date(cycleStartDate);
    actualDate.setDate(cycleStartDate.getDate() + (cycleIteration * cycleLength) + (dayInCycle - 1));
    
    // Format as YYYYMMDD
    const year = actualDate.getFullYear();
    const month = String(actualDate.getMonth() + 1).padStart(2, '0');
    const day = String(actualDate.getDate()).padStart(2, '0');
    
    return `${year}${month}${day}`;
  }
}