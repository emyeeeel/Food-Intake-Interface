import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // Add this import
import { NavigationEnd, Router } from '@angular/router'; // Add this import
import { MenuBarComponent } from "../../components/menu-bar/menu-bar.component";
import { MainOptionsComponent } from "../../components/main-options/main-options.component";
import { DateContainerComponent } from "../../components/date-container/date-container.component";
import { FilterIconComponent } from "../../components/filter-icon/filter-icon.component";
import { SearchBarComponent } from "../../components/search-bar/search-bar.component";
import { NotifComponent } from "../../components/notif/notif.component";
import { BackComponent } from "../../components/back/back.component";
import { FilterOptionsComponent } from "../../components/filter-options/filter-options.component";
import { IntakeLogComponent } from "../../components/intake-log/intake-log.component";
import { filter } from 'rxjs';
import { AddIntakeComponent } from "../../components/add-intake/add-intake.component";
import { DisplayIntakeComponent } from '../../components/display-intake/display-intake.component';

@Component({
  selector: 'app-meal-intake',
  imports: [
    CommonModule,
    MenuBarComponent,
    MainOptionsComponent,
    DateContainerComponent,
    FilterIconComponent,
    SearchBarComponent,
    NotifComponent,
    BackComponent,
    FilterOptionsComponent,
    IntakeLogComponent,
    AddIntakeComponent,
    DisplayIntakeComponent
],
  templateUrl: './meal-intake.component.html',
  styleUrl: './meal-intake.component.scss'
})
export class MealIntakeComponent {
  isMobileMenuOpen = false; 
  currentView: string = 'default'; 
  filterOptions: string[] = [
    '低過敏源飲食',
    '高纖維飲食',
    '低鈉飲食',
    '低脂飲食',
    '無乳糖飲食'
  ];

  constructor(private router: Router) {} 

  ngOnInit(): void {
    // Update view on navigation
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.updateCurrentView(event.urlAfterRedirects);
      });

    // Initial view based on URL
    this.updateCurrentView(this.router.url);
  }

  private updateCurrentView(path: string): void {
    if (path.endsWith('/add') || path === 'add') {
      this.currentView = 'add';
    } else if (path.endsWith('/all') || path === 'all') {
      this.currentView = 'all';
    } else if (path.endsWith('/print') || path === 'print') {
      this.currentView = 'print';
    } else {
      this.currentView = 'default';
    }
  } 

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

  // Called by MenuBar to toggle main content dimming
  onMobileMenuToggle(isOpen: boolean) {
    this.isMobileMenuOpen = isOpen;
  }
}
