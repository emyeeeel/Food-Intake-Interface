import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { MealsService } from '../../services/meals.service';
import { DateService } from '../../services/date.service';
import { Meal } from '../../models/meal.model';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-todays-meal',
  imports: [CommonModule],
  templateUrl: './todays-meal.component.html',
  styleUrl: './todays-meal.component.scss',
})
export class TodaysMealComponent implements OnInit, OnDestroy {
  @Input() time!: string;
  
  iconSrc: string = '';
  meals: Meal[] = [];
  filteredMeals: Meal[] = [];
  finalFilteredMeals: Meal[] = [];
  currentSelectedDate: Date = new Date();
  
  private dateSubscription: Subscription = new Subscription();

  constructor(
    private mealsService: MealsService,
    private dateService: DateService
  ) {}

  ngOnInit(): void {
    this.setIconSrc();
    this.subscribeToDateChanges();
    this.getAllMeals();
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
      
      // Refilter meals when date changes (only if meals are already loaded)
      if (this.meals.length > 0) {
        this.filteredMeals = this.filterMealsByCycle();
        this.finalFilteredMeals = this.filterMealsByTime();
        console.log('Refiltered meals for new date - Day cycle:', this.getCurrentDayInCycle());
        console.log('Final filtered meals:', this.finalFilteredMeals);
      }
    });
  }

  private setIconSrc(): void {
    const timeToIconMap: { [key: string]: string } = {
      '午餐': 'assets/icons/lunch-time.svg',
      '晚餐': 'assets/icons/dinner-time.svg',
      'snack': 'assets/icons/snack-time.svg'
    };

    if (this.time) {
      const timeKey = this.time.toLowerCase();
      this.iconSrc = timeToIconMap[timeKey] || 'assets/icons/lunch-time.svg';
    } else {
      this.iconSrc = 'assets/icons/lunch-time.svg';
    }
  }
  
  private getAllMeals(): void {
    this.mealsService.getMeals().subscribe({
      next: (meals: Meal[]) => {
        this.meals = meals;
        // Filter meals based on current selected date
        this.filteredMeals = this.filterMealsByCycle();
        this.finalFilteredMeals = this.filterMealsByTime();
        console.log('Meals loaded:', this.meals);
        console.log('Filtered meals by day cycle for selected date:', this.filteredMeals);
        console.log('Final filtered meals by time:', this.finalFilteredMeals);
      },
      error: (error) => {
        console.error('Error loading meals:', error);
        this.meals = [];
        this.filteredMeals = [];
        this.finalFilteredMeals = [];
      }
    });
  }

  /**
   * Filter meals based on day cycle for the currently selected date
   */
  private filterMealsByCycle(): Meal[] {
    const currentDay = this.getCurrentDayInCycle();
    
    return this.meals.filter((meal: Meal) => {
      return meal.day_cycle === currentDay;
    });
  }

  /**
   * Filter meals by time serving after filtering by day cycle
   */
  private filterMealsByTime(): Meal[] {
    return this.filteredMeals.filter((meal: Meal) => {
      return meal.meal_time === this.time;
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
   * Get the final filtered meals for template display
   * @returns Array of meals filtered by day cycle and time serving
   */
  getMealsForDisplay(): Meal[] {
    return this.finalFilteredMeals;
  }
}
