import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MealsService } from '../../services/meals.service';
import { PatientService } from '../../services/patient.service';
import { Meal } from '../../models/meal.model';
import { FormsModule } from '@angular/forms';

export interface MealAssignment {
  id: string;
  dayId: string;
  lunchMeals: any[];
  dinnerMeals: any[];
  selectedLunchMeals: number[];
  selectedDinnerMeals: number[];
}

@Component({
  selector: 'app-add-patient',
  imports: [CommonModule, FormsModule],
  templateUrl: './add-patient.component.html',
  styleUrl: './add-patient.component.scss',
})
export class AddPatientComponent implements OnInit {
  
  mealAssignments: MealAssignment[] = [];
  availableDays = [
    { value: '1', label: 'Day 1' },
    { value: '2', label: 'Day 2' },
    { value: '3', label: 'Day 3' },
    { value: '4', label: 'Day 4' },
    { value: '5', label: 'Day 5' },
    { value: '6', label: 'Day 6' },
    { value: '7', label: 'Day 7' },
    { value: '8', label: 'Day 8' },
    { value: '9', label: 'Day 9' },
    { value: '10', label: 'Day 10' },
    { value: '11', label: 'Day 11' },
    { value: '12', label: 'Day 12' },
    { value: '13', label: 'Day 13' },
    { value: '14', label: 'Day 14' }
  ];
  allMeals: Meal[] = [];

  constructor(
    private mealsService: MealsService,
    private patientService: PatientService
  ) {}

  ngOnInit(): void {
    // Load all meals on component initialization
    this.loadMeals();
    // Initialize with one assignment
    this.addMealAssignment();
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

  addMealAssignment(): void {
    const newAssignment: MealAssignment = {
      id: this.generateId(),
      dayId: '',
      lunchMeals: [],
      dinnerMeals: [],
      selectedLunchMeals: [],
      selectedDinnerMeals: []
    };
    
    this.mealAssignments.push(newAssignment);
  }

  removeMealAssignment(index: number): void {
    if (this.mealAssignments.length > 1) {
      this.mealAssignments.splice(index, 1);
    }
  }

  onDayChange(event: any, assignmentIndex: number): void {
    const dayId = event.target.value;
    const assignment = this.mealAssignments[assignmentIndex];
    
    assignment.dayId = dayId;
    assignment.selectedLunchMeals = [];
    assignment.selectedDinnerMeals = [];
    
    // Load meals for this day
    this.loadMealsForDay(dayId, assignmentIndex);
  }

  onMealSelection(mealType: 'lunch' | 'dinner', meal: any, event: any, assignmentIndex: number): void {
    const assignment = this.mealAssignments[assignmentIndex];
    const mealId = meal.id;
    
    if (mealType === 'lunch') {
      if (event.target.checked) {
        assignment.selectedLunchMeals.push(mealId);
      } else {
        assignment.selectedLunchMeals = assignment.selectedLunchMeals.filter(id => id !== mealId);
      }
    } else {
      if (event.target.checked) {
        assignment.selectedDinnerMeals.push(mealId);
      } else {
        assignment.selectedDinnerMeals = assignment.selectedDinnerMeals.filter(id => id !== mealId);
      }
    }
  }

  trackByAssignment(index: number, assignment: MealAssignment): string {
    return assignment.id;
  }

  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  private loadMealsForDay(dayId: string, assignmentIndex: number): void {
    const assignment = this.mealAssignments[assignmentIndex];
    assignment.lunchMeals = this.allMeals.filter(meal => 
      meal.day_cycle.toString() === dayId && meal.meal_time === '午餐'
    );
    assignment.dinnerMeals = this.allMeals.filter(meal => 
      meal.day_cycle.toString() === dayId && meal.meal_time === '晚餐'
    );

    console.log(`Lunch meals for day ${dayId}:`, assignment.lunchMeals);
    console.log(`Dinner meals for day ${dayId}:`, assignment.dinnerMeals);
  }

  submitForm(): void {
    // Add your form submission logic here
    console.log('Form submitted');
  }

  clearForm(): void {
    // Add your form submission logic here
    console.log('Form Cleared');
  }
}
