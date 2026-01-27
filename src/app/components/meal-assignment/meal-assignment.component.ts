import { Component, Input, OnInit, OnChanges, SimpleChanges, EventEmitter, Output, OnDestroy } from '@angular/core';
import { TagsComponent } from "../tags/tags.component";
import { Meal } from '../../models/meal.model';
import { MealAssignment } from '../../models/meal-assignment.mode';
import { MealAssignmentService } from '../../services/meal-assignment.service';
import { MealsService } from '../../services/meals.service';
import { DateService } from '../../services/date.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-meal-assignment',
  imports: [TagsComponent, FormsModule, CommonModule],
  templateUrl: './meal-assignment.component.html',
  styleUrls: ['./meal-assignment.component.scss']
})
export class MealAssignmentComponent implements OnInit, OnChanges, OnDestroy {
  @Input() patientId: number = 1;
  @Input() mealType: 'lunch' | 'dinner' | 'snack' = 'lunch';
  @Input() showCloseButton: boolean = false;

  assignedMeal: Meal | null = null;
  mealAssignments: MealAssignment[] = [];
  loading: boolean = true;
  error: string | null = null;
  mealId: number | null = null;
  currentDayCycle: number = 1; // Current day cycle from date service

  @Output() mealsStatus = new EventEmitter<boolean>();

  private dateSubscription: Subscription = new Subscription();

  constructor(
    private mealAssignmentService: MealAssignmentService,
    private mealsService: MealsService,
    private dateService: DateService
  ) {}

  ngOnInit(): void {
    // Subscribe to date changes from date service
    this.subscribeToDateChanges();

    if (this.patientId) {
      this.fetchMealAssignment();
    }
  }

