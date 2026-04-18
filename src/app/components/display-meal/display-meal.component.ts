import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MealsService } from '../../services/meals.service';
import { DateService } from '../../services/date.service';
import { PlateTypeLabelPipe } from '../../pipes/plate-type-label.pipe';
import { Meal } from '../../models/meal.model';

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { SettingsService } from '../../services/settings.service';
import { AssignMealDialogComponent } from '../assign-meal-dialog/assign-meal-dialog.component';
import { BulkAssignResponse } from '../../services/meal-assignment.service';

@Component({
  selector: 'app-display-meal',
  imports: [CommonModule, FormsModule, RouterModule, PlateTypeLabelPipe, AssignMealDialogComponent],
  templateUrl: './display-meal.component.html',
  styleUrl: './display-meal.component.scss'
})
export class DisplayMealComponent implements OnInit, OnChanges {
  @Input() searchQuery = '';
  meals: Meal[] = [];
  filteredMeals: Meal[] = [];
  paginatedMeals: Meal[] = [];
  isLoading = false;
  error: string | null = null;
  isDownloading = false;

  filterDay = '';
  filterTime = '';

  currentPage = 1;
  pageSize = 15;
  totalMeals = 0;
  totalPages = 0;
  targetPage: number | null = null;

  constructor(
    private mealsService: MealsService,
    private dateService: DateService,
    private settingsService: SettingsService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.getMeals();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['searchQuery']) {
      this.applyFilter();
    }
  }

  //utilize getMeals from meals services and log them on init
  getMeals(): void {
    this.isLoading = true;
    this.error = null;

    this.mealsService.getMeals().subscribe({
      next: (meals: Meal[]) => {
        this.meals = meals;
        this.applyFilter();
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
    this.paginatedMeals = this.filteredMeals.slice(startIndex, endIndex);
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

  applyFilter(): void {
    // Hard mode filter first: system mode decides which meals are visible.
    // Legacy rows without menu_mode default to 'cyclic' via ?? fallback.
    const mode = this.settingsService.menuMode;
    let result = this.meals.filter(m => (m.menu_mode ?? 'cyclic') === mode);

    if (this.filterDay) {
      result = result.filter(m => String(m.day_cycle) === this.filterDay);
    }
    if (this.filterTime) {
      result = result.filter(m => m.meal_time === this.filterTime);
    }
    // Search query: match meal name, date (M/D), day number, meal time
    const q = (this.searchQuery || '').trim().toLowerCase();
    if (q) {
      result = result.filter(m => {
        const name = (m.meal_name || '').toLowerCase();
        const isOpen = m.menu_mode === 'open';
        const dayLabel = isOpen ? '' : `第${m.day_cycle}天`;
        const dateLabel = isOpen
          ? (m.serve_date || '')
          : this.getDateForDay(m.day_cycle);
        return name.includes(q) ||
          (dayLabel && dayLabel.includes(q)) ||
          dateLabel.includes(q) ||
          (m.meal_time || '').includes(q);
      });
    }
    // Sort: open meals by serve_date ascending; cyclic by day_cycle; then meal_time then id
    result.sort((a, b) => {
      const aOpen = a.menu_mode === 'open';
      const bOpen = b.menu_mode === 'open';
      if (aOpen && bOpen) {
        const aDate = a.serve_date || '';
        const bDate = b.serve_date || '';
        if (aDate !== bDate) return aDate < bDate ? -1 : 1;
      } else if (!aOpen && !bOpen) {
        const aDay = a.day_cycle ?? 0;
        const bDay = b.day_cycle ?? 0;
        if (aDay !== bDay) return aDay - bDay;
      } else {
        return aOpen ? 1 : -1;
      }
      if (a.meal_time !== b.meal_time) return a.meal_time === '午餐' ? -1 : 1;
      return a.id - b.id;
    });
    this.filteredMeals = result;
    this.totalMeals = result.length;
    this.currentPage = 1;
    this.calculatePagination();
    this.updatePaginatedMeals();
  }

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

    const mode = meal.menu_mode ?? 'cyclic';
    if (mode === 'open' && meal.serve_date) {
      const compactDate = meal.serve_date.replace(/-/g, '');
      return `${mealLetter}-${compactDate}-${meal.id ?? ''}`;
    }

    const dayCycle = meal.day_cycle ?? '';
    const mealId = meal.id ?? '';
    return `${mealLetter}-${dayCycle}-${mealId}`;
  }

  /** Cell content for 天數 column. cyclic shows "第 N 天"; open shows "-". */
  formatDayLabel(meal: Meal): string {
    if ((meal.menu_mode ?? 'cyclic') === 'open') return '-';
    return `第 ${meal.day_cycle} 天`;
  }

  /** Cell content for 日期 column. cyclic shows computed M/D; open shows "YYYY-MM-DD (週X)". */
  formatDateLabel(meal: Meal): string {
    if ((meal.menu_mode ?? 'cyclic') === 'open' && meal.serve_date) {
      return `${meal.serve_date} (${this.dateService.getWeekdayLabel(meal.serve_date)})`;
    }
    return this.getDateForDay(meal.day_cycle);
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
    this.router.navigate(['/meal-catalog', meal.id, 'edit']);
  }

  // === Assign-to-residents dialog (Phase 5) ===

  assignDialogOpen = false;
  assignDialogMeals: Meal[] = [];

  openAssignDialog(meal: Meal): void {
    this.assignDialogMeals = [meal];
    this.assignDialogOpen = true;
  }

  closeAssignDialog(): void {
    this.assignDialogOpen = false;
    this.assignDialogMeals = [];
  }

  onAssignCompleted(res: BulkAssignResponse): void {
    this.assignDialogOpen = false;
    this.assignDialogMeals = [];
    alert(`配餐完成：新建 ${res.created} 筆、略過 ${res.skipped} 筆重複。`);
  }

  deleteMeal(meal: Meal): void {
    if (confirm(`確定要刪除「${meal.meal_name}」(${this.getMealCode(meal)})？`)) {
      this.mealsService.deleteMeal(meal.id).subscribe({
        next: () => this.getMeals(),
        error: (err) => alert('刪除失敗: ' + (err?.error?.detail || '未知錯誤')),
      });
    }
  }

  // Utility methods
  refreshMeals(): void {
    console.log('Refreshing meals...');
    this.getMeals();
  }

  getDateForDay(dayCycle: number): string {
    try {
      const d = this.dateService.getDateForCycleDay(dayCycle);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    } catch {
      return '';
    }
  }

  trackByMealId(index: number, meal: Meal): number {
    return meal.id;
  }

  downloadMealCycleAsExcel(): void {
    // Respect the system's current menu mode. Produces two genuinely different Excel files:
    //   cyclic → 4 columns (日期, 日週期, 用餐時間, 菜色名稱), YYYYMMDD date strings
    //   open   → 3 columns (日期, 用餐時間, 菜色名稱), ISO date strings
    // Filenames follow the durable 機構名稱-菜單-模式-日期.xlsx convention.
    const mode = this.settingsService.menuMode;
    console.log(`Downloading ${mode} mode menu as Excel...`);

    // Export what's actually visible/filtered, not the entire raw meals array.
    // filteredMeals already has the hard mode-filter applied in applyFilter().
    if (this.filteredMeals.length === 0) {
      alert('目前沒有可匯出的菜色。');
      return;
    }

    this.isDownloading = true;

    try {
      const excelData = mode === 'open'
        ? this.prepareOpenExcelData(this.filteredMeals)
        : this.prepareExcelDataFromArray2(this.filteredMeals);

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);

      worksheet['!cols'] = mode === 'open'
        ? [{ wch: 12 }, { wch: 15 }, { wch: 60 }]
        : [{ wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 60 }];

      const sheetName = mode === 'open' ? '開放菜單' : '循環菜單';
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

      // Filename: 機構名稱-菜單-模式-YYYYMMDD.xlsx
      const today = this.dateService.getTodayDate();
      const dateString =
        today.getFullYear() +
        String(today.getMonth() + 1).padStart(2, '0') +
        String(today.getDate()).padStart(2, '0');
      const modeLabel = mode === 'open' ? '開放' : '循環';
      const filename = `${this.settingsService.careCenterName}-菜單-${modeLabel}-${dateString}.xlsx`;

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      saveAs(blob, filename);
      console.log(`Excel exported: ${filename}`);
    } catch (error) {
      console.error('Error exporting menu to Excel:', error);
      alert('匯出失敗，請再試一次。');
    } finally {
      this.isDownloading = false;
    }
  }

  /**
   * Open-mode Excel: group by serve_date + meal_time, ISO dates,
   * same column schema as the add_open_meal_cycle backend importer expects
   * (日期 / 用餐時間 / 菜色名稱).
   */
  private prepareOpenExcelData(mealsArray: Meal[]): any[] {
    const grouped = new Map<string, Map<string, string[]>>();

    for (const m of mealsArray) {
      if ((m.menu_mode ?? 'cyclic') !== 'open') continue;
      if (!m.serve_date) continue;
      const dateKey = m.serve_date;
      const time = m.meal_time || '未分類';
      if (!grouped.has(dateKey)) grouped.set(dateKey, new Map());
      const byTime = grouped.get(dateKey)!;
      if (!byTime.has(time)) byTime.set(time, []);
      byTime.get(time)!.push(m.meal_name || '');
    }

    const mealTimeOrder = ['早餐', '午餐', '晚餐', '點心'];
    const rows: any[] = [];
    const sortedDates = Array.from(grouped.keys()).sort();

    for (const dateKey of sortedDates) {
      const byTime = grouped.get(dateKey)!;
      const sortedTimes = Array.from(byTime.keys()).sort((a, b) => {
        const ia = mealTimeOrder.indexOf(a);
        const ib = mealTimeOrder.indexOf(b);
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia === -1 && ib !== -1) return 1;
        if (ia !== -1 && ib === -1) return -1;
        return a.localeCompare(b);
      });
      for (const time of sortedTimes) {
        const names = byTime.get(time)!.filter(n => n.trim()).join(', ');
        rows.push({
          '日期': dateKey,
          '用餐時間': time,
          '菜色名稱': names,
        });
      }
    }

    return rows;
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
