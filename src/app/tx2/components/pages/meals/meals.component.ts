import { Component } from '@angular/core';
import { HeaderComponent } from "../../components/header/header.component";
import { DateContainerComponent } from "../../../../components/date-container/date-container.component";
import { TodaysMealComponent } from "../../components/todays-meal/todays-meal.component";
import { Router } from '@angular/router';

@Component({
  selector: 'app-meals',
  imports: [HeaderComponent, DateContainerComponent, TodaysMealComponent],
  templateUrl: './meals.component.html',
  styleUrl: './meals.component.scss',
})
export class MealsComponent {

  constructor(
    private router: Router,
  ) {}

  navigateToAddMeal(): void {
    this.router.navigate(['/meal-catalog/add']);
  }

  navigateToAllMeals(): void {
    this.router.navigate(['/meal-catalog/all']);
  }

  navigateToPrintMeal(): void {
    this.router.navigate(['/meal-catalog/print']);
  }
}
