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
import { MealAssignment } from '../../models/meal-assignment.mode';

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
  name: string = '';
  national_id: string = '';
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
    { value: '1', label: '第1天' },
    { value: '2', label: '第2天' },
    { value: '3', label: '第3天' },
    { value: '4', label: '第4天' },
    { value: '5', label: '第5天' },
    { value: '6', label: '第6天' },
    { value: '7', label: '第7天' },
    { value: '8', label: '第8天' },
    { value: '9', label: '第9天' },
    { value: '10', label: '第10天' },
    { value: '11', label: '第11天' },
    { value: '12', label: '第12天' },
    { value: '13', label: '第13天' },
    { value: '14', label: '第14天' }
  ];

  private subscriptions: Subscription = new Subscription();

  successMessage: string = '';

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
      this.error = '未提供病患 ID';
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
        this.error = '載入病患資料失敗。請再試一次。';
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
    if (this.mealAssignments.length >= this.availableDays.length) return;

    // Auto-assign the next day cycle based on current count
    const nextDayId = (this.mealAssignments.length + 1).toString();
    const newIndex = this.mealAssignments.length;

    this.mealAssignments.push({
      dayId: nextDayId,
      lunchMeals: [],
      dinnerMeals: [],
      selectedLunchMeals: [],
      selectedDinnerMeals: []
    });

    this.loadMealsForDay(nextDayId, newIndex);
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
        // Use smart update instead of complete replacement
        this.updateMealAssignmentsSmartly();
        this.showSuccessMessage('病患資料已更新成功！');
      },
      error: (err) => {
        console.error('Error updating patient:', err);
        this.error = '更新病患資料失敗。請再試一次。';
        this.loading = false;
      }
    });

    this.subscriptions.add(updateSub);
  }

  /**
   * Process meal assignments into a format suitable for comparison or updates
   */
  private processMealAssignments(): any[] {
    if (!this.patientId) {
      console.error('Patient ID is required for meal assignments');
      return [];
    }
    
    return this.mealAssignments.flatMap(assignment => {
      if (!assignment.dayId) return []; // Skip assignments without day selected
      
      const dayCycle = assignment.dayId;
      const lunchAssignments = assignment.selectedLunchMeals.map(mealId => ({
        meal: mealId,
        day_cycle: dayCycle,
        meal_type: '午餐',
        ltc_patient: this.patientId
      }));
      const dinnerAssignments = assignment.selectedDinnerMeals.map(mealId => ({
        meal: mealId,
        day_cycle: dayCycle,
        meal_type: '晚餐',
        ltc_patient: this.patientId
      }));
      return [...lunchAssignments, ...dinnerAssignments];
    });
  }

  /**
   * Smart update meal assignments - only update what changed
   */
  private updateMealAssignmentsSmartly(): void {
    if (!this.patientId) {
      this.completeUpdate();
      return;
    }

    const currentAssignments = this.processMealAssignments();
    const existingAssignments = this.existingMealAssignments;

    // Compare and categorize changes
    const changes = this.compareMealAssignments(existingAssignments, currentAssignments);
    
    console.log('Assignment changes:', changes);

    if (changes.toDelete.length === 0 && changes.toCreate.length === 0) {
      console.log('No meal assignment changes detected');
      this.completeUpdate();
      return;
    }

    // Execute only necessary operations
    this.executeSmartMealAssignmentUpdates(changes)
      .subscribe({
        next: () => {
          console.log('Smart meal assignment update completed');
          this.completeUpdate();
        },
        error: (error) => {
          console.error('Error in smart meal assignment update:', error);
          this.error = '更新餐點分配失敗。';
          this.completeUpdate();
        }
      });
  }

  /**
   * Compare existing and new assignments to determine changes needed
   */
  private compareMealAssignments(existing: MealAssignment[], newAssignments: any[]) {
    const toDelete: MealAssignment[] = [];
    const toCreate: any[] = [];

    // Create lookup maps for comparison
    const existingMap = new Map();
    existing.forEach(assignment => {
      const key = `${assignment.meal}-${assignment.day_cycle}-${assignment.meal_type}`;
      existingMap.set(key, assignment);
    });

    const newMap = new Map();
    newAssignments.forEach(assignment => {
      const key = `${assignment.meal}-${assignment.day_cycle}-${assignment.meal_type}`;
      newMap.set(key, assignment);
    });

    // Find assignments to delete (exist in old but not in new)
    existingMap.forEach((assignment, key) => {
      if (!newMap.has(key)) {
        toDelete.push(assignment);
      }
    });

    // Find assignments to create (exist in new but not in old)
    newMap.forEach((assignment, key) => {
      if (!existingMap.has(key)) {
        toCreate.push(assignment);
      }
    });

    return { toDelete, toCreate };
  }

  /**
   * Execute smart updates - only delete and create what's necessary
   */
  private executeSmartMealAssignmentUpdates(changes: { toDelete: MealAssignment[], toCreate: any[] }) {
    const operations = [];

    // Add deletion operations
    if (changes.toDelete.length > 0) {
      const deleteOps = changes.toDelete.map(assignment =>
        this.mealAssignmentService.deleteMealAssignment(assignment.id).pipe(
          catchError(error => {
            console.error(`Error deleting meal assignment ${assignment.id}:`, error);
            return of(null);
          })
        )
      );
      operations.push(...deleteOps);
    }

    // Add creation operations
    if (changes.toCreate.length > 0) {
      const createOps = changes.toCreate.map(assignment =>
        this.mealAssignmentService.createMealAssignment(assignment).pipe(
          catchError(error => {
            console.error('Error creating meal assignment:', error);
            return of(null);
          })
        )
      );
      operations.push(...createOps);
    }

    if (operations.length === 0) {
      return of([]);
    }

    return forkJoin(operations);
  }

  /**
   * Complete the update process
   */
  private completeUpdate(): void {
    this.loading = false;
    
    const message = this.error 
      ? '病患資料已更新，但餐點分配發生問題。'
      : '病患資料與餐點分配已更新成功！';
    
    this.showSuccessMessage(message);
    
    if (!this.error) {
      // Navigate back to patient info page
      this.router.navigate(['/patient-info']);
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
    this.router.navigate(['/patient-info']);
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

  /**
   * Show success message
   */
  showSuccessMessage(message: string): void {
    this.successMessage = message;
    // Auto-hide after 5 seconds
    setTimeout(() => {
      this.clearSuccessMessage();
    }, 5000);
  }

  /**
   * Clear success message
   */
  clearSuccessMessage(): void {
    this.successMessage = '';
  }
}
