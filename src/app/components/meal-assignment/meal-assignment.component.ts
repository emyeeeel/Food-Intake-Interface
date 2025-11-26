import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { TagsComponent } from "../tags/tags.component";
import { Patient } from '../../models/patient.model';
import { Meal } from '../../models/meal.model';
import { MealAssignmentService } from '../../services/meal-assignment.service';
import { MealsService } from '../../services/meals.service';

@Component({
  selector: 'app-meal-assignment',
  imports: [TagsComponent],
  templateUrl: './meal-assignment.component.html',
  styleUrls: ['./meal-assignment.component.scss']
})
export class MealAssignmentComponent implements OnInit, OnChanges {
  @Input() patientId: number = 1;
  @Input() mealType: 'lunch' | 'dinner' | 'snack' = 'lunch';
  @Input() dayCycle?: number; 
  @Input() showCloseButton: boolean = false;

  assignedMeal: Meal | null = null;
  loading: boolean = true;
  error: string | null = null;
  mealId: number | null = null;

  constructor(private mealAssignmentService: MealAssignmentService, private mealsService: MealsService) {}

  ngOnInit(): void {
    if (this.patientId) {
      this.fetchMealAssignment();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['patientId'] || changes['mealType'] || changes['dayCycle']) && !changes['patientId']?.isFirstChange()) {
      this.fetchMealAssignment();
    }
  }

  fetchMealAssignment(): void {
    this.loading = true;
    this.error = null;

    this.mealAssignmentService.getAssignment(this.patientId, this.mealType, this.dayCycle).subscribe({
      next: (assignments) => {
        if (assignments.length > 0) {
          this.mealId = assignments[0].meal; // number
          if (this.mealId) {
            this.mealsService.getMeal(this.mealId).subscribe({
              next: (meal: Meal) => {
                this.assignedMeal = meal; // Meal object
                // console.log('Assigned Meal:', this.assignedMeal);
              },
              error: (err) => {
                console.error('Error fetching meal details:', err);
              }
            });
          }
        } else {
          this.assignedMeal = null;
        }
      },
      error: (err) => {
        console.error('Error fetching meal assignment:', err);
        this.error = 'Failed to load meal assignment';
        this.loading = false;
      }
    });
  }

  // --- Meal code getter ---
  get mealCode(): string {
    if (!this.assignedMeal) return '';

    const mealLetter = this.mealType.charAt(0).toUpperCase();
    const dayCycle = this.assignedMeal.day_cycle ?? '';
    const mealId = this.assignedMeal.id ?? '';

    return `${mealLetter}-${dayCycle}-0${mealId}`;
  }
}
