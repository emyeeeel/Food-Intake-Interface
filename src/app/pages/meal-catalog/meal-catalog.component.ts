import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Add this import
import { Router, ActivatedRoute } from '@angular/router';
import { MenuBarComponent } from '../../components/menu-bar/menu-bar.component';
import { BackComponent } from '../../components/back/back.component';
import { NotifComponent } from '../../components/notif/notif.component';
import { SearchBarComponent } from '../../components/search-bar/search-bar.component';
import { FilterIconComponent } from '../../components/filter-icon/filter-icon.component';
import { FilterOptionsComponent } from '../../components/filter-options/filter-options.component';
import { MainOptionsComponent } from '../../components/main-options/main-options.component';
import { ClearAllButtonComponent } from '../../components/clear-all-button/clear-all-button.component';
import { DarkButtonComponent } from '../../components/dark-button/dark-button.component';
import { DateContainerComponent } from '../../components/date-container/date-container.component';
import { MealItemComponent } from '../../components/meal-item/meal-item.component';
import { ServingTimeComponent } from '../../components/serving-time/serving-time.component';
import { DayCycleComponent } from '../../components/day-cycle/day-cycle.component';
import { MealsService } from '../../services/meals.service';
import { Meal } from '../../models/meal.model';

@Component({
  selector: 'app-meal-catalog',
  imports: [
    CommonModule,
    FormsModule, 
    MenuBarComponent,
    BackComponent,
    NotifComponent,
    SearchBarComponent,
    FilterIconComponent,
    FilterOptionsComponent,
    MainOptionsComponent,
    ClearAllButtonComponent,
    DarkButtonComponent,
    DateContainerComponent,
    MealItemComponent,
    ServingTimeComponent,
    DayCycleComponent
  ],
  templateUrl: './meal-catalog.component.html',
  styleUrl: './meal-catalog.component.scss'
})
export class MealCatalogComponent implements OnInit {
  currentView: string = 'default';
  mealDescription: string = ''; 
  meals: Meal[] = [];

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
    if (path.endsWith('/add') || path === 'add') {
      this.currentView = 'add-meal';
    } else if (path.endsWith('/all') || path === 'all') {
      this.currentView = 'all-meals';
    } else if (path.endsWith('/print') || path === 'print') {
      this.currentView = 'print-meal';
    } else if (path === 'meal-catalog' || path === '') {
      this.currentView = 'default';
    } else {
      this.currentView = 'default';
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
}