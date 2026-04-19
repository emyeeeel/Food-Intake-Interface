import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { MealAssignment } from '../../../models/meal-assignment.mode';
import { LTCPatient } from '../../../models/ltc-patient.model';
import { MealAssignmentService } from '../../../services/meal-assignment.service';
import { IntakeService } from '../../../services/intake.service';
import { DateService } from '../../../services/date.service';
import { WeightService } from '../../../services/weight.service';
import { PatientService } from '../../../services/patient.service';
import { SettingsService } from '../../../services/settings.service';
import { NotificationService } from '../../services/notification.service';
import { PopUpComponent } from '../../../components/pop-up/pop-up.component';

type MealPeriod = '午餐' | '晚餐' | 0;
type MealPhaseStatus = 'before' | 'after' | 'done' | null;

@Component({
  selector: 'app-add-intake',
  templateUrl: './add-intake.component.html',
  styleUrl: './add-intake.component.scss',
  imports: [CommonModule, FormsModule, PopUpComponent],
})
export class AddIntakeComponent implements OnInit, OnChanges {
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
  hasCurrentMealAssignment = false;
  showAssignmentDialog = false;
  assignmentDialogTitle = '';
  assignmentDialogMessage = '';

  showErrorDialog = false;
  errorDialogTitle = '';
  errorDialogMessage = '';

