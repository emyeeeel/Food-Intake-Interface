import { Component, OnInit, Input, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MealAssignmentService } from '../../services/meal-assignment.service';
import { PatientService } from '../../services/patient.service';
import { DateService } from '../../services/date.service';
import { MealAssignment } from '../../models/meal-assignment.mode';
import { LTCPatient } from '../../models/ltc-patient.model';
import { Subscription, skip } from 'rxjs';

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
  currentMenuMode: 'cyclic' | 'open' = 'cyclic';

  private subscriptions: Subscription = new Subscription();

  constructor(
    private mealAssignmentService: MealAssignmentService,
    private patientService: PatientService,
    private dateService: DateService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.currentMenuMode = this.dateService.getCurrentMenuMode();
    this.subscriptions.add(
      this.dateService.menuMode$.pipe(skip(1)).subscribe(mode => {
        this.currentMenuMode = mode;
        if (this.patientId) this.loadPatientMeals(this.patientId);
      })
    );

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
   * Group meal assignments by the current menu mode's time-unit key.
   * cyclic: assignment.day_cycle
   * open:   assignment.meal_detail?.serve_date
   */
  getMealsGroupedByMode(): { [key: string]: MealAssignment[] } {
    const grouped: { [key: string]: MealAssignment[] } = {};

    this.mealAssignments.forEach(assignment => {
      const key = this.getGroupKey(assignment);
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(assignment);
    });

    return grouped;
  }

  private getGroupKey(assignment: MealAssignment): string {
    if (this.currentMenuMode === 'open') {
      return assignment.meal_detail?.serve_date ?? 'Unknown';
    }
    return assignment.day_cycle?.toString() ?? 'Unknown';
  }

  /**
   * Mode-aware sort for keyvalue pipe.
   * cyclic: numeric (prevents 1,10,11,2...).
   * open:   ISO date strings sort correctly via localeCompare.
   */
  groupSort = (
    a: { key: string; value: MealAssignment[] },
    b: { key: string; value: MealAssignment[] }
  ): number => {
    if (this.currentMenuMode === 'open') {
      return a.key.localeCompare(b.key);
    }
    return (Number(a.key) || 0) - (Number(b.key) || 0);
  };

  /**
   * Header text for each group. cyclic: "第 N 天"; open: "YYYY-MM-DD (週X)".
   */
  formatGroupHeader(key: string): string {
    if (key === 'Unknown') return '未分類';
    if (this.currentMenuMode === 'open') {
      return `${key} (${this.dateService.getWeekdayLabel(key)})`;
    }
    return `第 ${key} 天`;
  }

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

    const isOpen = this.currentMenuMode === 'open';
    const columnLabel = isOpen ? '日期' : '天數';

    // Sort mode-aware: cyclic by day_cycle numerically, open by serve_date ISO string.
    const sortedAssignments = [...this.mealAssignments].sort((a, b) => {
      if (isOpen) {
        const aDate = a.meal_detail?.serve_date ?? '';
        const bDate = b.meal_detail?.serve_date ?? '';
        return aDate.localeCompare(bDate);
      }
      return (Number(a.day_cycle) || 0) - (Number(b.day_cycle) || 0);
    });

    // Map data for Excel with mode-aware column.
    const excelData = sortedAssignments.map(assignment => ({
      [columnLabel]: isOpen
        ? (assignment.meal_detail?.serve_date ?? '-')
        : (assignment.day_cycle ?? '-'),
      '餐別': assignment.meal_type ?? '-',
      '餐名': assignment.meal_detail?.meal_name || assignment.meal_name || '-',
    }));

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(excelData);
    const workbook: XLSX.WorkBook = {
      Sheets: { '膳食分配': worksheet },
      SheetNames: ['膳食分配']
    };

    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });

    const modeSuffix = isOpen ? '開放' : '循環';
    const fileName = `${this.mealAssignments[0].patient_identifier}-用餐安排-${modeSuffix}.xlsx`;

    saveAs(blob, fileName);
  }
  
}
