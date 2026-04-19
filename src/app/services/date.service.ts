import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { SettingsService, MenuMode } from './settings.service';
import { MealsService } from './meals.service';

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
export class DateService implements OnDestroy {
  private selectedDateSubject = new BehaviorSubject<Date>(new Date());
  public selectedDate$: Observable<Date> = this.selectedDateSubject.asObservable();
  readonly menuMode$: Observable<MenuMode>;

  private selectedDateStringSubject = new BehaviorSubject<string>(this.formatDate(new Date()));
  public selectedDateString$: Observable<string> = this.selectedDateStringSubject.asObservable();

  private mealCycleSubject = new BehaviorSubject<MealCycleInfo>({
    startDate: this.formatDate(new Date()),
    cycleLength: 14,
    currentCycle: 1,
    currentDay: 1,
    nextCycleStartDate: this.formatDate(new Date()),
    isNewCycle: true,
  });
  public mealCycle$: Observable<MealCycleInfo> = this.mealCycleSubject.asObservable();

  private cycleCheckInterval: any;

  constructor(
    private settingsService: SettingsService,
    private mealsService: MealsService,
  ) {
    this.menuMode$ = this.settingsService.menuMode$;
    // Load settings first
    if (!this.settingsService.settings) {
      this.settingsService.load().then(() => {
        this.refreshMealCycle();
      });
    } else {
      this.refreshMealCycle();
    }

    // Check when the date changes
    this.selectedDate$.subscribe(() => {
      this.updateCycleIfNeeded();
    });

    // Check for cycle updates every hour
    this.cycleCheckInterval = setInterval(() => {
      this.updateCycleIfNeeded();
    }, 60 * 60 * 1000);
  }

  getCurrentMealPeriod(): '午餐' | '晚餐' | 0 {
    const settings = this.settingsService.settings;
    if (!settings) return 0;

    const now = new Date();

    const isWithinRange = (start: string, end: string): boolean => {
      const [startHour, startMin, startSec = 0] = start.split(':').map(Number);
      const [endHour, endMin, endSec = 0] = end.split(':').map(Number);

      const startTime = new Date();
      startTime.setHours(startHour, startMin, startSec, 0);

      const endTime = new Date();
      endTime.setHours(endHour, endMin, endSec, 0);

      // Handle cross-midnight ranges (e.g. 16:30 → 00:49 next day)
      // If end is before start, the range wraps past midnight
      if (endTime <= startTime) {
        // now is either after start OR before end (next day)
        return now >= startTime || now <= endTime;
      }

      return now >= startTime && now <= endTime;
    };

    if (isWithinRange(
      settings.mealTimeRanges.lunch.start,
      settings.mealTimeRanges.lunch.end
    )) {
      return '午餐';
    }

    if (isWithinRange(
      settings.mealTimeRanges.dinner.start,
      settings.mealTimeRanges.dinner.end
    )) {
      return '晚餐';
    }

    return 0;
  }

  setSelectedDate(date: Date): void {
    this.selectedDateSubject.next(date);
    this.selectedDateStringSubject.next(this.formatDate(date));
  }

  getSelectedDate(): Date {
    return this.selectedDateSubject.value;
  }

  getSelectedDateString(): string {
    return this.selectedDateStringSubject.value;
  }

  getCurrentMealCycle(): MealCycleInfo {
    return this.mealCycleSubject.value;
  }

  public calculateCurrentMealCycle(): MealCycleInfo {
    // Use default if settings are not loaded
    const mealCycle = this.settingsService.mealCycle;
    if (!mealCycle) {
      return {
        startDate: this.formatDate(new Date()),
        cycleLength: 14,
        currentCycle: 1,
        currentDay: 1,
        nextCycleStartDate: this.formatDate(new Date()),
        isNewCycle: true,
      };
    }

    const configStartDate = new Date(mealCycle.startDate);
    const cycleLength = mealCycle.cycleLength;
    const currentDate = new Date();

    const normalizedStartDate = new Date(configStartDate.getFullYear(), configStartDate.getMonth(), configStartDate.getDate());
    const normalizedCurrentDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());

    const daysSinceStart = Math.floor((normalizedCurrentDate.getTime() - normalizedStartDate.getTime()) / (1000 * 60 * 60 * 24));
    const currentCycleIndex = Math.floor(daysSinceStart / cycleLength);
    const currentDay = (daysSinceStart % cycleLength) + 1;

    const currentCycleStartDate = new Date(normalizedStartDate);
    currentCycleStartDate.setDate(normalizedStartDate.getDate() + currentCycleIndex * cycleLength);

    const nextCycleStartDate = new Date(currentCycleStartDate);
    nextCycleStartDate.setDate(currentCycleStartDate.getDate() + cycleLength);

    const previousCycle = this.mealCycleSubject.value;
    const isNewCycle = !previousCycle || previousCycle.currentCycle !== currentCycleIndex + 1;

