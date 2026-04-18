import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MenuBarComponent } from '../../components/menu-bar/menu-bar.component';
import { BackComponent } from '../../components/back/back.component';
import { NotifComponent } from '../../components/notif/notif.component';
import { SearchBarComponent } from '../../components/search-bar/search-bar.component';
import { MainOptionsComponent } from '../../components/main-options/main-options.component';
import { DateContainerComponent } from '../../components/date-container/date-container.component';
import { AddMealComponent } from '../../components/add-meal/add-meal.component';
import { DisplayMealComponent } from '../../components/display-meal/display-meal.component';
import { PrintAllMealsComponent } from '../../components/print-all-meals/print-all-meals.component';
import { EditMealComponent } from '../../components/edit-meal/edit-meal.component';
import { ShowMealComponent } from '../../components/show-meal/show-meal.component';
import { TodaysMealComponent } from '../../components/todays-meal/todays-meal.component';

@Component({
  selector: 'app-meal-catalog',
  imports: [
    FormsModule,
    MenuBarComponent,
    BackComponent,
    NotifComponent,
    SearchBarComponent,
    MainOptionsComponent,
    DateContainerComponent,
    AddMealComponent,
    DisplayMealComponent,
    PrintAllMealsComponent,
    EditMealComponent,
    ShowMealComponent,
    TodaysMealComponent
  ],
  templateUrl: './meal-catalog.component.html',
  styleUrl: './meal-catalog.component.scss'
})
export class MealCatalogComponent implements OnInit {
  currentView = 'default';
  mealDescription = '';
  mealId: number | null = null;
  isMobileMenuOpen = false;
  searchQuery = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const initialPath = this.route.snapshot.url.map((segment) => segment.path).join('/');
    this.updateCurrentView(initialPath);

    this.route.url.subscribe((segments) => {
      const path = segments.map((segment) => segment.path).join('/');
      this.updateCurrentView(path);
    });
  }

  private updateCurrentView(path: string): void {
    if (path.includes('/add') || path.endsWith('add')) {
      this.currentView = 'add-meal';
      this.mealId = null;
    } else if (path.includes('/all') || path.endsWith('all')) {
      this.currentView = 'all-meals';
      this.mealId = null;
    } else if (path.includes('/print') || path.endsWith('print')) {
      this.currentView = 'print-meal';
      this.mealId = null;
    } else if (/meal-catalog\/\d+\/edit/.test(path) || /\d+\/edit/.test(path)) {
      this.currentView = 'edit-meal';
      const editMatch = path.match(/(\d+)\/edit/);
      this.mealId = editMatch ? parseInt(editMatch[1], 10) : null;
    } else if (/meal-catalog\/\d+\/view/.test(path) || /\d+\/view/.test(path)) {
      this.currentView = 'view-meal';
      const viewMatch = path.match(/(\d+)\/view/);
      this.mealId = viewMatch ? parseInt(viewMatch[1], 10) : null;
    } else if (path.endsWith('/edit') || path === 'edit') {
      this.currentView = 'edit-meal';
      this.mealId = null;
    } else if (path.endsWith('/view') || path === 'view') {
      this.currentView = 'view-meal';
      this.mealId = null;
    } else {
      this.currentView = 'default';
      this.mealId = null;
    }
  }

  navigateToAddMeal(): void {
    this.router.navigate(['/meal-catalog/add']);
  }

  navigateToAllMeals(): void {
    this.router.navigate(['/meal-catalog/all']);
  }

  navigateToPrintMeal(): void {
    this.router.navigate(['/meal-catalog/print']);
  }

  navigateToEditMeal(mealId: number): void {
    this.router.navigate(['/meal-catalog', mealId, 'edit']);
  }

  navigateToViewMeal(mealId: number): void {
    this.router.navigate(['/meal-catalog', mealId, 'view']);
  }

  clearDescription(): void {
    this.mealDescription = '';
  }

  onMobileMenuToggle(isOpen: boolean): void {
    this.isMobileMenuOpen = isOpen;
  }
}
