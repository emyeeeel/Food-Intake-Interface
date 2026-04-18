import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Meal } from '../../models/meal.model';
import { LTCPatient } from '../../models/ltc-patient.model';
import { MealAssignmentService, BulkAssignResponse } from '../../services/meal-assignment.service';
import { PatientService } from '../../services/patient.service';

type AssignMode = 'all' | 'manual';

/**
 * Reusable assign-meal-to-residents dialog.
 *
 * Used from:
 *  - display-meal 每列 📋 按鈕（單筆 meal）
 *  - add-meal 送出後（多筆 meal 一起配）
 *  - meal-admin 未來也可以接進來
 *
 * Flow:
 *  1. Opens with radio: 配發給所有住民 (default) / 手動選擇
 *  2. Manual → expand patient checkbox list inline
 *  3. User clicks 確認 → second confirm() with impact count
 *  4. POST /api/meal-assignments/bulk_assign/
 *  5. Emit completed event; host decides what to do next
 */
@Component({
  selector: 'app-assign-meal-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './assign-meal-dialog.component.html',
  styleUrl: './assign-meal-dialog.component.scss',
})
export class AssignMealDialogComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() meals: Meal[] = [];

  @Output() closed = new EventEmitter<void>();
  @Output() completed = new EventEmitter<BulkAssignResponse>();

  mode: AssignMode = 'all';
  patients: LTCPatient[] = [];
  selectedPatientIds: Set<number> = new Set();
  loadingPatients = false;
  loadError: string | null = null;

  submitting = false;
  submitError: string | null = null;

  constructor(
    private mealAssignmentService: MealAssignmentService,
    private patientService: PatientService,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue === true && !changes['isOpen'].previousValue) {
      this.resetAndLoad();
    }
  }

  private resetAndLoad(): void {
    this.mode = 'all';
    this.selectedPatientIds = new Set();
    this.submitError = null;
    this.loadError = null;
    this.loadPatients();
  }

  private loadPatients(): void {
    this.loadingPatients = true;
    this.patientService.getLTCPatients().subscribe({
      next: (patients) => {
        this.patients = patients ?? [];
        this.loadingPatients = false;
      },
      error: (err) => {
        console.error('[AssignDialog] load patients failed:', err);
        this.loadError = '載入住民列表失敗。';
        this.loadingPatients = false;
      },
    });
  }

  togglePatient(id: number): void {
    if (this.selectedPatientIds.has(id)) {
      this.selectedPatientIds.delete(id);
    } else {
      this.selectedPatientIds.add(id);
    }
  }

  isPatientSelected(id: number): boolean {
    return this.selectedPatientIds.has(id);
  }

  selectAllPatients(): void {
    this.selectedPatientIds = new Set(this.patients.map(p => p.id));
  }

  clearAllPatients(): void {
    this.selectedPatientIds = new Set();
  }

  patientLabel(p: LTCPatient): string {
    const nameBit = p.name ? ` ${p.name}` : '';
    return `${p.room_number}-${p.bed_number}${nameBit}`;
  }

  /** Target patient count based on current mode. */
  get targetPatientCount(): number {
    if (this.mode === 'all') return this.patients.length;
    return this.selectedPatientIds.size;
  }

  /** Max rows that would be created (assuming no prior overlaps). */
  get projectedAssignmentCount(): number {
    return this.meals.length * this.targetPatientCount;
  }

  canSubmit(): boolean {
    if (this.submitting) return false;
    if (this.meals.length === 0) return false;
    if (this.mode === 'manual' && this.selectedPatientIds.size === 0) return false;
    if (this.patients.length === 0) return false;
    return true;
  }

  close(): void {
    if (this.submitting) return;
    this.closed.emit();
  }

  submit(): void {
    if (!this.canSubmit()) return;

    const mealIds = this.meals.map(m => m.id);
    const patientIds = this.mode === 'all' ? null : Array.from(this.selectedPatientIds);

    // Double-confirm with concrete projected numbers.
    const label = this.mode === 'all' ? `全部 ${this.patients.length} 位住民` : `所選 ${this.selectedPatientIds.size} 位住民`;
    const ok = confirm(
      `將把 ${this.meals.length} 道菜色配發給${label}，` +
      `最多建立 ${this.projectedAssignmentCount} 筆指派（已存在的會自動略過）。\n\n確定要執行嗎？`
    );
    if (!ok) return;

    this.submitting = true;
    this.submitError = null;
    this.mealAssignmentService.bulkAssign(mealIds, patientIds).subscribe({
      next: (res) => {
        this.submitting = false;
        this.completed.emit(res);
      },
      error: (err) => {
        console.error('[AssignDialog] bulk_assign failed:', err);
        this.submitError = err?.error?.detail || err?.message || '配餐失敗';
        this.submitting = false;
      },
    });
  }
}
