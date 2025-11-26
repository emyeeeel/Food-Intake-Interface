import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // Add this import
import { Router } from '@angular/router'; // Add this import
import { MenuBarComponent } from "../../components/menu-bar/menu-bar.component";
import { MainOptionsComponent } from "../../components/main-options/main-options.component";
import { DateContainerComponent } from "../../components/date-container/date-container.component";
import { FilterIconComponent } from "../../components/filter-icon/filter-icon.component";
import { SearchBarComponent } from "../../components/search-bar/search-bar.component";
import { NotifComponent } from "../../components/notif/notif.component";
import { BackComponent } from "../../components/back/back.component";
import { FilterOptionsComponent } from "../../components/filter-options/filter-options.component";
import { IntakeLogComponent } from "../../components/intake-log/intake-log.component";

@Component({
  selector: 'app-meal-intake',
  imports: [
    CommonModule, // Add CommonModule here
    MenuBarComponent,
    MainOptionsComponent,
    DateContainerComponent,
    FilterIconComponent,
    SearchBarComponent,
    NotifComponent,
    BackComponent,
    FilterOptionsComponent,
    IntakeLogComponent
],
  templateUrl: './meal-intake.component.html',
  styleUrl: './meal-intake.component.scss'
})
export class MealIntakeComponent {
  filterOptions: string[] = [
    '低過敏源飲食',
    '高纖維飲食',
    '低鈉飲食',
    '低脂飲食',
    '無乳糖飲食'
  ];

  constructor(private router: Router) {} // Add constructor

  navigateToAddIntake(): void {
    console.log('Navigate to Add Intake Log');
    this.router.navigate(['/meal-intake/add']);
  }

  navigateToAllLogs(): void {
    console.log('Navigate to See All Logs');
    this.router.navigate(['/meal-intake/all']);
  }

  navigateToPrintLogs(): void {
    console.log('Navigate to Print Intake Log');
    this.router.navigate(['/meal-intake/print']);
  }

}
