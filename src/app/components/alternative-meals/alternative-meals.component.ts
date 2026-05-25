import { Component, Input, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlternativeMealsService } from '../../services/alternative-meals.service';
import { MealRecommendation, MealRecommendationsResponse } from '../../models/meal-recommendation.model';

@Component({
  selector: 'app-alternative-meals',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alternative-meals.component.html',
  styleUrls: ['./alternative-meals.component.scss'],
})
export class AlternativeMealsComponent implements OnChanges {
  @Input() patientId!: number;
  @Input() period: 'daily' | 'weekly' | 'monthly' = 'daily';

  recommendations: MealRecommendation[] = [];
  loading = false;
  error: string | null = null;

  private cache: Partial<Record<'daily' | 'weekly' | 'monthly', MealRecommendationsResponse>> = {};

  constructor(
    private alternativeMealsService: AlternativeMealsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['patientId'] || changes['period']) {
      if (this.patientId) {
        this.load();
      }
    }
  }

  private load(): void {
    if (this.cache[this.period]) {
      this.recommendations = this.cache[this.period]!.recommendations;
      return;
    }

    this.loading = true;
    this.error = null;
    this.recommendations = [];

    const request$ = this.period === 'daily'
      ? this.alternativeMealsService.getDayRecommendations(this.patientId)
      : this.period === 'weekly'
        ? this.alternativeMealsService.getWeekRecommendations(this.patientId)
        : this.alternativeMealsService.getMonthRecommendations(this.patientId);

    request$.subscribe({
      next: (response) => {
        this.cache[this.period] = response;
        this.recommendations = response.recommendations;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Unable to load alternative meal recommendations';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }
}
