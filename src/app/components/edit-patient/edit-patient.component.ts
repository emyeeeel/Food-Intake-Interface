import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, forkJoin, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';

import { PatientService } from '../../services/patient.service';
import { MealAssignmentService } from '../../services/meal-assignment.service';
import { MealsService } from '../../services/meals.service';
import { LTCPatient } from '../../models/ltc-patient.model';
import { Meal } from '../../models/meal.model';
import { MealAssignment } from '../../models/meal-assignment.model';

interface MealAssignmentForm {
  dayId: string;
  lunchMeals: Meal[];
  dinnerMeals: Meal[];
  selectedLunchMeals: number[];
  selectedDinnerMeals: number[];
}

@Component({
  selector: 'app-edit-patient',
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-patient.component.html',
  styleUrls: ['./edit-patient.component.scss']
})
export class EditPatientComponent implements OnInit, OnDestroy {
  @Input() patientId?: number;

  // Loading and error states
  loading: boolean = true;
  error: string | null = null;

  // Patient data
  ltcPatient: LTCPatient | null = null;
  originalPatientData: LTCPatient | null = null; // For reset functionality

  // Form fields
  roomNumber: string = '';
  bedNumber: string = '';
  age: number | null = null;
  sex: string = '';
  height: number | null = null;
  weight: number | null = null;
  activityLevel: string = '';
  dietaryRestrictions: string = '';

  // Meal assignment data
  mealAssignments: MealAssignmentForm[] = [];
  existingMealAssignments: MealAssignment[] = [];
  originalMealAssignments: MealAssignmentForm[] = []; // For reset functionality
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

  private subscriptions: Subscription = new Subscription();

