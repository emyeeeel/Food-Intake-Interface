import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { MealsService } from '../../services/meals.service';
import { DateService } from '../../services/date.service';
import { PlateTypeLabelPipe } from '../../pipes/plate-type-label.pipe';
import { Meal } from '../../models/meal.model';
import { getMealCode as sharedGetMealCode } from '../../utils/meal.utils';

@Component({
  selector: 'app-show-meal',
  imports: [CommonModule, PlateTypeLabelPipe],
  templateUrl: './show-meal.component.html',
  styleUrl: './show-meal.component.scss',
})
export class ShowMealComponent implements OnInit {
  @Input() mealId: number | null = null;

  meal: Meal | null = null;
  sameMealGroupMeals: Meal[] = [];
  isLoading = true;
  error = '';

  constructor(
    private mealService: MealsService,
    private dateService: DateService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.mealId = Number(id);
        this.fetchMealDetails();
      }
    });
  }

  fetchMealDetails(): void {
    if (!this.mealId) return;

    this.isLoading = true;
    this.error = '';

    this.mealService.getMeal(this.mealId).subscribe({
      next: (meal) => {
        this.meal = meal;
        this.loadSameGroupMeals(meal);
      },
      error: (err) => {
        console.error('[ShowMeal] Error:', err);
        this.error = '無法載入餐點資料';
        this.isLoading = false;
      },
    });
  }

  /**
   * Load the sibling meals that share this meal's group.
   * Group key differs by mode: cyclic = (day_cycle, meal_time); open = (serve_date, meal_time).
   */
  private loadSameGroupMeals(meal: Meal): void {
    const mode = meal.menu_mode ?? 'cyclic';
    const params: { [key: string]: string | number | undefined } = {
      menu_mode: mode,
      meal_time: meal.meal_time,
    };
    if (mode === 'open' && meal.serve_date) {
      params['serve_date'] = meal.serve_date;
    } else if (meal.day_cycle) {
      params['day_cycle'] = meal.day_cycle;
    }

    this.mealService.getMealsFiltered(params).subscribe({
      next: (meals) => {
        this.sameMealGroupMeals = meals;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  getMealCode(meal: Meal): string {
    return sharedGetMealCode(meal);
  }

  getMealTimeIcon(): string {
    if (!this.meal) return '';
    return this.meal.meal_time === '午餐' ? 'assets/icons/lunch-time.svg' : 'assets/icons/dinner-time.svg';
  }

  getCycleDateLabel(): string {
    if (!this.meal) return '';
    const mode = this.meal.menu_mode ?? 'cyclic';
    if (mode === 'open' && this.meal.serve_date) {
      return `${this.meal.serve_date} (${this.dateService.getWeekdayLabel(this.meal.serve_date)})`;
    }
    return `第 ${this.meal.day_cycle} 天`;
  }

  goBack(): void {
    this.router.navigate(['/meal-catalog']);
  }

  viewOtherMeal(meal: Meal): void {
    this.router.navigate(['/meal-catalog', meal.id, 'view']);
  }
}
