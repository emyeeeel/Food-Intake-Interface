import { Component, inject } from '@angular/core';
import { HeaderComponent } from "../../components/header/header.component";
import { DateContainerComponent } from "../../../components/date-container/date-container.component";
import { TodaysMealComponent } from "../../components/todays-meal/todays-meal.component";
import { Router } from '@angular/router';
import { NotificationService } from '../../services/notification.service';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-meals',
  imports: [HeaderComponent, DateContainerComponent, TodaysMealComponent],
  templateUrl: './meals.component.html',
  styleUrl: './meals.component.scss',
})
export class MealsComponent {


  constructor(
    private router: Router,
    private notificationService: NotificationService,
    private auth: Auth
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

  async showMessage() {
    const user = this.auth.currentUser; 
    if (!user) return;
  
    await this.notificationService.addNotification({
      firebase_uid: user.uid,
      title: 'Test',
      message: 'Test notif added',
      read: false
    });
  }

  // const user = this.auth.currentUser;
  // if (user) {
  //   const uid = user.uid;
  //   this.notificationService.fetchNotifications(uid);
  // }
}