  constructor(
    private patientService: PatientService,
    private mealAssignmentService: MealAssignmentService,
    private mealsService: MealsService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Get patient ID from input or route
    if (!this.patientId) {
      this.route.params.subscribe(params => {
        if (params['id']) {
          this.patientId = +params['id'];
        }
      });
    }

    if (this.patientId) {
      this.loadPatientData();
    } else {
      this.error = 'No patient ID provided';
      this.loading = false;
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /**
   * Load patient data and populate form
   */
  loadPatientData(): void {
    if (!this.patientId) return;

    this.loading = true;
    this.error = null;

    const patientSub = this.patientService.getLTCPatient(this.patientId).subscribe({
      next: (patient: LTCPatient) => {
        this.ltcPatient = patient;
        this.originalPatientData = { ...patient }; // Store original data for reset
        this.populateForm(patient);
        this.loadExistingMealAssignments();
      },
      error: (err) => {
        console.error('Error loading patient data:', err);
        this.error = 'Failed to load patient information. Please try again.';
        this.loading = false;
      }
    });

    this.subscriptions.add(patientSub);
  }

  /**
   * Populate form with patient data
   */
  private populateForm(patient: LTCPatient): void {
    this.roomNumber = patient.room_number || '';
    this.bedNumber = patient.bed_number || '';
    this.age = patient.age || null;
    this.sex = patient.sex || '';
    this.height = patient.height_cm || null;
    this.weight = patient.weight_kg || null;
    this.activityLevel = patient.activity_level || '';
  }

  /**
   * Load existing meal assignments for the patient
   */
  private loadExistingMealAssignments(): void {
    if (!this.patientId) return;

    const assignmentsSub = this.mealAssignmentService.getMealAssignmentsByLTCPatient(this.patientId).subscribe({
      next: (assignments: MealAssignment[]) => {
        this.existingMealAssignments = assignments;
        this.populateMealAssignments(assignments);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading meal assignments:', err);
        // Continue without meal assignments
        this.initializeEmptyMealAssignment();
        this.loading = false;
      }
    });

    this.subscriptions.add(assignmentsSub);
  }

  /**
   * Populate meal assignments from existing data
   */
  private populateMealAssignments(assignments: MealAssignment[]): void {
    // Group assignments by day cycle
    const assignmentsByDay: { [key: string]: MealAssignment[] } = {};
    
    assignments.forEach(assignment => {
      const day = assignment.day_cycle;
      if (!assignmentsByDay[day]) {
        assignmentsByDay[day] = [];
      }
      assignmentsByDay[day].push(assignment);
    });

    // Create form assignments
    this.mealAssignments = [];
    
    Object.keys(assignmentsByDay).forEach(day => {
      const dayAssignments = assignmentsByDay[day];
      const lunchMeals: number[] = [];
      const dinnerMeals: number[] = [];
      
      dayAssignments.forEach(assignment => {
        if (assignment.meal_type === '午餐') {
          lunchMeals.push(assignment.meal);
        } else if (assignment.meal_type === '晚餐') {
          dinnerMeals.push(assignment.meal);
        }
      });

      const assignmentForm: MealAssignmentForm = {
        dayId: day,
        lunchMeals: [],
        dinnerMeals: [],
        selectedLunchMeals: lunchMeals,
        selectedDinnerMeals: dinnerMeals
      };

      this.mealAssignments.push(assignmentForm);
      
      // Load meals for this day
      this.loadMealsForDay(day, this.mealAssignments.length - 1);
    });

    // Store original assignments for reset functionality
    this.originalMealAssignments = JSON.parse(JSON.stringify(this.mealAssignments));

    // If no existing assignments, create empty one
    if (this.mealAssignments.length === 0) {
      this.initializeEmptyMealAssignment();
    }
  }

  /**
   * Initialize empty meal assignment
   */
  private initializeEmptyMealAssignment(): void {
    this.mealAssignments = [{
      dayId: '',
      lunchMeals: [],
      dinnerMeals: [],
      selectedLunchMeals: [],
      selectedDinnerMeals: []
    }];
  }

  /**
   * Load meals for a specific day
   */
  private loadMealsForDay(dayId: string, assignmentIndex: number): void {
    const mealsSub = this.mealsService.getMealsForDay(+dayId).subscribe({
      next: (mealsData: { lunch: Meal[]; dinner: Meal[] }) => {
        const assignment = this.mealAssignments[assignmentIndex];
        if (assignment) {
          assignment.lunchMeals = mealsData.lunch;
          assignment.dinnerMeals = mealsData.dinner;
        }
      },
      error: (err) => {
        console.error(`Error loading meals for day ${dayId}:`, err);
      }
    });

    this.subscriptions.add(mealsSub);
  }

  // --- Form Management Methods ---

  /**
   * Add new meal assignment
   */
  addMealAssignment(): void {
    if (this.mealAssignments.length < 5) {
      this.mealAssignments.push({
        dayId: '',
        lunchMeals: [],
        dinnerMeals: [],
        selectedLunchMeals: [],
        selectedDinnerMeals: []
      });
    }
  }

  /**
   * Remove meal assignment
   */
  removeMealAssignment(index: number): void {
    if (this.mealAssignments.length > 1) {
      this.mealAssignments.splice(index, 1);
    }
  }

  /**
   * Handle day change for assignment
   */
  onDayChange(event: any, assignmentIndex: number): void {
    const dayId = event.target.value;
    const assignment = this.mealAssignments[assignmentIndex];
    
    if (assignment) {
      assignment.dayId = dayId;
      assignment.selectedLunchMeals = [];
      assignment.selectedDinnerMeals = [];
      
      if (dayId) {
        this.loadMealsForDay(dayId, assignmentIndex);
      }
    }
  }

  /**
   * Handle meal selection
   */
  onMealSelection(mealType: 'lunch' | 'dinner', meal: Meal, event: any, assignmentIndex: number): void {
    const assignment = this.mealAssignments[assignmentIndex];
    if (!assignment) return;

    const selectedArray = mealType === 'lunch' ? assignment.selectedLunchMeals : assignment.selectedDinnerMeals;
    
    if (event.target.checked) {
      if (!selectedArray.includes(meal.id)) {
        selectedArray.push(meal.id);
      }
    } else {
      const index = selectedArray.indexOf(meal.id);
      if (index > -1) {
        selectedArray.splice(index, 1);
      }
    }
  }

  /**
   * Track by function for assignments
   */
  trackByAssignment(index: number, assignment: MealAssignmentForm): string {
    return `${index}-${assignment.dayId}`;
  }

  // --- Form Actions ---

  /**
   * Update patient information
   */
  updatePatient(): void {
    if (!this.isFormValid() || !this.patientId) return;

    this.loading = true;
    this.error = null;

    const updatedPatient: LTCPatient = {
      id: this.patientId,
      room_number: this.roomNumber,
      bed_number: this.bedNumber,
      age: this.age ?? 0,
      sex: this.sex,
      height_cm: this.height ?? 0,
      weight_kg: this.weight ?? 0,
      activity_level: this.activityLevel,
    };

    // Update patient data
    const updateSub = this.patientService.updateLTCPatient(this.patientId, updatedPatient).subscribe({
      next: (updated: LTCPatient) => {
        console.log('Patient updated successfully:', updated);
        this.updateMealAssignments();
      },
      error: (err) => {
        console.error('Error updating patient:', err);
        this.error = 'Failed to update patient information. Please try again.';
        this.loading = false;
      }
    });

    this.subscriptions.add(updateSub);
  }

  /**
   * Update meal assignments after patient update
   */
  private updateMealAssignments(): void {
    if (!this.patientId) {
      this.completeUpdate();
      return;
    }

    console.log('Starting meal assignment update process...');

    // Step 1: Delete all existing meal assignments
    this.deleteExistingMealAssignments()
      .pipe(
        // Step 2: Create new meal assignments
        switchMap(() => this.createNewMealAssignments()),
        catchError(error => {
          console.error('Error in meal assignment update process:', error);
          this.error = 'Patient updated, but there was an error updating meal assignments.';
          return of([]);
        })
      )
      .subscribe({
        next: (result) => {
          console.log('Meal assignment update completed:', result);
          this.completeUpdate();
        },
        error: (error) => {
          console.error('Final error in meal assignment update:', error);
          this.error = 'Patient updated, but meal assignments could not be updated.';
          this.completeUpdate();
        }
      });
  }

  /**
   * Delete existing meal assignments
   */
  private deleteExistingMealAssignments() {
    if (this.existingMealAssignments.length === 0) {
      console.log('No existing meal assignments to delete');
      return of(true);
    }

    console.log(`Deleting ${this.existingMealAssignments.length} existing meal assignments`);

    const deleteObservables = this.existingMealAssignments.map(assignment =>
      this.mealAssignmentService.deleteMealAssignment(assignment.id).pipe(
        catchError(error => {
          console.error(`Error deleting meal assignment ${assignment.id}:`, error);
          return of(null); // Continue with other deletions
        })
      )
    );

    return forkJoin(deleteObservables).pipe(
      switchMap(results => {
        const successCount = results.filter(result => result !== null).length;
        console.log(`Successfully deleted ${successCount} out of ${results.length} meal assignments`);
        return of(true);
      })
    );
  }

  /**
   * Create new meal assignments
   */
  private createNewMealAssignments() {
    const newAssignments = this.processMealAssignments();
    
    if (newAssignments.length === 0) {
      console.log('No new meal assignments to create');
      return of([]);
    }

    console.log(`Creating ${newAssignments.length} new meal assignments`);

    const createObservables = newAssignments.map(assignment =>
      this.mealAssignmentService.createMealAssignment(assignment).pipe(
        catchError(error => {
          console.error('Error creating meal assignment:', error, assignment);
          return of(null); // Continue with other creations
        })
      )
    );

    return forkJoin(createObservables).pipe(
      switchMap(results => {
        const successCount = results.filter(result => result !== null).length;
        console.log(`Successfully created ${successCount} out of ${results.length} meal assignments`);
        return of(results);
      })
    );
  }

  /**
   * Process meal assignments into service format
   */
  private processMealAssignments(): any[] {
    const assignmentsToCreate: any[] = [];

    this.mealAssignments
      .filter(assignment => 
        assignment.dayId && 
        (assignment.selectedLunchMeals.length > 0 || assignment.selectedDinnerMeals.length > 0)
      )
      .forEach(assignment => {
        const dayCycle = assignment.dayId;

        // Create lunch assignments
        assignment.selectedLunchMeals.forEach(mealId => {
          assignmentsToCreate.push({
            ltc_patient: this.patientId!,
            meal: mealId,
            day_cycle: dayCycle,
            meal_type: '午餐'
          });
        });

        // Create dinner assignments
        assignment.selectedDinnerMeals.forEach(mealId => {
          assignmentsToCreate.push({
            ltc_patient: this.patientId!,
            meal: mealId,
            day_cycle: dayCycle,
            meal_type: '晚餐'
          });
        });
      });

    return assignmentsToCreate;
  }

  /**
   * Complete the update process
   */
  private completeUpdate(): void {
    this.loading = false;
    
    const message = this.error 
      ? 'Patient information updated, but there were issues with meal assignments.'
      : 'Patient information and meal assignments updated successfully!';
    
    alert(message);
    
    if (!this.error) {
      // Navigate back to patient info page
      this.router.navigate(['/patient-info', this.patientId]);
    }
  }

  /**
   * Reset form to original values
   */
  resetForm(): void {
    if (this.originalPatientData) {
      this.populateForm(this.originalPatientData);
    }
    
    if (this.originalMealAssignments.length > 0) {
      this.mealAssignments = JSON.parse(JSON.stringify(this.originalMealAssignments));
    } else {
      this.initializeEmptyMealAssignment();
    }
  }

  /**
   * Cancel editing and navigate back
   */
  cancelEdit(): void {
    this.router.navigate(['/patient-info', this.patientId]);
  }

  /**
   * Check if form is valid
   */
  isFormValid(): boolean {
    return !!(this.roomNumber && this.bedNumber);
  }

  /**
   * Get form validation status
   */
  getFormValidationStatus(): any {
    return {
      isValid: this.isFormValid(),
      roomNumber: !!this.roomNumber,
      bedNumber: !!this.bedNumber,
      hasPatientId: !!this.patientId
    };
  }

  /**
   * Get meal assignment changes summary
   */
  getMealAssignmentChangesSummary(): any {
    const currentAssignments = this.processMealAssignments();
    const originalCount = this.existingMealAssignments.length;
    const newCount = currentAssignments.length;

    return {
      original: originalCount,
      new: newCount,
      change: newCount - originalCount,
      hasChanges: JSON.stringify(this.mealAssignments) !== JSON.stringify(this.originalMealAssignments)
    };
  }

  /**
   * Check if there are unsaved changes
   */
  hasUnsavedChanges(): boolean {
    const patientDataChanged = JSON.stringify(this.originalPatientData) !== JSON.stringify({
      id: this.patientId,
      room_number: this.roomNumber,
      bed_number: this.bedNumber,
      age: this.age,
      sex: this.sex,
      height_cm: this.height,
      weight_kg: this.weight,
      activity_level: this.activityLevel,
      dietary_restrictions: this.dietaryRestrictions
    });

    const mealAssignmentsChanged = JSON.stringify(this.mealAssignments) !== JSON.stringify(this.originalMealAssignments);

    return patientDataChanged || mealAssignmentsChanged;
  }
}
