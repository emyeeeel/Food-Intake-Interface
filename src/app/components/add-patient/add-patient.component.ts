import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MealsService } from '../../services/meals.service';
import { PatientService } from '../../services/patient.service';
import { MealAssignmentService } from '../../services/meal-assignment.service';
import { Meal } from '../../models/meal.model';
import { LTCPatient } from '../../models/ltc-patient.model';
import { MealAssignment } from '../../models/meal-assignment.mode';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

export interface MealAssignmentForm {
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
  
  // Form data properties
  roomNumber: string = '';
  bedNumber: string = '';
  age: number | null = null;
  sex: string = '';
  height: number | null = null;
  weight: number | null = null;
  activityLevel: string = '';
  dietaryRestrictions: string = '';
  
  mealAssignments: MealAssignmentForm[] = [];
  availableDays: { value: string, label: string }[] = [];
  allMeals: Meal[] = [];

  // Form state
  isSubmitting: boolean = false;
  submitError: string = '';

  constructor(
    private mealsService: MealsService,
    private patientService: PatientService,
    private mealAssignmentService: MealAssignmentService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const totalDays = 14; 
    this.availableDays = Array.from({ length: totalDays }, (_, i) => ({
      value: (i + 1).toString(),
      label: `第${i + 1}天`
    }));
    // Load all meals on component initialization
    this.loadMeals();
  }

  private loadMeals(): void {
    this.mealsService.getMeals().subscribe({
      next: (meals) => {
        this.allMeals = meals;
        this.addMealAssignment(); // now safe to add assignment with meals
      },
      error: (error) => console.error(error)
    });
  }