  autoSelectionReady = false;
  currentMealPeriod: MealPeriod = 0;
  mealPhaseStatus: MealPhaseStatus = null;
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
    this.initializePatientContext();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['scannedPatientId']) {
      this.initializePatientContext();
    }
  }

  private initializePatientContext(): void {
    console.log('[AddIntake] initializePatientContext:start', {
      scannedPatientId: this.scannedPatientId,
    });

    this.resetState();

    if (this.scannedPatientId === null) {
      console.warn('[AddIntake] initializePatientContext aborted because scannedPatientId is null');
      this.autoSelectionReady = true;
      this.logSelectionState('init-null-patient');
      return;
    }

    this.patientService.getLTCPatient(this.scannedPatientId).subscribe({
      next: (patient) => {
        this.patient = patient;
        console.log('[AddIntake] Loaded patient:', this.patient);
      },
      error: (err) => console.error('[AddIntake] Failed to load patient:', err),
    });

    this.loadMealAssignments(this.scannedPatientId);
  }

  private loadMealAssignments(patientId: number): void {
    console.log('[AddIntake] loadMealAssignments:start', { patientId });
    this.loadingAssignments = true;
    this.assignmentError = null;

    this.mealAssignmentService.getMealAssignmentsByLTCPatient(patientId).subscribe({
      next: (assignments) => {
        this.mealAssignments = assignments ?? [];
        this.loadingAssignments = false;
        console.log('[AddIntake] Meal Assignments:', this.mealAssignments);
        this.autoSelectMealAssignment(patientId);
      },
      error: (err) => {
        console.error('[AddIntake] Failed to load meal assignments:', err);
        this.assignmentError = '無法載入住民配餐資料';
        this.loadingAssignments = false;
        this.autoSelectionReady = true;
        this.hasCurrentMealAssignment = false;
        this.showMealAssignmentDialog('無法確認配餐狀態', '系統目前無法載入住民配餐資料，請稍後再試。');
        this.logSelectionState('load-assignments-error');
      },
    });
  }

  private autoSelectMealAssignment(patientId: number): void {
    // Mode-aware filter — mirrors the /intakes page guard. Without this, an
    // open-mode system with leftover cyclic assignments on the same patient
    // would resolve today's meal to the cyclic meal whose day_cycle happens
    // to equal today's cycle position, and the recorded FoodIntake would
    // point at the wrong Meal row.
    const mode = this.settingsService.menuMode;
    const today = this.dateService.getTodayDate();
    const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const todayCycleDay = this.dateService.getTodaysCycleDay().toString();
    const mealPeriod = this.dateService.getCurrentMealPeriod();
    this.currentMealPeriod = mealPeriod as MealPeriod;

    console.log('[AddIntake] mode:', mode, 'todayISO:', todayISO, 'todayCycleDay:', todayCycleDay, 'mealPeriod:', mealPeriod);

    if (!mealPeriod) {
      this.autoSelectionReady = true;
      this.logSelectionState('outside-meal-period');
      return;
    }

    const filtered = this.mealAssignments.filter((assignment) => {
      const meal = assignment.meal_detail;
      if (!meal) return false; // orphan (meal=NULL)

      const mealMode = (meal.menu_mode || 'cyclic') as 'cyclic' | 'open';
      if (mealMode !== mode) return false;

      if (meal.meal_time !== mealPeriod) return false;

      if (mode === 'open') {
        return meal.serve_date === todayISO;
      }
      const assignmentDay =
        assignment.day_cycle?.toString() ??
        meal.day_cycle?.toString() ??
        '';
      return assignmentDay === todayCycleDay;
    });

    console.log('[AddIntake] Filtered assignments for today & meal period:', filtered);

    if (filtered.length === 0) {
      this.hasCurrentMealAssignment = false;
      this.autoSelectionReady = true;
      this.showMealAssignmentDialog(
        '此住民沒有配餐',
        `${this.patient?.room_number ?? ''}-${this.patient?.bed_number ?? ''} 目前在今天的${mealPeriod}沒有配餐，請先完成膳食指派。`,
      );
      this.logSelectionState('no-matching-assignment');
      return;
    }

    const autoSelected = filtered[0];
    this.hasCurrentMealAssignment = true;
    this.selectedMealAssignmentId = autoSelected.id;

    console.log('[AddIntake] Auto-selected assignment:', autoSelected);

    const effectiveMealPeriod = (autoSelected.meal_detail?.meal_time ?? mealPeriod) as '午餐' | '晚餐';
    this.checkMealPhaseStatus(patientId, effectiveMealPeriod);
  }

  private checkMealPhaseStatus(patientId: number, mealPeriod: '午餐' | '晚餐'): void {
    this.intakeService.getIntakesByPatientDateAndMealPeriod(patientId, mealPeriod).subscribe({
      next: (records) => {
        this.intakeRecordsCount = records.length;
        const phases = new Set(records.map((record) => record.meal_phase).filter(Boolean));

        if (phases.has('餐前') && phases.has('餐後')) {
          this.mealPhaseStatus = 'done';
        } else if (phases.has('餐前')) {
          this.mealPhaseStatus = 'before';
        } else if (phases.has('餐後')) {
          this.mealPhaseStatus = 'after';
        } else {
          this.mealPhaseStatus = null;
        }

        this.autoSelectionReady = true;
        console.log('[AddIntake] Intake records:', records);
        this.logSelectionState('phase-status-loaded');
      },
      error: (err) => {
        console.error('[AddIntake] Failed to check meal phase status:', err);
        this.autoSelectionReady = true;
        this.logSelectionState('phase-status-error');
      },
    });
  }

  isBeforeDisabled(): boolean {
    return this.intakeRecordsCount > 0;
  }

  isAfterDisabled(): boolean {
    // After is only enabled when 餐前 is done but 餐後 is not yet recorded
    return this.mealPhaseStatus !== 'before';
  }

  isBothPhaseDone(): boolean {
    return this.mealPhaseStatus === 'done';
  }

  selectMealType(type: 'Before' | 'After'): void {
    this.selectedMealType = type;
    console.log('[AddIntake] Selected meal type:', type);
  }

  goBackToSelection(): void {
    this.mealSelectionStep = true;
    this.selectedMealType = null;
  }

  getMealTypeDisplayText(): string {
    return this.selectedMealType === 'Before' ? '餐前' : '餐後';
  }

  getMealsByDayCycle(): { [key: string]: MealAssignment[] } {
    const grouped: { [key: string]: MealAssignment[] } = {};
    this.mealAssignments.forEach((assignment) => {
      const day = assignment.day_cycle?.toString() || 'Unknown';
      if (!grouped[day]) {
        grouped[day] = [];
      }
      grouped[day].push(assignment);
    });

    try {
      const today = this.dateService.getTodaysCycleDay().toString();
      return grouped[today] ? { [today]: grouped[today] } : {};
    } catch (error) {
      console.error('[AddIntake] Error determining current cycle day:', error);
      return {};
    }
  }

  dayCycleSort = (
    a: { key: string; value: MealAssignment[] },
    b: { key: string; value: MealAssignment[] },
  ): number => Number(a.key) - Number(b.key);

  getMealsByType(assignments: MealAssignment[], type: string): MealAssignment[] {
    return assignments.filter((assignment) => assignment.meal_type === type);
  }

  hasMealsForToday(): boolean {
    return Object.keys(this.getMealsByDayCycle()).length > 0;
  }

  selectMealAssignment(assignment: MealAssignment): void {
    this.selectedMealAssignmentId = assignment.id;
    console.log('[AddIntake] Manually selected assignment:', assignment);
  }

  resetState(): void {
    this.patient = null;
    this.mealAssignments = [];
    this.selectedMealAssignmentId = null;
    this.loadingAssignments = false;
    this.assignmentError = null;
    this.showCapturePopup = false;
    this.mealSelectionStep = true;
    this.selectedMealType = null;
    this.isProcessing = false;
    this.loadingMessage = '';
    this.uploadCompleted = false;
    this.redirectStarted = false;
    this.hasCurrentMealAssignment = false;
    this.showAssignmentDialog = false;
    this.assignmentDialogTitle = '';
    this.assignmentDialogMessage = '';
    this.showErrorDialog = false;
    this.errorDialogTitle = '';
    this.errorDialogMessage = '';
    this.autoSelectionReady = false;
    this.currentMealPeriod = 0;
    this.mealPhaseStatus = null;
    this.intakeRecordsCount = 0;
  }

  closeMealAssignmentDialog(): void {
    this.showAssignmentDialog = false;
  }

  private showCaptureError(title: string, message: string): void {
    this.isProcessing = false;
    this.errorDialogTitle = title;
    this.errorDialogMessage = message;
    this.showErrorDialog = true;
  }

  closeErrorDialog(): void {
    this.showErrorDialog = false;
  }

  private showMealAssignmentDialog(title: string, message: string): void {
    this.assignmentDialogTitle = title;
    this.assignmentDialogMessage = message;
    this.showAssignmentDialog = true;
    console.log('[AddIntake] showMealAssignmentDialog:', { title, message });
  }

  public capture(): Promise<any> {
    this.isProcessing = true;

    return new Promise((resolve, reject) => {
      const machineIp = this.settingsService.machineIp;
      if (!machineIp) {
        this.showCaptureError('設定錯誤', '尚未設定機器 IP，請至設定頁面設定。');
        reject(new Error('Machine IP is not configured.'));
        return;
      }

      if (!this.selectedMealAssignmentId) {
        this.showCaptureError('操作錯誤', '尚未選擇配餐。');
        reject(new Error('No meal assignment selected'));
        return;
      }

      const assignment = this.mealAssignments.find((item) => item.id === this.selectedMealAssignmentId);
      if (!assignment) {
        this.showCaptureError('操作錯誤', '找不到選擇的配餐資料。');
        reject(new Error('Selected meal assignment not found'));
        return;
      }

      const apiUrl = `${machineIp}/api/capture/quick/`;

      this.http.post(apiUrl, {}, { responseType: 'arraybuffer', observe: 'response', withCredentials: false }).subscribe({
        next: async (response) => {
          try {
            console.log('[AddIntake] Quick capture received');

            const buffer = response.body as ArrayBuffer;
            if (!buffer || buffer.byteLength < 8) {
              throw new Error('No capture data received');
            }

            // Parse binary format: [4B png_len][png][4B depth_len][depth_gz][weight_json]
            const view = new DataView(buffer);
            let offset = 0;

            const pngLen = view.getUint32(offset); offset += 4;
            const pngData = buffer.slice(offset, offset + pngLen); offset += pngLen;

            const depthLen = view.getUint32(offset); offset += 4;
            const depthData = buffer.slice(offset, offset + depthLen); offset += depthLen;

            const weightJson = new TextDecoder().decode(new Uint8Array(buffer, offset));

            console.log(`[AddIntake] Parsed: png=${(pngLen/1024).toFixed(0)}KB depth=${(depthLen/1024).toFixed(0)}KB`);

            // Parse weight
            let netWeight = 0;
            let deviceId = 'unknown';
            try {
              const weightData = JSON.parse(weightJson);
              netWeight = weightData?.net_weight ?? 0;
              deviceId = weightData?.device_id ?? 'unknown';
              console.log('[AddIntake] Weight data:', weightData);
            } catch (e) {
              console.error('[AddIntake] Failed to parse weight:', e);
            }

            const imageFile = new File([pngData], `intake_${Date.now()}.png`, { type: 'image/png' });
            const depthFile = new File([depthData], `depth_${Date.now()}.bin.gz`, { type: 'application/gzip' });

            const mealPhase = this.selectedMealType === 'Before' ? '餐前' : '餐後';

            const formData = new FormData();
            formData.append('meal', assignment.meal.toString());
            formData.append('ltc_patient', (assignment.ltc_patient || 0).toString());
            formData.append('weight_g', netWeight.toString());
            formData.append('volume_ml', '0');
            formData.append('recorded_at', new Date().toISOString());
            formData.append('meal_phase', mealPhase);
            formData.append('image', imageFile);
            formData.append('depth_csv', depthFile);
            formData.append('device_id', deviceId);

            const createdRecord = await this.intakeService.createIntake(formData).toPromise();
            console.log('[AddIntake] Intake record created:', createdRecord);

            const user = this.auth.currentUser;
            if (user && this.patient) {
              this.notificationService.addNotification({
                firebase_uid: user.uid,
                title: 'New Task',
                message: `${this.patient.room_number}-${this.patient.bed_number} 已完成 ${assignment.meal_name} ${mealPhase} 記錄`,
                read: false,
              });
            }

            this.isProcessing = false;
            if (this.scannedPatientId) {
              this.intakeCompleted.emit();
            }

            resolve(createdRecord);
          } catch (err: any) {
            console.error('[AddIntake] Failed to create intake record:', err);
            this.showCaptureError('上傳失敗', err?.message || '建立食物攝取記錄時發生錯誤，請稍後再試。');
            reject(err);
          }
        },
        error: (error) => {
          console.error('[AddIntake] API Error:', error);
          const msg = error?.status === 0
            ? '無法連線到拍攝裝置，請確認裝置已啟動且網路正常。'
            : error?.status === 500
            ? '拍攝裝置發生內部錯誤（相機或秤重模組可能未就緒）。'
            : `連線錯誤 (HTTP ${error?.status || '?'})：${error?.message || '未知錯誤'}`;
          this.showCaptureError('拍攝失敗', msg);
          reject(error);
        },
      });
    });
  }

  get mealPeriodAssignmentLabel(): string {
    if (!this.currentMealPeriod) {
      return '';
    }

    const assignment = this.mealAssignments.find((item) => item.id === this.selectedMealAssignmentId);
    const mealName = assignment?.meal_detail?.meal_name ?? assignment?.meal_name ?? '';

    return mealName ? `${this.currentMealPeriod} - ${mealName}` : this.currentMealPeriod;
  }

  openCapturePopup(): void {
    this.showCapturePopup = true;
  }

  onCaptureConfirmed(): void {
    this.showCapturePopup = false;
    void this.capture();
  }

  onCaptureCancelled(): void {
    this.showCapturePopup = false;
  }

  private logSelectionState(stage: string): void {
    console.log('[AddIntake] selection-state', {
      stage,
      scannedPatientId: this.scannedPatientId,
      autoSelectionReady: this.autoSelectionReady,
      mealSelectionStep: this.mealSelectionStep,
      currentMealPeriod: this.currentMealPeriod,
      hasCurrentMealAssignment: this.hasCurrentMealAssignment,
      selectedMealAssignmentId: this.selectedMealAssignmentId,
      intakeRecordsCount: this.intakeRecordsCount,
      mealPhaseStatus: this.mealPhaseStatus,
      mealAssignmentsCount: this.mealAssignments.length,
    });
  }
}
