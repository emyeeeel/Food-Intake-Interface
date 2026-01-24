import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DateService {
  private selectedDateSubject = new BehaviorSubject<Date>(new Date());
  public selectedDate$: Observable<Date> = this.selectedDateSubject.asObservable();

  // Add formatted date observable if needed
  private selectedDateStringSubject = new BehaviorSubject<string>(this.formatDate(new Date()));
  public selectedDateString$: Observable<string> = this.selectedDateStringSubject.asObservable();

  constructor() {}

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
   * Calculate day cycle for a given date
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

    const startDate = new Date(environment.mealCycle.startDate);
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
}
