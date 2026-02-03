import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { Meal } from '../../../../models/meal.model';
import { MealsService } from '../../../../services/meals.service';
import { DateService } from '../../../../services/date.service';

@Component({
  selector: 'app-todays-meal',
  imports: [CommonModule],
  templateUrl: './todays-meal.component.html',
  styleUrl: './todays-meal.component.scss',
})
export class TodaysMealComponent implements OnInit, OnDestroy {
  @Input() time!: string;
  
  iconSrc: string = '';
  meals: Meal[] = []; // Now stores only filtered meals from backend
  currentSelectedDate: Date = new Date();
  isLoading: boolean = false;
  loadingError: string = '';
  
  private dateSubscription: Subscription = new Subscription();

  constructor(
    private mealsService: MealsService,
    private dateService: DateService
  ) {}

  ngOnInit(): void {
    this.setIconSrc();
    this.subscribeToDateChanges();
    this.loadMealsForCurrentDate();
  }

  ngOnDestroy(): void {
    this.dateSubscription.unsubscribe();
  }

  /**
   * Subscribe to date changes from the date service
   */
  private subscribeToDateChanges(): void {
    this.dateSubscription = this.dateService.selectedDate$.subscribe(date => {
      this.currentSelectedDate = date;
      console.log('TodaysMealComponent: Date changed to:', date);
      
      // Load new meals when date changes
      this.loadMealsForCurrentDate();
    });
  }

  private setIconSrc(): void {
    const timeToIconMap: { [key: string]: string } = {
      '午餐': 'assets/icons/lunch-time.svg',
      '晚餐': 'assets/icons/dinner-time.svg',
      'snack': 'assets/icons/snack-time.svg'
    };

    if (this.time) {
      this.iconSrc = timeToIconMap[this.time] || 'assets/icons/lunch-time.svg';
    } else {
      this.iconSrc = 'assets/icons/lunch-time.svg';
    }
  }
  
  /**
   * Load meals for current date and time using backend filtering
   */
  private loadMealsForCurrentDate(): void {
    if (!this.time) {
      console.warn('TodaysMealComponent: No time specified');
      return;
    }

    this.isLoading = true;
    this.loadingError = '';
    
    const currentDay = this.getCurrentDayInCycle();
    
    console.log(`Loading meals for Day ${currentDay}, Time: ${this.time}`);
    
    // Use the new backend filtering method
    this.mealsService.getMealsByDayCycleAndTime(currentDay, this.time).subscribe({
      next: (meals: Meal[]) => {
        this.meals = meals;
        this.isLoading = false;
        console.log(`Loaded ${meals.length} meals for Day ${currentDay} ${this.time}:`, meals);
      },
      error: (error) => {
        console.error('Error loading meals:', error);
        this.meals = [];
        this.isLoading = false;
        this.loadingError = 'Failed to load meals. Please try again.';
      }
    });
  }

  /**
   * Calculate current day in the meal cycle using the selected date from DateService
   * @returns Current day number in cycle (1-14 for a 14-day cycle)
   */
  private getCurrentDayInCycle(): number {
    return this.dateService.calculateDayCycleForDate(this.currentSelectedDate);
  }

  /**
   * Generate custom meal code based on time input, day cycle, and meal ID
   * @param meal The meal object
   * @returns Custom meal code (e.g., 'L-6-49' for lunch, day 6, meal ID 49)
   */
  getMealCode(meal: Meal): string {
    const currentDay = this.getCurrentDayInCycle();
    
    // Map time to letter code
    const timeToLetterMap: { [key: string]: string } = {
      '午餐': 'L', // Lunch
      '晚餐': 'D', // Dinner
      'snack': 'S'  // Snack
    };
    
    const timeCode = timeToLetterMap[this.time] || 'U'; // U for Unknown
    
    return `${timeCode}-${currentDay}-${meal.id}`;
  }

  /**
   * Get the meals for template display (now directly from backend-filtered results)
   * @returns Array of meals filtered by day cycle and time serving
   */
  getMealsForDisplay(): Meal[] {
    return this.meals;
  }

  /**
   * Refresh meals for current date and time
   */
  refreshMeals(): void {
    this.loadMealsForCurrentDate();
  }

  /**
   * Check if there are meals to display
   * @returns True if meals are available
   */
  hasMeals(): boolean {
    return this.meals.length > 0;
  }

  /**
   * Get loading state
   * @returns True if currently loading
   */
  isLoadingMeals(): boolean {
    return this.isLoading;
  }

  /**
   * Get error message if any
   * @returns Error message or empty string
   */
  getErrorMessage(): string {
    return this.loadingError;
  }

  /**
   * Get the current day number for display purposes
   * @returns Current day number in cycle
   */
  getCurrentDay(): number {
    return this.getCurrentDayInCycle();
  }

  /**
   * Get meal time for display
   * @returns Formatted meal time
   */
  getMealTime(): string {
    return this.time;
  }
}
