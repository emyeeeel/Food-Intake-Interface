import { Component, Input, OnInit } from '@angular/core';
import { MealsService } from '../../services/meals.service';
import { Meal } from '../../models/meal.model';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-show-meal',
  imports: [],
  templateUrl: './show-meal.component.html',
  styleUrl: './show-meal.component.scss',
})
export class ShowMealComponent implements OnInit {
  mealId: number | null = null;
  meal: Meal | any;

  constructor(private mealService: MealsService, private route: ActivatedRoute) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      this.mealId = id ? Number(id) : null;

      if (this.mealId) {
        this.fetchMealDetails();
      }
    });
    this.fetchMealDetails();
  }

  fetchMealDetails(): void {

    if (this.mealId === null) {
      return;
    }

    this.mealService.getMeal(this.mealId).subscribe({
      next: (response) => {
        this.meal = response;
      },
      error: (err) => {
        console.error('Error:', err);
      }
    });
  }
}
