import { Component, OnInit, Input, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MealAssignmentService } from '../../services/meal-assignment.service';
import { PatientService } from '../../services/patient.service';
import { MealAssignment } from '../../models/meal-assignment.mode';
import { LTCPatient } from '../../models/ltc-patient.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-patient-meals',
  imports: [CommonModule],
  templateUrl: './patient-meals.component.html',
  styleUrl: './patient-meals.component.scss',
})
export class PatientMealsComponent implements OnInit, OnChanges, OnDestroy {
  @Input() patientId: number = 0;
  
  ltcPatient: LTCPatient | null = null;
  mealAssignments: MealAssignment[] = [];
  loading: boolean = true;
  error: string | null = null;
  
  private subscriptions: Subscription = new Subscription();

  constructor(
    private mealAssignmentService: MealAssignmentService,
    private patientService: PatientService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    // Get patient ID from route if not provided via Input
    if (!this.patientId) {
      const routePatientId = this.route.snapshot.paramMap.get('id');
      if (routePatientId) {
        this.patientId = parseInt(routePatientId, 10);
      }
    }

    if (this.patientId) {
      this.loadPatientMeals(this.patientId);
    } else {
      this.error = 'Patient ID is required';
      this.loading = false;
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['patientId'] && changes['patientId'].currentValue) {
      this.loadPatientMeals(changes['patientId'].currentValue);
    }
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  /**
   * Load patient meals data
   */
  public loadPatientMeals(patientId: number): void {
    this.loading = true;
    this.error = null;

    // Load LTC patient data first
    const patientSub = this.patientService.getLTCPatient(patientId).subscribe({
      next: (ltcPatientData) => {
        this.ltcPatient = ltcPatientData;
        console.log('LTC Patient loaded:', ltcPatientData);

        // Load meal assignments for LTC patient
        const mealsSub = this.mealAssignmentService.getMealAssignmentsByLTCPatient(patientId).subscribe({
          next: (assignments) => {
            this.mealAssignments = assignments;
            console.log('LTC Meal assignments loaded:', assignments);
            this.loading = false;
          },
          error: (err) => {
            console.error('LTC meal assignments error:', err);
            this.error = '膳食分配加載失敗.'; // Failed to load meal assignments
            this.loading = false;
          }
        });

        this.subscriptions.add(mealsSub);
      },
      error: (err) => {
        console.error('LTC patient error:', err);
        this.error = '加載LTC患者詳細資料失敗.'; // Failed to load LTC patient details
        this.loading = false;
      }
    });

    this.subscriptions.add(patientSub);
  }

  /**
   * Get LTC patient display name/identifier
   */
  getPatientDisplayName(): string {
    if (!this.ltcPatient) return `LTC Patient ${this.patientId}`;
    return `${this.ltcPatient.room_number}-${this.ltcPatient.bed_number}` || `LTC Patient ${this.patientId}`;
  }

  /**
   * Group meal assignments by day cycle
   */
  getMealsByDayCycle(): { [key: string]: MealAssignment[] } {
    const grouped: { [key: string]: MealAssignment[] } = {};
    
    this.mealAssignments.forEach(assignment => {
      const day = assignment.day_cycle?.toString() || 'Unknown';
      if (!grouped[day]) {
        grouped[day] = [];
      }
      grouped[day].push(assignment);
    });
    
    return grouped;
  }

  /**
   * Get meals by type for a specific day
   */
  getMealsByType(dayAssignments: MealAssignment[], mealType: string): MealAssignment[] {
    return dayAssignments.filter(assignment => assignment.meal_type === mealType);
  }

  /**
   * Navigate back to patient details
   */
  navigateToPatientDetails(): void {
    if (this.patientId) {
      this.router.navigate(['/patient-info/view', this.patientId]);
    }
  }

  /**
   * Navigate to edit patient
   */
  navigateToEditPatient(): void {
    if (this.patientId) {
      this.router.navigate(['/patient-info/edit', this.patientId]);
    }
  }

  /**
   * Navigate to patient intakes
   */
  navigateToPatientIntakes(): void {
    if (this.patientId) {
      this.router.navigate(['/patient-info/intakes', this.patientId]);
    }
  }
}
