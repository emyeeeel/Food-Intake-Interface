import { Component, OnInit, Input, inject, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import JSZip from 'jszip';
import { firstValueFrom } from 'rxjs';
import { MealAssignment } from '../../../models/meal-assignment.mode';
import { MealAssignmentService } from '../../../services/meal-assignment.service';
import { IntakeService } from '../../../services/intake.service';
import { DateService } from '../../../services/date.service';
import { WeightService } from '../../../services/weight.service';
import { NotificationService } from '../../services/notification.service';
import { Auth } from '@angular/fire/auth';
import { LTCPatient } from '../../../models/ltc-patient.model';
import { PatientService } from '../../../services/patient.service';
import { SettingsService } from '../../../services/settings.service';
import { PopUpComponent } from "../../../components/pop-up/pop-up.component";

@Component({
  selector: 'app-add-intake',
  templateUrl: './add-intake.component.html',
  styleUrl: './add-intake.component.scss',
  imports: [CommonModule, FormsModule, PopUpComponent]
})
export class AddIntakeComponent implements OnInit {
  @Input() scannedPatientId: number | null = null;
  @Output() intakeCompleted = new EventEmitter<void>();
  patient: LTCPatient | null = null;

  mealAssignments: MealAssignment[] = [];
  selectedMealAssignmentId: number | null = null;

  loadingAssignments = false;
  assignmentError: string | null = null;
  showCapturePopup = false;

  mealSelectionStep = true;
  selectedMealType: 'Before' | 'After' | null = null;

  isProcessing = false;
  loadingMessage = '';
  uploadCompleted = false;
  redirectStarted = false;

  // ── Auto-selection state ──────────────────────────────────────────────────
  autoSelectionReady = false;
  currentMealPeriod: '午餐' | '晚餐' | 0 = 0;
  mealPhaseStatus: '前' | '後' | 'done' | null = null;
  intakeRecordsCount = 0;

  constructor(
    private router: Router,
    private auth: Auth,
    private http: HttpClient,
    private mealAssignmentService: MealAssignmentService,
    private intakeService: IntakeService,
    private dateService: DateService,
    private weightService: WeightService,
    private notificationService: NotificationService,
    private patientService: PatientService,
    public settingsService: SettingsService,
  ) {}

  ngOnInit(): void {
    if (this.scannedPatientId !== null) {
      console.log('[AddIntake] scannedPatientId:', this.scannedPatientId);

      // 1. Load patient info
      this.patientService.getLTCPatient(this.scannedPatientId).subscribe({
        next: (patient) => {
          this.patient = patient;
          console.log('[AddIntake] Loaded patient:', this.patient);
        },
        error: (err) => console.error('[AddIntake] Failed to load patient:', err)
      });

      // 2. Load meal assignments, then auto-select
      this.loadMealAssignments(this.scannedPatientId);
    }
  }

  // ── Meal Assignment Loading & Auto-Selection ──────────────────────────────

  private loadMealAssignments(patientId: number): void {
    this.loadingAssignments = true;
    this.assignmentError = null;
    this.mealAssignments = [];

    this.mealAssignmentService
      .getMealAssignmentsByLTCPatient(patientId)
      .subscribe({
        next: (assignments) => {
          this.mealAssignments = assignments;
          console.log('[AddIntake] Meal Assignments:', assignments);
          this.loadingAssignments = false;
          this.autoSelectMealAssignment(patientId);
        },
        error: () => {
          this.assignmentError = '無法加載該患者的膳食分配';
          this.loadingAssignments = false;
          this.autoSelectionReady = true;
        }
      });
  }

  private autoSelectMealAssignment(patientId: number): void {
    const todayCycleDay = this.dateService.getTodaysCycleDay();
    const mealPeriod = this.dateService.getCurrentMealPeriod();
    this.currentMealPeriod = mealPeriod;

    console.log('[AddIntake] Today\'s cycle day:', todayCycleDay);
    console.log('[AddIntake] Current meal period:', mealPeriod);

    if (!mealPeriod) {
      console.warn('[AddIntake] Outside configured meal time ranges — no period resolved.');
      this.autoSelectionReady = true;
      return;
    }

    // Filter assignments matching today's cycle day AND the current meal period
    const filtered = this.mealAssignments.filter(a => {
      const matchesDay = a.day_cycle?.toString() === todayCycleDay.toString()
        || a.meal_detail?.day_cycle?.toString() === todayCycleDay.toString();
      const matchesPeriod = a.meal_detail?.meal_time === mealPeriod;
      return matchesDay && matchesPeriod;
    });

    console.log('[AddIntake] Filtered assignments for today & meal period:', filtered);

    if (filtered.length === 0) {
      console.warn('[AddIntake] No matching assignment found for today. Cannot auto-select.');
      this.autoSelectionReady = true;
      return;
    }

    // Auto-select the first matching assignment
    const autoSelected = filtered[0];
    this.selectedMealAssignmentId = autoSelected.id;
    console.log('[AddIntake] Auto-selected assignment ID:', autoSelected.id);
    console.log('[AddIntake] Auto-selected assignment detail:', autoSelected);

    const effectiveMealPeriod = autoSelected.meal_detail?.meal_time ?? mealPeriod;
    console.log('[AddIntake] effectiveMealPeriod resolved from assignment:', effectiveMealPeriod);

    // Now check existing intake records to determine phase status
    this.checkMealPhaseStatus(patientId, effectiveMealPeriod as '午餐' | '晚餐');
  }

  private checkMealPhaseStatus(patientId: number, mealPeriod: '午餐' | '晚餐'): void {
    this.intakeService
      .getIntakesByPatientDateAndMealPeriod(patientId, mealPeriod)
      .subscribe({
        next: (records) => {
          this.intakeRecordsCount = records.length;

          console.log('[AddIntake] Number of food intakes:', records.length);
          console.log('[AddIntake] Intake records count:', this.intakeRecordsCount);
          console.log(
            '[AddIntake] First intake record meal details:',
            records[0]?.meal_detail,
            records[0]?.meal_detail?.meal_time
          );

          // Derive phase status from existing records
          const phases = new Set(records.map(r => r.meal_phase).filter(Boolean));
          let status: '前' | '後' | 'done' | null = null;

          if (phases.has('前') && phases.has('後')) {
            status = 'done';
          } else if (phases.has('前')) {
            status = '前';
          } else if (phases.has('後')) {
            status = '後';
          }

          this.mealPhaseStatus = status;
          console.log(`[AddIntake] Meal Phase Status (period: ${mealPeriod}):`, status);

          this.autoSelectionReady = true;
        },
        error: (err) => {
          console.error('[AddIntake] Failed to check meal phase status:', err);
          this.autoSelectionReady = true;
        }
      });
  }

  // ── Button state helpers ──────────────────────────────────────────────────

  /** 餐前 is disabled once any record exists for this meal period today */
  isBeforeDisabled(): boolean {
    return this.intakeRecordsCount > 0;
  }

  /** 餐後 is disabled until at least one record exists (before must come first) */
  isAfterDisabled(): boolean {
    return this.intakeRecordsCount === 0;
  }

  // ── Meal type selection ───────────────────────────────────────────────────

  selectMealType(type: 'Before' | 'After'): void {
    this.selectedMealType = type;
    console.log('[AddIntake] Selected meal type:', type);
  }

  goBackToSelection(): void {
    this.mealSelectionStep = true;
    this.selectedMealType = null;
  }

  // ── Display helpers ───────────────────────────────────────────────────────

  getMealTypeDisplayText(): string {
    return this.selectedMealType === 'Before' ? '餐前' : '餐後';
  }

  getMealsByDayCycle(): { [key: string]: MealAssignment[] } {
    const grouped: { [key: string]: MealAssignment[] } = {};
    this.mealAssignments.forEach(a => {
      const day = a.day_cycle?.toString() || 'Unknown';
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(a);
    });

    try {
      const today = this.dateService.getTodaysCycleDay().toString();
      return grouped[today] ? { [today]: grouped[today] } : {};
    } catch (error) {
      console.error('[AddIntake] Error determining today cycle day:', error);
      return {};
    }
  }

  dayCycleSort = (
    a: { key: string; value: MealAssignment[] },
    b: { key: string; value: MealAssignment[] }
  ): number => Number(a.key) - Number(b.key);

  getMealsByType(assignments: MealAssignment[], type: string): MealAssignment[] {
    return assignments.filter(a => a.meal_type === type);
  }

  hasMealsForToday(): boolean {
    return Object.keys(this.getMealsByDayCycle()).length > 0;
  }

  selectMealAssignment(assignment: MealAssignment): void {
    this.selectedMealAssignmentId = assignment.id;
    console.log('[AddIntake] Manually selected assignment:', assignment);
  }

  resetState(): void {
    this.isProcessing = false;
    this.loadingMessage = '';
    this.uploadCompleted = false;
    this.redirectStarted = false;
    this.scannedPatientId = null;
    this.autoSelectionReady = false;
    this.mealPhaseStatus = null;
    this.selectedMealAssignmentId = null;
    this.intakeRecordsCount = 0;
  }

  // ── Capture ───────────────────────────────────────────────────────────────

  public capture(): Promise<any> {
    this.isProcessing = true;
    return new Promise((resolve, reject) => {
      const machineIp = this.settingsService.machineIp;
      if (!machineIp) {
        this.isProcessing = false;
        reject(new Error('Machine IP is not configured. Please set it in Settings.'));
        return;
      }

      const apiUrl = `${machineIp}/api/capture/meal/`;

      this.http.post(apiUrl, {}, { responseType: 'blob', withCredentials: false }).subscribe({
        next: async (zipBlob) => {
          try {
            console.log('[AddIntake] Running TX2 backend capture...');
            if (!this.selectedMealAssignmentId) throw new Error('No meal assignment selected');

            const assignment = this.mealAssignments.find(a => a.id === this.selectedMealAssignmentId);
            if (!assignment) throw new Error('Selected meal assignment not found');

            const jszip = new JSZip();
            const zip = await jszip.loadAsync(zipBlob);

            const rgbFileData = await zip.file("rgb_image.png")?.async("blob");
            if (!rgbFileData) throw new Error("RGB image not found in ZIP");

            const weightBlob = await zip.file("weightdatas.json")?.async("blob");
            if (!weightBlob) throw new Error("weightdatas.json not found in ZIP");

            const weightText = await weightBlob.text();
            console.log("[AddIntake] Raw weight JSON:", weightText);

            const imageFile = new File([rgbFileData], `intake_${Date.now()}.png`, { type: 'image/png' });

            const csvBlob = await zip.file("depth.csv")?.async("blob");
            if (!csvBlob) throw new Error("depth.csv not found in ZIP");

            const csvFile = new File([csvBlob], `depth_${Date.now()}.csv`, { type: "text/csv" });

            let netWeight = 0;
            try {
              const weightData = JSON.parse(weightText);
              netWeight = weightData?.net_weight ?? 0;
            } catch (error) {
              console.error('[AddIntake] Failed to parse weight JSON:', error);
            }

            const meal_phase = this.selectedMealType === 'Before' ? '前' : '後';

            const formData = new FormData();
            formData.append('meal', assignment.meal.toString());
            formData.append('ltc_patient', (assignment.ltc_patient || 0).toString());
            formData.append('weight_g', netWeight.toString());
            formData.append('volume_ml', '0');
            formData.append('recorded_at', new Date().toISOString());
            formData.append('meal_phase', meal_phase);
            formData.append('image', imageFile);
            formData.append('depth_csv', csvFile);

            const createdRecord = await this.intakeService.createIntake(formData).toPromise();
            console.log('[AddIntake] Intake record created:', createdRecord);

            const user = this.auth.currentUser;
            if (!user) return;

            this.notificationService.addNotification({
              firebase_uid: user.uid,
              title: 'New Task',
              message: `${this.patient!.room_number} 房-${this.patient!.bed_number} 床，已為 ${assignment.meal_name} 餐${meal_phase}提供食物攝取記錄。`,
              read: false,
            });

            this.isProcessing = false;

            if (this.scannedPatientId) {
              this.intakeCompleted.emit();
            }

          } catch (err) {
            console.error('[AddIntake] Failed to create intake record:', err);
            reject(err);
          }
        },
        error: (error) => {
          console.error('[AddIntake] API Error:', error);
          reject(error);
        }
      });
    });
  }

  // ── Getters ───────────────────────────────────────────────────────────────

  get mealPeriodAssignmentLabel(): string {
    if (!this.currentMealPeriod) return '';

    const assignment = this.mealAssignments.find(a => a.id === this.selectedMealAssignmentId);
    const mealName = assignment?.meal_detail?.meal_name ?? assignment?.meal_name ?? '';

    return mealName ? `${this.currentMealPeriod} - ${mealName}` : this.currentMealPeriod;
  }

  openCapturePopup(): void {
    this.showCapturePopup = true;
  }

  onCaptureConfirmed(): void {
    this.showCapturePopup = false;
    this.capture();
  }

  onCaptureCancelled(): void {
    this.showCapturePopup = false;
  }
}