  ngOnDestroy(): void {
    this.dateSubscription.unsubscribe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      (changes['patientId'] || changes['mealType']) &&
      !changes['patientId']?.isFirstChange()
    ) {
      this.fetchMealAssignment();
    }
  }

  /**
   * Subscribe to date changes from the date service
   */
  private subscribeToDateChanges(): void {
    this.dateSubscription = this.dateService.selectedDate$.subscribe(selectedDate => {
      const newDayCycle = this.dateService.calculateDayCycleForDate(selectedDate);
      
      if (newDayCycle !== this.currentDayCycle) {
        this.currentDayCycle = newDayCycle;
        console.log(`MealAssignmentComponent (${this.mealType}): Date changed, new day cycle: ${newDayCycle}`);
        
        // Re-process existing assignments with new day cycle
        if (this.mealAssignments.length > 0) {
          this.processMealAssignments(this.mealAssignments);
        }
      }
    });
  }

  /**
   * Fetch meal assignment for LTC patient and update assignedMeal reactively
   */
  fetchMealAssignment(): void {
    this.loading = true;
    this.error = null;

    // Always use LTC patient method since all patients are LTC patients
    this.mealAssignmentService.getMealAssignmentsByLTCPatient(this.patientId)
      .subscribe({
        next: (assignments: MealAssignment[]) => {
          this.mealAssignments = assignments;
          this.processMealAssignments(assignments);
        },
        error: (err) => {
          console.error('Error fetching LTC patient meal assignments:', err);
          this.error = 'Failed to load meal assignments';
          this.updateAssignedMeal(null);
          this.loading = false;
        }
      });
  }

  /**
   * Process meal assignments and filter based on meal type and day cycle
   */
  private processMealAssignments(assignments: MealAssignment[]): void {
    if (!assignments || assignments.length === 0) {
      this.updateAssignedMeal(null);
      return;
    }

    // Convert meal type to Chinese for filtering
    const mealTimeMap: { [key: string]: string } = {
      'lunch': '午餐',
      'dinner': '晚餐',
      'snack': '點心'
    };

    const targetMealTime = mealTimeMap[this.mealType] || '午餐';

    console.log(`Processing assignments for meal type: ${targetMealTime}, day cycle: ${this.currentDayCycle}`);

    // Filter assignments by meal type and current day cycle
    let filteredAssignments = assignments.filter(assignment => {
      const matchesMealType = assignment.meal_type === targetMealTime;
      const matchesDayCycle = parseInt(assignment.day_cycle) === this.currentDayCycle;
      
      return matchesMealType && matchesDayCycle;
    });

    console.log(`Found ${filteredAssignments.length} matching assignments`);

    if (filteredAssignments.length > 0) {
      // Use the meal detail from the assignment (no need for additional API call)
      const assignment = filteredAssignments[0];
      if (assignment.meal_detail) {
        // Create a Meal object from meal_detail
        const meal: Meal = {
          id: assignment.meal_detail.id,
          image: assignment.meal_detail.image,
          meal_name: assignment.meal_detail.meal_name,
          meal_time: assignment.meal_detail.meal_time,
          day_cycle: assignment.meal_detail.day_cycle,
          plate_type: assignment.meal_detail.plate_type,
          created_at: assignment.meal_detail.created_at,
          updated_at: assignment.meal_detail.updated_at,
          ingredients: assignment.meal_detail.ingredients
        };
        
        this.updateAssignedMeal(meal);
      } else {
        // Fallback: fetch meal details if not included
        this.mealId = assignment.meal;
        this.fetchMealDetails(this.mealId);
      }
    } else {
      this.updateAssignedMeal(null);
    }
  }

  /**
   * Fallback method to fetch meal details if not included in assignment
   */
  private fetchMealDetails(mealId: number): void {
    this.mealsService.getMeal(mealId).subscribe({
      next: (meal: Meal) => {
        this.updateAssignedMeal(meal);
      },
      error: (err) => {
        console.error('Error fetching meal details:', err);
        this.updateAssignedMeal(null);
      }
    });
  }

  /**
   * Centralized method to update assignedMeal and emit status to parent
   */
  private updateAssignedMeal(meal: Meal | null): void {
    this.assignedMeal = meal;
    this.mealsStatus.emit(!!meal); // true if meal exists, false otherwise
    this.loading = false;
  }

  /**
   * Get LTC patient identifier for display
   */
  getPatientIdentifier(): string {
    if (this.mealAssignments.length > 0) {
      return this.mealAssignments[0].patient_identifier || `LTC Patient ${this.patientId}`;
    }
    return `LTC Patient ${this.patientId}`;
  }

  /**
   * Get all assignments for current LTC patient
   */
  getAllAssignments(): MealAssignment[] {
    return this.mealAssignments;
  }

  /**
   * Get filtered assignments for current meal type and day cycle
   */
  getFilteredAssignments(): MealAssignment[] {
    const mealTimeMap: { [key: string]: string } = {
      'lunch': '午餐',
      'dinner': '晚餐',
      'snack': '點心'
    };

    const targetMealTime = mealTimeMap[this.mealType] || '午餐';

    return this.mealAssignments.filter(assignment => {
      const matchesMealType = assignment.meal_type === targetMealTime;
      const matchesDayCycle = parseInt(assignment.day_cycle) === this.currentDayCycle;
      
      return matchesMealType && matchesDayCycle;
    });
  }

  /**
   * Get current day cycle from date service
   */
  getCurrentDayCycle(): number {
    return this.currentDayCycle;
  }

  /**
   * Get current selected date from date service
   */
  getCurrentSelectedDate(): Date {
    return this.dateService.getSelectedDate();
  }

  // --- Meal code getter (updated to use current day cycle) ---
  get mealCode(): string {
    if (!this.assignedMeal) return '';
    
    // Use meal type mapping to letter codes
    const mealTypeToLetter: { [key: string]: string } = {
      'lunch': 'L',
      'dinner': 'D',
      'snack': 'S'
    };
    
    const mealLetter = mealTypeToLetter[this.mealType] || 'U';
    const dayCycle = this.currentDayCycle;
    const mealId = this.assignedMeal.id ?? '';
    
    return `${mealLetter}-${dayCycle}-${mealId}`;
  }

  /**
   * Check if there are any meal assignments
   */
  hasMealAssignments(): boolean {
    return this.mealAssignments.length > 0;
  }

  /**
   * Check if current meal type has assignments for current day
   */
  hasMealForType(): boolean {
    return this.getFilteredAssignments().length > 0;
  }

  /**
   * Get meal assignment info for display
   */
  getMealAssignmentInfo(): string {
    if (!this.assignedMeal) return 'No meal assigned';
    
    const dayInfo = `Day ${this.currentDayCycle}`;
    const typeInfo = this.mealType.charAt(0).toUpperCase() + this.mealType.slice(1);
    
    return `${dayInfo} - ${typeInfo}: ${this.assignedMeal.meal_name}`;
  }

  /**
   * Check if meal assignment is for current day
   */
  isCurrentDay(): boolean {
    if (!this.assignedMeal) return false;
    return this.assignedMeal.day_cycle === this.currentDayCycle;
  }

  /**
   * Get debug info for current state
   */
  getDebugInfo(): any {
    return {
      patientId: this.patientId,
      mealType: this.mealType,
      currentDayCycle: this.currentDayCycle,
      selectedDate: this.getCurrentSelectedDate(),
      totalAssignments: this.mealAssignments.length,
      filteredAssignments: this.getFilteredAssignments().length,
      hasAssignedMeal: !!this.assignedMeal,
      assignedMealName: this.assignedMeal?.meal_name
    };
  }
}
