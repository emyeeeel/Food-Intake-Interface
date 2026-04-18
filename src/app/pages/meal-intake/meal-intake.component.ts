import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { MenuBarComponent } from '../../components/menu-bar/menu-bar.component';
import { MainOptionsComponent } from '../../components/main-options/main-options.component';
import { SearchBarComponent } from '../../components/search-bar/search-bar.component';
import { NotifComponent } from '../../components/notif/notif.component';
import { BackComponent } from '../../components/back/back.component';
import { AddIntakeComponent } from '../../components/add-intake/add-intake.component';
import { DisplayIntakeComponent } from '../../components/display-intake/display-intake.component';
import { PrintAllIntakesComponent } from '../../components/print-all-intakes/print-all-intakes.component';
import { IntakeDashboardComponent } from '../../components/intake-dashboard/intake-dashboard.component';

@Component({
  selector: 'app-meal-intake',
  imports: [
    MenuBarComponent,
    MainOptionsComponent,
    SearchBarComponent,
    NotifComponent,
    BackComponent,
    AddIntakeComponent,
    DisplayIntakeComponent,
    PrintAllIntakesComponent,
    IntakeDashboardComponent
  ],
  templateUrl: './meal-intake.component.html',
  styleUrl: './meal-intake.component.scss'
})
export class MealIntakeComponent {
  isMobileMenuOpen = false;
  currentView = 'default';
  searchQuery = '';

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.updateCurrentView(event.urlAfterRedirects);
      });

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
    this.router.navigate(['/meal-intake/add']);
  }

  navigateToAllLogs(): void {
    this.router.navigate(['/meal-intake/all']);
  }

  navigateToPrintLogs(): void {
    this.router.navigate(['/meal-intake/print']);
  }

  onMobileMenuToggle(isOpen: boolean): void {
    this.isMobileMenuOpen = isOpen;
  }
}
