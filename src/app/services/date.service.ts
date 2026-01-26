import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface MealCycleInfo {
  startDate: string;
  cycleLength: number;
  currentCycle: number;
  currentDay: number;
  nextCycleStartDate: string;
  isNewCycle: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class DateService {
  private selectedDateSubject = new BehaviorSubject<Date>(new Date());
  public selectedDate$: Observable<Date> = this.selectedDateSubject.asObservable();

  // Add formatted date observable if needed
  private selectedDateStringSubject = new BehaviorSubject<string>(this.formatDate(new Date()));
  public selectedDateString$: Observable<string> = this.selectedDateStringSubject.asObservable();

  // Add meal cycle observable
  private mealCycleSubject = new BehaviorSubject<MealCycleInfo>(this.calculateCurrentMealCycle());
  public mealCycle$: Observable<MealCycleInfo> = this.mealCycleSubject.asObservable();

  private cycleCheckInterval: any;

  constructor() {
    // Check for cycle updates every hour
    this.cycleCheckInterval = setInterval(() => {
      this.updateCycleIfNeeded();
    }, 60 * 60 * 1000); // 1 hour

    // Also check when the date changes
    this.selectedDate$.subscribe(() => {
      this.updateCycleIfNeeded();
    });
  }

  /**
   * Set the selected date
   * @param date The selected date
   */
  setSelectedDate(date: Date): void {
    this.selectedDateSubject.next(date);
    this.selectedDateStringSubject.next(this.formatDate(date));
    console.log('DateService: Date updated to', date);
  }

  /**
   * Get current selected date
   * @returns Current selected date
   */
  getSelectedDate(): Date {
    return this.selectedDateSubject.value;
  }

  /**
   * Get current selected date as string
   * @returns Current selected date as formatted string
   */
  getSelectedDateString(): string {
    return this.selectedDateStringSubject.value;
  }

  /**
   * Get current meal cycle information
   * @returns Current meal cycle info
   */
  getCurrentMealCycle(): MealCycleInfo {
    return this.mealCycleSubject.value;
  }

  /**
   * Calculate comprehensive meal cycle information
   * @returns Complete meal cycle information
   */
  private calculateCurrentMealCycle(): MealCycleInfo {
    const configStartDate = new Date(environment.mealCycle.startDate);
    const currentDate = new Date();
    const cycleLength = environment.mealCycle.cycleLength;

    // Normalize dates
    const normalizedStartDate = new Date(configStartDate.getFullYear(), configStartDate.getMonth(), configStartDate.getDate());
    const normalizedCurrentDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());

    // Calculate days since the original start date
    const daysSinceStart = Math.floor(
      (normalizedCurrentDate.getTime() - normalizedStartDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Calculate current cycle (0-based internally, 1-based for display)
    const currentCycleIndex = Math.floor(daysSinceStart / cycleLength);
    
    // Calculate current day within the cycle (1-based)
    const currentDay = (daysSinceStart % cycleLength) + 1;

    // Calculate the actual start date of the current cycle
    const currentCycleStartDate = new Date(normalizedStartDate);
    currentCycleStartDate.setDate(normalizedStartDate.getDate() + (currentCycleIndex * cycleLength));

    // Calculate next cycle start date
    const nextCycleStartDate = new Date(currentCycleStartDate);
    nextCycleStartDate.setDate(currentCycleStartDate.getDate() + cycleLength);

    // Check if this is a new cycle compared to previous calculation
    const previousCycle = this.mealCycleSubject?.value;
    const isNewCycle = !previousCycle || previousCycle.currentCycle !== (currentCycleIndex + 1);

    return {
      startDate: this.formatDate(currentCycleStartDate),
      cycleLength: cycleLength,
      currentCycle: currentCycleIndex + 1, // 1-based for display
      currentDay: currentDay,
      nextCycleStartDate: this.formatDate(nextCycleStartDate),
      isNewCycle: isNewCycle
    };
  }

  /**
   * Update cycle if needed (called periodically)
   */
  private updateCycleIfNeeded(): void {
    const newCycle = this.calculateCurrentMealCycle();
    const currentCycle = this.mealCycleSubject.value;

    // Update if we've moved to a new cycle
    if (newCycle.currentCycle !== currentCycle.currentCycle || 
        newCycle.currentDay !== currentCycle.currentDay) {
      console.log('DateService: Meal cycle updated:', newCycle);
      this.mealCycleSubject.next(newCycle);
    }
  }

  /**
   * Force refresh the meal cycle (useful for testing or manual refresh)
   */
  refreshMealCycle(): void {
    const newCycle = this.calculateCurrentMealCycle();
    this.mealCycleSubject.next(newCycle);
  }

  /**
   * Calculate day cycle for a given date (your existing method, enhanced)
   * StartDate is considered Day 1, next date is Day 2, and so on
   * @param date The date to calculate day cycle for
   * @returns Day cycle number (1-14 for a 14-day cycle)
   */
  calculateDayCycleForDate(date: Date): number {
    const startDate = new Date(environment.mealCycle.startDate);
    
    // Normalize dates to midnight for accurate day calculation
    const normalizedStartDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const normalizedInputDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    // Calculate difference in days
    const timeDiff = normalizedInputDate.getTime() - normalizedStartDate.getTime();
    const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
    
    // StartDate is Day 1, so we add 1 to daysDiff
    // Then use modulo to cycle through 1-14
    const currentDay = ((daysDiff % environment.mealCycle.cycleLength) + environment.mealCycle.cycleLength) % environment.mealCycle.cycleLength + 1;
    
    console.log(`DateService: Start date: ${normalizedStartDate.toDateString()}, Input date: ${normalizedInputDate.toDateString()}`);
    console.log(`DateService: Days difference: ${daysDiff}, Current day in cycle: ${currentDay}`);
    
    return currentDay;
  }

  /**
   * Get available days for meal assignment (only future/current days)
   * @returns Array of available days
   */
  getAvailableDays(): { value: string; label: string; }[] {
    const cycle = this.getCurrentMealCycle();
    const availableDays = [];

    for (let day = cycle.currentDay; day <= cycle.cycleLength; day++) {
      availableDays.push({
        value: day.toString(),
        label: `Day ${day}`
      });
    }

    return availableDays;
  }

  /**
   * Check if a specific day is available in current cycle
   * @param dayNumber Day number to check
   * @returns True if day is available
   */
  isDayAvailable(dayNumber: number): boolean {
    const cycle = this.getCurrentMealCycle();
    return dayNumber >= 1 && dayNumber <= cycle.cycleLength && dayNumber >= cycle.currentDay;
  }

  /**
   * Get the cycle day for today
   * @returns Today's cycle day number
   */
  getTodaysCycleDay(): number {
    return this.calculateDayCycleForDate(new Date());
  }

  /**
   * Get today's date
   * @returns Today's date
   */
  getTodayDate(): Date {
    return new Date();
  }

  /**
   * Get date for a specific day in the current cycle
   * @param dayInCycle Day number in cycle (1-14)
   * @returns Date object for that day
   */
  getDateForCycleDay(dayInCycle: number): Date {
    if (dayInCycle < 1 || dayInCycle > environment.mealCycle.cycleLength) {
      throw new Error(`Day in cycle must be between 1 and ${environment.mealCycle.cycleLength}`);
    }

    const cycle = this.getCurrentMealCycle();
    const startDate = new Date(cycle.startDate);
    const targetDate = new Date(startDate);
    
    // Day 1 is the start date, so we add (dayInCycle - 1) days
    targetDate.setDate(startDate.getDate() + (dayInCycle - 1));
    
    return targetDate;
  }

  /**
   * Format date to ISO string (YYYY-MM-DD)
   * @param date Date to format
   * @returns Formatted date string
   */
  private formatDate(date: Date): string {
    return date.toISOString().split("T")[0];
  }

  /**
   * Cleanup when service is destroyed
   */
  ngOnDestroy(): void {
    if (this.cycleCheckInterval) {
      clearInterval(this.cycleCheckInterval);
    }
  }
}
