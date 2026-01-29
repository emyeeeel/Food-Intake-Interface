import { Component, OnInit, Input, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MealAssignmentService } from '../../services/meal-assignment.service';
import { PatientService } from '../../services/patient.service';
import { MealAssignment } from '../../models/meal-assignment.mode';
import { LTCPatient } from '../../models/ltc-patient.model';
import { Subscription } from 'rxjs';

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

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

  public exportMealAssignmentsToExcel(): void {
    if (this.mealAssignments.length === 0) {
      alert('沒有膳食分配可導出。');
      return;
    }

    // Sort mealAssignments by day_cycle, then by meal_type (optional)
    const sortedAssignments = [...this.mealAssignments].sort((a, b) => {
      return (Number(a.day_cycle) || 0) - (Number(b.day_cycle) || 0);
    });
  
    // Map data for Excel
    const excelData = sortedAssignments.map(assignment => ({
      '天數': assignment.day_cycle ?? '-',
      '餐別': assignment.meal_type ?? '-',
      '餐名': assignment.meal_detail?.meal_name || assignment.meal_name || '-',
    }));
  
    // Create worksheet and workbook
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(excelData);
    const workbook: XLSX.WorkBook = {
      Sheets: { '膳食分配': worksheet },
      SheetNames: ['膳食分配']
    };
  
    // Write and save
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
  
    const fileName = `${this.mealAssignments[0].patient_identifier}-用餐安排.xlsx`;
  
    saveAs(blob, fileName);
  }
  
}
