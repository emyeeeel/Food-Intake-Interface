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

  public loadPatientMeals(patientId: number): void {
    this.loading = true;
    this.error = null;

    const patientSub = this.patientService.getLTCPatient(patientId).subscribe({
      next: (ltcPatientData) => {
        this.ltcPatient = ltcPatientData;

        const mealsSub = this.mealAssignmentService
          .getMealAssignmentsByLTCPatient(patientId)
          .subscribe({
            next: (assignments) => {
              this.mealAssignments = assignments;
              this.loading = false;
            },
            error: () => {
              this.error = '膳食分配加載失敗.';
              this.loading = false;
            }
          });

        this.subscriptions.add(mealsSub);
      },
      error: () => {
        this.error = '加載LTC患者詳細資料失敗.';
        this.loading = false;
      }
    });

    this.subscriptions.add(patientSub);
  }

  getPatientDisplayName(): string {
    if (!this.ltcPatient) return `LTC Patient ${this.patientId}`;
    return `${this.ltcPatient.room_number}-${this.ltcPatient.bed_number}`;
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
   * 🔑 Numeric sort for keyvalue pipe (prevents 1,10,11,2...)
   */
  dayCycleSort = (
    a: { key: string; value: MealAssignment[] },
    b: { key: string; value: MealAssignment[] }
  ): number => {
    return Number(a.key) - Number(b.key);
  };

  getMealsByType(dayAssignments: MealAssignment[], mealType: string): MealAssignment[] {
    return dayAssignments.filter(a => a.meal_type === mealType);
  }

  navigateToPatientDetails(): void {
    if (this.patientId) {
      this.router.navigate(['/patient-info/view', this.patientId]);
    }
  }

  navigateToEditPatient(): void {
    if (this.patientId) {
      this.router.navigate(['/patient-info/edit', this.patientId]);
    }
  }

  navigateToPatientIntakes(): void {
    if (this.patientId) {
      this.router.navigate(['/patient-info/intakes', this.patientId]);
    }
  }
}
