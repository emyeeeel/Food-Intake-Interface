import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms'; 
import { Router, ActivatedRoute } from '@angular/router';
import { MenuBarComponent } from '../../components/menu-bar/menu-bar.component';
import { BackComponent } from '../../components/back/back.component';
import { NotifComponent } from '../../components/notif/notif.component';
import { SearchBarComponent } from '../../components/search-bar/search-bar.component';
import { FilterIconComponent } from '../../components/filter-icon/filter-icon.component';
import { FilterOptionsComponent } from '../../components/filter-options/filter-options.component';
import { MainOptionsComponent } from '../../components/main-options/main-options.component';
import { DateContainerComponent } from '../../components/date-container/date-container.component';
import { MealsService } from '../../services/meals.service';
import { Meal } from '../../models/meal.model';
import { AddMealComponent } from '../../components/add-meal/add-meal.component';
import { DisplayMealComponent } from "../../components/display-meal/display-meal.component";
import { PrintAllMealsComponent } from "../../components/print-all-meals/print-all-meals.component";
import { EditMealComponent } from "../../components/edit-meal/edit-meal.component";
import { ShowMealComponent } from "../../components/show-meal/show-meal.component";
import { TodaysMealComponent } from '../../components/todays-meal/todays-meal.component';

@Component({
  selector: 'app-meal-catalog',
  imports: [
    FormsModule,
    MenuBarComponent,
    BackComponent,
    NotifComponent,
    SearchBarComponent,
    // FilterIconComponent,
    // FilterOptionsComponent,
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
  currentView: string = 'default';
  mealDescription: string = ''; 
  meals: Meal[] = [];
  mealId: number | null = null; // Add this property to store the meal ID

  isMobileMenuOpen = false; 

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private mealsService: MealsService
  ) {}
  
  filterOptions: string[] = [
    '素食',
    '魚素',
    '生酮飲食',
    '無麩質飲食',
    '無乳糖飲食'
  ];

  ngOnInit(): void {
    const initialPath = this.route.snapshot.url.map(segment => segment.path).join('/');
    this.updateCurrentView(initialPath);
    
    this.route.url.subscribe(segments => {
      const path = segments.map(segment => segment.path).join('/');
      this.updateCurrentView(path);
    });

    this.getAllMeals();
  }

  getAllMeals(): void {
    this.mealsService.getMeals().subscribe({
      next: (data: Meal[]) => {
        this.meals = data;
        // console.log('All meals:', this.meals);
      },
      error: (err) => {
        console.error('Error fetching meals:', err);
      }
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

    } else if (/meal-catalog\/\d+\/edit/.test(path)) {
      // Remove leading slash from regex - matches both /meal-catalog/edit/123 and meal-catalog/edit/123
      this.currentView = 'edit-meal';
      const editMatch = path.match(/meal-catalog\/edit\/(\d+)/);
      if (editMatch) {
        this.mealId = parseInt(editMatch[1], 10);
        console.log('Edit meal ID extracted:', this.mealId);
      }

    } else if (/meal-catalog\/\d+\/view/.test(path)) {
      // Remove leading slash from regex - matches both /meal-catalog/view/123 and meal-catalog/view/123
      this.currentView = 'view-meal';
      const viewMatch = path.match(/meal-catalog\/view\/(\d+)/);
      if (viewMatch) {
        this.mealId = parseInt(viewMatch[1], 10);
        console.log('View meal ID extracted:', this.mealId);
      }

    } else if (path.endsWith('/edit') || path === 'edit') {
      this.currentView = 'edit-meal';
      this.mealId = null;

    } else if (path.endsWith('/view') || path === 'view') {
      this.currentView = 'view-meal';
      this.mealId = null;

    } else if (path === '/meal-catalog' || path === 'meal-catalog' || path === '') {
      this.currentView = 'default';
      this.mealId = null;

    } else {
      console.log('No matching route pattern found, setting to default');
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

  getMealCode(meal: Meal): string {
    if (!meal) return '';
  
    const mealTypeMap: Record<string, string> = {
      '午餐': 'L',    
      '晚餐': 'D',    
      '點心': 'S',    
    };
  
    const mealLetter = meal.meal_time && mealTypeMap[meal.meal_time]
      ? mealTypeMap[meal.meal_time]
      : '';  // fallback if undefined
  
    const dayCycle = meal.day_cycle ?? '';
    const mealId = meal.id ?? '';
  
    return `${mealLetter}-${dayCycle}-0${mealId}`;
  }
  
  // Called by MenuBar to toggle main content dimming
  onMobileMenuToggle(isOpen: boolean) {
    this.isMobileMenuOpen = isOpen;
  }

  // Helper method to get meal ID from route
  getMealIdFromRoute(): number | null {
    const url = this.router.url;
    
    // Try edit format first
    let match = url.match(/\/meal-catalog\/(\d+)\/edit/);
    if (match) {
      return parseInt(match[1], 10);
    }
    
    // Try view format
    match = url.match(/\/meal-catalog\/(\d+)\/view/);
    if (match) {
      return parseInt(match[1], 10);
    }
    
    return null;
  }
}