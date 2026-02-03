import { Component, inject } from '@angular/core';
import { HeaderComponent } from "../../components/header/header.component";
import { DateContainerComponent } from "../../../components/date-container/date-container.component";
import { TodaysMealComponent } from "../../components/todays-meal/todays-meal.component";
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-meals',
  imports: [HeaderComponent, DateContainerComponent, TodaysMealComponent],
  templateUrl: './meals.component.html',
  styleUrl: './meals.component.scss',
})
export class MealsComponent {

  private snackBar = inject(MatSnackBar);

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

  showMessage(){
    this.snackBar.open('Message here', 'Dismiss', {
      duration: 5000,
      horizontalPosition: 'end', // Right side of the screen
      verticalPosition: 'top',   // Top of the screen
      panelClass: ['my-custom-snackbar'] // Custom class to apply margin
    });

    // this.snackBar.openFromComponent(ToastNotifComponent, {
    //   duration: 5000,
    //   horizontalPosition: 'end', 
    //   verticalPosition: 'top'   
    // });
    
  }
}
