import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MealsService } from '../../services/meals.service';
import { DateService } from '../../services/date.service';
import { Meal } from '../../models/meal.model';

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

  constructor(
    private mealsService: MealsService,
    private dateService: DateService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.setIconSrc();
    this.subscribeToDateChanges();
    this.loadMealsForCurrentDate();
  }

  ngOnDestroy(): void {
    this.dateSubscription.unsubscribe();
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

    // Mode-aware middle segment: open uses compact serve_date,
    // cyclic uses current day_cycle. Matches show-meal formatting.
    const mode = meal.menu_mode ?? 'cyclic';
    if (mode === 'open' && meal.serve_date) {
      const compactDate = meal.serve_date.replace(/-/g, '');
      return `${timeCode}-${compactDate}-${meal.id}`;
    }
    const currentDay = this.getCurrentDayInCycle();
    return `${timeCode}-${currentDay}-${meal.id}`;
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