  addMealAssignment(): void {
  const dayId = (this.mealAssignments.length + 1).toString();
  const newAssignment: MealAssignmentForm = {
    id: this.generateId(),
    dayId,
    lunchMeals: this.allMeals.filter(meal => meal.day_cycle.toString() === dayId && meal.meal_time === '午餐'),
    dinnerMeals: this.allMeals.filter(meal => meal.day_cycle.toString() === dayId && meal.meal_time === '晚餐'),
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

  trackByAssignment(index: number, assignment: MealAssignmentForm): string {
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
    // Reset form state
    this.isSubmitting = true;
    this.submitError = '';

    try {
      // Validate form data
      if (!this.validateForm()) {
        this.isSubmitting = false;
        return;
      }

      // Create LTC patient object (excluding id as it's auto-generated)
      const ltcPatient: LTCPatient = {
        id: 0, // Placeholder ID, as it will be auto-generated by the backend
        room_number: this.roomNumber,
        bed_number: this.bedNumber,
        age: this.age || 0,
        sex: this.sex,
        height_cm: this.height || 0,
        weight_kg: this.weight || 0,
        activity_level: this.activityLevel,
      };

      console.log('Submitting LTC Patient:', ltcPatient);

      // Submit patient to service
      this.patientService.postLTCPatient(ltcPatient).subscribe({
        next: (response) => {
          console.log('Patient created successfully:', response);
          
          // Now create meal assignments using the created patient's ID
          this.createMealAssignments(response.id);
        },
        error: (error) => {
          console.error('Error creating patient:', error);
          this.isSubmitting = false;
          this.submitError = '建立病患失敗。請再試一次。';
          
          // Show error message to user
          alert(`錯誤：${error.message || '建立病患失敗'}`);
        }
      });

    } catch (error) {
      console.error('Form submission error:', error);
      this.isSubmitting = false;
      this.submitError = '發生未預期的錯誤。';
      alert('發生未預期的錯誤。請再試一次。');
    }
  }

  /**
   * Create meal assignments for the newly created patient
   */
  private createMealAssignments(patientId: number): void {
    console.log('Creating meal assignments for patient ID:', patientId);
    console.log('Current meal assignments: ', this.mealAssignments);

    // Process meal assignments into the format expected by the service
    const mealAssignmentsToCreate = this.processMealAssignments(patientId);
    
    if (mealAssignmentsToCreate.length === 0) {
      console.log('No meal assignments to create');
      this.onMealAssignmentsComplete(patientId, []);
      return;
    }

    console.log('Processed meal assignments:', mealAssignmentsToCreate);

    // Create all meal assignments using forkJoin for parallel execution
    const assignmentObservables = mealAssignmentsToCreate.map(assignment => 
      this.mealAssignmentService.createMealAssignment(assignment)
    );

    forkJoin(assignmentObservables).subscribe({
      next: (createdAssignments) => {
        console.log('All meal assignments created successfully:', createdAssignments);
        this.onMealAssignmentsComplete(patientId, createdAssignments);
      },
      error: (error) => {
        console.error('Error creating meal assignments:', error);
        
        // Patient was created but meal assignments failed
        alert(`病患建立成功，但建立餐點分配時發生錯誤：${error.message || '未知錯誤'}`);
        this.onMealAssignmentsComplete(patientId, [], error);
      }
    });
  }

  /**
   * Process form meal assignments into service format
   */
  private processMealAssignments(patientId: number): any[] {
    const assignmentsToCreate: any[] = [];

    this.mealAssignments
      .filter(assignment => 
        assignment.dayId && 
        (assignment.selectedLunchMeals.length > 0 || assignment.selectedDinnerMeals.length > 0)
      )
      .forEach(assignment => {
        const dayCycle = parseInt(assignment.dayId);

        // Create lunch assignments
        assignment.selectedLunchMeals.forEach(mealId => {
          assignmentsToCreate.push({
            ltc_patient: patientId,
            meal: mealId,
            day_cycle: dayCycle.toString(),
            meal_type: '午餐'
          });
        });

        // Create dinner assignments
        assignment.selectedDinnerMeals.forEach(mealId => {
          assignmentsToCreate.push({
            ltc_patient: patientId,
            meal: mealId,
            day_cycle: dayCycle.toString(),
            meal_type: '晚餐'
          });
        });
      });

    return assignmentsToCreate;
  }

  /**
   * Handle completion of meal assignment creation
   */
  private onMealAssignmentsComplete(patientId: number, createdAssignments: any[], error?: any): void {
    this.isSubmitting = false;

    if (error) {
      // Patient created but meal assignments failed
      console.error('Meal assignment creation failed:', error);
    } else {
      // Everything successful
      console.log(`Patient ${patientId} created with ${createdAssignments.length} meal assignments`);
    }

    // Show success message
    const message = error 
      ? '病患已新增成功！但部分餐點分配無法建立。'
      : '病患與餐點分配已新增成功！';
    
    alert(message);
    
    // Navigate to the patient's page
    this.router.navigate(['/patient-info/view', patientId]);
    
    // Clear form after navigation
    this.clearForm();
  }

  private validateForm(): boolean {
    // Required field validation
    if (!this.roomNumber.trim()) {
      alert('房號為必填');
      return false;
    }

    if (!this.bedNumber.trim()) {
      alert('床位為必填');
      return false;
    }

    // Basic validation for numeric fields
    if (this.age !== null && this.age <= 0) {
      alert('年齡必須為正數');
      return false;
    }

    if (this.height !== null && this.height <= 0) {
      alert('身高必須為正數');
      return false;
    }

    if (this.weight !== null && this.weight <= 0) {
      alert('體重必須為正數');
      return false;
    }

    return true;
  }

  clearForm(): void {
    // Reset form data
    this.roomNumber = '';
    this.bedNumber = '';
    this.age = null;
    this.sex = '';
    this.height = null;
    this.weight = null;
    this.activityLevel = '';
    this.dietaryRestrictions = '';

    // Reset meal assignments
    this.mealAssignments = [];
    this.addMealAssignment();

    // Reset form state
    this.isSubmitting = false;
    this.submitError = '';

    console.log('Form cleared');
  }

  /**
   * Get summary of current meal assignments for display/debugging
   */
  getMealAssignmentsSummary(): any {
    return {
      totalAssignments: this.mealAssignments.length,
      assignmentsWithMeals: this.mealAssignments.filter(a => 
        a.dayId && (a.selectedLunchMeals.length > 0 || a.selectedDinnerMeals.length > 0)
      ).length,
      details: this.mealAssignments.map(assignment => ({
        day: assignment.dayId,
        lunchCount: assignment.selectedLunchMeals.length,
        dinnerCount: assignment.selectedDinnerMeals.length
      }))
    };
  }

  /**
   * Check if form has any meal assignments
   */
  hasMealAssignments(): boolean {
    return this.mealAssignments.some(assignment => 
      assignment.dayId && 
      (assignment.selectedLunchMeals.length > 0 || assignment.selectedDinnerMeals.length > 0)
    );
  }
}
