import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { skip, Subscription } from 'rxjs';
import { MealsService } from '../../services/meals.service';
import { DateService } from '../../services/date.service';
import { Meal } from '../../models/meal.model';
import { compactDate, getMealMode } from '../../utils/meal.utils';

@Component({
  selector: 'app-todays-meal',
  imports: [CommonModule],
  templateUrl: './todays-meal.component.html',
  styleUrl: './todays-meal.component.scss',
})
export class TodaysMealComponent implements OnInit, OnDestroy {
  @Input() time!: string;

  iconSrc = '';
  meals: Meal[] = [];
  currentSelectedDate: Date = new Date();
  isLoading = false;
  loadingError = '';

  private dateSubscription = new Subscription();
  private modeSubscription = new Subscription();

  constructor(
    private mealsService: MealsService,
    private dateService: DateService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.setIconSrc();
    this.subscribeToDateChanges();
    this.subscribeToModeChanges();
    this.loadMealsForCurrentDate();
  }

  ngOnDestroy(): void {
    this.dateSubscription.unsubscribe();
    this.modeSubscription.unsubscribe();
  }

  private normalizeMealTime(value: string): string {
    const normalized = (value || '').trim().toLowerCase();

    if (
      normalized === '\u5348\u9910' ||
      normalized.includes('å') ||
      normalized.includes('\u5348')
    ) {
      return '\u5348\u9910';
    }

    if (
      normalized === '\u665a\u9910' ||
      normalized.includes('æ') ||
      normalized.includes('\u665a')
    ) {
      return '\u665a\u9910';
    }

    if (normalized === '\u9ede\u5fc3' || normalized === 'snack') {
      return '\u9ede\u5fc3';
    }

    return value;
  }

  private subscribeToDateChanges(): void {
    this.dateSubscription = this.dateService.selectedDate$.subscribe((date) => {
      this.currentSelectedDate = date;
      this.loadMealsForCurrentDate();
    });
  }

  private subscribeToModeChanges(): void {
    this.modeSubscription = this.dateService.menuMode$.pipe(skip(1)).subscribe(() => {
      this.loadMealsForCurrentDate();
    });
  }

  private setIconSrc(): void {
    const normalizedTime = this.normalizeMealTime(this.time);
    const timeToIconMap: Record<string, string> = {
      '\u5348\u9910': 'assets/icons/lunch-time.svg',
      '\u665a\u9910': 'assets/icons/dinner-time.svg',
      '\u9ede\u5fc3': 'assets/icons/snack-time.svg'
    };

    this.iconSrc = timeToIconMap[normalizedTime] || 'assets/icons/lunch-time.svg';
  }

  private loadMealsForCurrentDate(): void {
    if (!this.time) {
      return;
    }

    this.isLoading = true;
    this.loadingError = '';

    const normalizedTime = this.normalizeMealTime(this.time);
    const filterParams = {
      ...this.dateService.getMealFilterParamsForDate(this.currentSelectedDate),
      meal_time: normalizedTime,
    };

    this.mealsService.getMealsFiltered(filterParams).subscribe({
      next: (meals: Meal[]) => {
        this.meals = meals;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading meals:', error);
        this.meals = [];
        this.isLoading = false;
        this.loadingError = '\u8f09\u5165\u9910\u9ede\u5931\u6557\uff0c\u8acb\u7a0d\u5f8c\u518d\u8a66\u3002';
      }
    });
  }

  private getCurrentDayInCycle(): number {
    return this.dateService.calculateDayCycleForDate(this.currentSelectedDate);
  }

  getMealCode(meal: Meal): string {
    const normalizedTime = this.normalizeMealTime(this.time);
    const timeToLetterMap: Record<string, string> = {
      '\u5348\u9910': 'L',
      '\u665a\u9910': 'D',
      '\u9ede\u5fc3': 'S'
    };
    const timeCode = timeToLetterMap[normalizedTime] || 'U';

    // Open branch matches meal.utils (compact serve_date). Cyclic branch stays
    // local: uses today's cycle position rather than meal.day_cycle so the
    // code always reflects "today" even if the meal record is stale.
    if (getMealMode(meal) === 'open' && meal.serve_date) {
      return `${timeCode}-${compactDate(meal.serve_date)}-${meal.id}`;
    }
    return `${timeCode}-${this.getCurrentDayInCycle()}-${meal.id}`;
  }

  expanded = false;

  getMainMeal(): Meal | null {
    return this.meals.length > 0 ? this.meals[0] : null;
  }

  getAllMeals(): Meal[] {
    return this.meals;
  }

  toggleExpand(): void {
    this.expanded = !this.expanded;
  }

  viewMealDetail(): void {
    const main = this.getMainMeal();
    if (main) {
      this.router.navigate(['/meal-catalog', main.id, 'view']);
    }
  }

  getMealTime(): string {
    return this.normalizeMealTime(this.time);
  }
}