    return {
      startDate: this.formatDate(currentCycleStartDate),
      cycleLength: cycleLength,
      currentCycle: currentCycleIndex + 1,
      currentDay: currentDay,
      nextCycleStartDate: this.formatDate(nextCycleStartDate),
      isNewCycle: isNewCycle,
    };
  }

  private updateCycleIfNeeded(): void {
    const newCycle = this.calculateCurrentMealCycle();
    const currentCycle = this.mealCycleSubject.value;

    if (newCycle.currentCycle !== currentCycle.currentCycle || newCycle.currentDay !== currentCycle.currentDay) {
      this.mealCycleSubject.next(newCycle);
    }
  }

  refreshMealCycle(): void {
    const newCycle = this.calculateCurrentMealCycle();
    this.mealCycleSubject.next(newCycle);
  }

  calculateDayCycleForDate(date: Date): number {
    const mealCycle = this.settingsService.mealCycle;
    const cycleLength = mealCycle?.cycleLength ?? 14;
    const startDate = mealCycle ? new Date(mealCycle.startDate) : new Date();

    const normalizedStartDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const normalizedInputDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const daysDiff = Math.floor((normalizedInputDate.getTime() - normalizedStartDate.getTime()) / (1000 * 3600 * 24));

    return ((daysDiff % cycleLength) + cycleLength) % cycleLength + 1;
  }

  getAvailableDays(): { value: string; label: string }[] {
    const cycle = this.getCurrentMealCycle();
    const availableDays = [];
    for (let day = cycle.currentDay; day <= cycle.cycleLength; day++) {
      availableDays.push({ value: day.toString(), label: `Day ${day}` });
    }
    return availableDays;
  }

  isDayAvailable(dayNumber: number): boolean {
    const cycle = this.getCurrentMealCycle();
    return dayNumber >= 1 && dayNumber <= cycle.cycleLength && dayNumber >= cycle.currentDay;
  }

  getTodaysCycleDay(): number {
    return this.calculateDayCycleForDate(new Date());
  }

  getCurrentMenuMode(): 'cyclic' | 'open' {
    return this.settingsService.menuMode;
  }

  /**
   * Return the filter params to query meals/assignments for a given date,
   * based on the active menu mode. In cyclic mode returns {day_cycle}; in
   * open mode returns {serve_date: 'YYYY-MM-DD'}.
   */
  getMealFilterParamsForDate(date: Date): { [key: string]: string } {
    const mode = this.getCurrentMenuMode();
    if (mode === 'open') {
      return { menu_mode: 'open', serve_date: this.formatDate(date) };
    }
    return { menu_mode: 'cyclic', day_cycle: this.calculateDayCycleForDate(date).toString() };
  }

  getTodayMealFilterParams(): { [key: string]: string } {
    return this.getMealFilterParamsForDate(new Date());
  }

  getTodayDate(): Date {
    return new Date();
  }

  getDateForCycleDay(dayInCycle: number): Date {
    const cycle = this.getCurrentMealCycle();
    const cycleLength = cycle.cycleLength;

    if (dayInCycle < 1 || dayInCycle > cycleLength) {
      throw new Error(`Day in cycle must be between 1 and ${cycleLength}`);
    }

    const startDate = new Date(cycle.startDate);
    const targetDate = new Date(startDate);
    targetDate.setDate(startDate.getDate() + (dayInCycle - 1));
    return targetDate;
  }

  private formatDate(date: Date): string {
    // Use local components — toISOString() converts to UTC and can off-by-one
    // in non-UTC timezones (e.g. UTC+8 → 2026-04-20 local becomes 2026-04-19Z).
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  /**
   * Open-mode counterpart to getAvailableDays(). Queries backend for all
   * open-mode meals and returns their distinct serve_dates, sorted, each
   * with a weekday-decorated label. Used by add-meal single-form and
   * add-patient multi-select when menu mode is 'open'.
   */
  getAvailableServeDates(): Observable<{ value: string; label: string }[]> {
    return this.mealsService.getMealsFiltered({ menu_mode: 'open' }).pipe(
      map(meals => {
        const dates = [...new Set(
          meals.map(m => m.serve_date).filter((d): d is string => !!d)
        )].sort();
        return dates.map(d => ({
          value: d,
          label: `${d} (${this.getWeekdayLabel(d)})`,
        }));
      }),
    );
  }

  /**
   * Returns Chinese weekday label for a YYYY-MM-DD date string.
   * Public so components can format serve_date displays consistently.
   */
  getWeekdayLabel(dateStr: string): string {
    const d = new Date(dateStr);
    return ['週日', '週一', '週二', '週三', '週四', '週五', '週六'][d.getDay()];
  }

  ngOnDestroy(): void {
    if (this.cycleCheckInterval) {
      clearInterval(this.cycleCheckInterval);
    }
  }
}