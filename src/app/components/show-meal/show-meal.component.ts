import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { MealsService } from '../../services/meals.service';
import { Meal } from '../../models/meal.model';

@Component({
  selector: 'app-show-meal',
  imports: [CommonModule],
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
        this.loadSameDayMeals(meal.day_cycle, meal.meal_time);
      },
      error: (err) => {
        console.error('[ShowMeal] Error:', err);
        this.error = '無法載入餐點資料';
        this.isLoading = false;
      },
    });
  }

  private loadSameDayMeals(dayCycle: number, mealTime: string): void {
    this.mealService.getMealsByDayCycleAndTime(dayCycle, mealTime).subscribe({
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
    const timeMap: Record<string, string> = { '午餐': 'L', '晚餐': 'D', '點心': 'S' };
    const code = timeMap[meal.meal_time] || 'U';
    return `${code}-${meal.day_cycle}-${meal.id}`;
  }

  getMealTimeIcon(): string {
    if (!this.meal) return '';
    return this.meal.meal_time === '午餐' ? 'assets/icons/lunch-time.svg' : 'assets/icons/dinner-time.svg';
  }

  getCycleDateLabel(): string {
    if (!this.meal) return '';
    return `第 ${this.meal.day_cycle} 天`;
  }

  goBack(): void {
    this.router.navigate(['/meal-catalog']);
  }

  viewOtherMeal(meal: Meal): void {
    this.router.navigate(['/meal-catalog', meal.id, 'view']);
  }
}
