import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MealsService } from '../../services/meals.service';
import { PatientService } from '../../services/patient.service';
import { Meal } from '../../models/meal.model';

interface SelectedMeal {
  mealType: string;
  meal: Meal;
}

@Component({
  selector: 'app-add-patient',
  imports: [CommonModule],
  templateUrl: './add-patient.component.html',
  styleUrl: './add-patient.component.scss',
})
export class AddPatientComponent implements OnInit {
  
  selectedDay: number | null = null;
  allMeals: Meal[] = [];
  lunchMeals: Meal[] = [];
  dinnerMeals: Meal[] = [];
  selectedMeals: SelectedMeal[] = [];

  constructor(
    private mealsService: MealsService,
    private patientService: PatientService
  ) {}

  ngOnInit(): void {
    // Load all meals on component initialization
    this.loadMeals();
  }

  private loadMeals(): void {
    this.mealsService.getMeals().subscribe({
      next: (meals) => {
        console.log('Meals Response:', meals);
        this.allMeals = meals;
      },
      error: (error) => {
        console.error('Error fetching meals:', error);
      }
    });
  }

  // Handle day selection change
  onDayChange(event: any): void {
    const selectedDayValue = event.target.value;
    this.selectedDay = selectedDayValue ? parseInt(selectedDayValue) : null;
    
    if (this.selectedDay) {
      console.log('Selected day:', this.selectedDay);
      this.populateMealsForDay(this.selectedDay);
    } else {
      this.clearMeals();
    }
  }

  // Populate meals for the selected day
  private populateMealsForDay(dayNumber: number): void {
    // Filter meals for the selected day and lunch time
    this.lunchMeals = this.allMeals.filter(meal => 
      meal.day_cycle === dayNumber && meal.meal_time === '午餐'
    );

    // Filter meals for the selected day and dinner time
    this.dinnerMeals = this.allMeals.filter(meal => 
      meal.day_cycle === dayNumber && meal.meal_time === '晚餐'
    );

    console.log(`Lunch meals for day ${dayNumber}:`, this.lunchMeals);
    console.log(`Dinner meals for day ${dayNumber}:`, this.dinnerMeals);

    // Clear previously selected meals when changing day
    this.selectedMeals = [];
  }

  // Handle meal selection
  onMealSelection(mealType: string, meal: Meal, event: any): void {
    if (event.target.checked) {
      // Add meal to selected meals
      this.selectedMeals.push({
        mealType: mealType,
        meal: meal
      });
      console.log(`Added ${mealType} meal:`, meal.meal_name);
    } else {
      // Remove meal from selected meals
      this.selectedMeals = this.selectedMeals.filter(
        selectedMeal => !(selectedMeal.mealType === mealType && selectedMeal.meal.id === meal.id)
      );
      console.log(`Removed ${mealType} meal:`, meal.meal_name);
    }
    
    console.log('Currently selected meals:', this.selectedMeals);
  }

  // Remove a selected meal
  removeMeal(mealToRemove: SelectedMeal): void {
    this.selectedMeals = this.selectedMeals.filter(selectedMeal => selectedMeal !== mealToRemove);
    
    // Uncheck the corresponding checkbox
    const checkboxId = `${mealToRemove.mealType}-${mealToRemove.meal.id}`;
    const checkbox = document.getElementById(checkboxId) as HTMLInputElement;
    if (checkbox) {
      checkbox.checked = false;
    }
    
    console.log('Removed meal:', mealToRemove.meal.meal_name);
  }

  // Clear meals arrays
  private clearMeals(): void {
    this.lunchMeals = [];
    this.dinnerMeals = [];
    this.selectedMeals = [];
  }

  // Clear entire form
  clearForm(): void {
    this.selectedDay = null;
    this.clearMeals();
    
    // Reset form elements
    const form = document.getElementById('patientForm') as HTMLFormElement;
    if (form) {
      form.reset();
    }
    
    console.log('Form cleared');
  }

  // Submit form
  submitForm(): void {
    console.log('Submitting form with selected meals:', this.selectedMeals);
    // Add form submission logic here
  }
}
