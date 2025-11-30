import { Component, Input, OnInit, OnChanges, SimpleChanges, EventEmitter, Output } from '@angular/core';
import { TagsComponent } from "../tags/tags.component";
import { Meal } from '../../models/meal.model';
import { MealAssignmentService } from '../../services/meal-assignment.service';
import { MealsService } from '../../services/meals.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-meal-assignment',
  imports: [TagsComponent, FormsModule, CommonModule],
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

  @Output() mealsStatus = new EventEmitter<boolean>();

  constructor(
    private mealAssignmentService: MealAssignmentService,
    private mealsService: MealsService
  ) {}

  ngOnInit(): void {
    if (this.patientId) {
      this.fetchMealAssignment();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      (changes['patientId'] || changes['mealType'] || changes['dayCycle']) &&
      !changes['patientId']?.isFirstChange()
    ) {
      this.fetchMealAssignment();
    }
  }

  /**
   * Fetch meal assignment and update assignedMeal reactively
   */
  fetchMealAssignment(): void {
    this.loading = true;
    this.error = null;

    this.mealAssignmentService.getAssignment(this.patientId, this.mealType, this.dayCycle)
      .subscribe({
        next: (assignments) => {
          if (assignments.length > 0) {
            this.mealId = assignments[0].meal;
            if (this.mealId) {
              this.mealsService.getMeal(this.mealId).subscribe({
                next: (meal: Meal) => this.updateAssignedMeal(meal),
                error: (err) => {
                  console.error('Error fetching meal details:', err);
                  this.updateAssignedMeal(null);
                }
              });
            } else {
              this.updateAssignedMeal(null);
            }
          } else {
            this.updateAssignedMeal(null);
          }
        },
        error: (err) => {
          console.error('Error fetching meal assignment:', err);
          this.error = 'Failed to load meal assignment';
          this.updateAssignedMeal(null);
          this.loading = false;
        }
      });
  }

  /**
   * Centralized method to update assignedMeal and emit status to parent
   */
  private updateAssignedMeal(meal: Meal | null) {
    this.assignedMeal = meal;
    this.mealsStatus.emit(!!meal); // true if meal exists, false otherwise
    this.loading = false;
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
