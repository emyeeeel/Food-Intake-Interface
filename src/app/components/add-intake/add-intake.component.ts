import { Component, ElementRef, ViewChild, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import jsQR from 'jsqr';
import { MealAssignment } from '../../models/meal-assignment.mode';
import { MealAssignmentService } from '../../services/meal-assignment.service';
import { PatientService } from '../../services/patient.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IntakeService } from '../../services/intake.service';
import { DateService } from '../../services/date.service';
import JSZip from 'jszip';
import { WeightService } from '../../services/weight.service';
import { firstValueFrom, Observable, Subscription } from 'rxjs';
import { NotificationService } from '../../tx2/services/notification.service';
import { Auth } from '@angular/fire/auth';
import { LTCPatient } from '../../models/ltc-patient.model';
import { IntakeRecord } from '../../models/food-intake.model';
import { SettingsService } from '../../services/settings.service';
import { PopUpComponent } from '../pop-up/pop-up.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-add-intake',
  templateUrl: './add-intake.component.html',
  styleUrl: './add-intake.component.scss',
  imports: [CommonModule, FormsModule, PopUpComponent]
})
export class AddIntakeComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;

  scannedPatientId: number | null = null;

  mealAssignments: MealAssignment[] = [];
  selectedMealAssignmentId: number | 0 = 0;

  loadingAssignments = false;
  assignmentError: string | null = null;

  checking = true;
  showCapturePopup = false;
  intakes: IntakeRecord[] = [];

  // Scanner state
  showScanner = false;
  scanResult: string | null = null;

  // Meal selection state
  mealSelectionStep = false;
  selectedMealType: 'Before' | 'After' | null = null;

  private stream: MediaStream | null = null;
  private scanInterval: any;

  // DateService returns 0 when outside meal hours — treated as "unresolved"
  mealTimePeriod: '午餐' | '晚餐' | 0 = 0;

  // The resolved meal period derived from the assignment when mealTimePeriod is 0
  private effectiveMealPeriod: '午餐' | '晚餐' | null = null;

  patient: LTCPatient | null = null;
  dayCycle: number | null = null;

  isProcessing = false;
  loadingMessage = '';
  uploadCompleted = false;
  redirectStarted = false;

  mealPhaseStatus: '前' | '後' | 'done' | null = null;
  currentSelectedDate: Date = new Date();

  constructor(
    private router: Router,
    private http: HttpClient,
    private mealAssignmentService: MealAssignmentService,
    private patientService: PatientService,
    private intakeService: IntakeService,
    private dateService: DateService,
    private notificationService: NotificationService,
    private auth: Auth,
    public settingsService: SettingsService,
  ) {}

  async ngOnInit(): Promise<void> {
    // Ensure settings are loaded before checking meal period,
    // otherwise getCurrentMealPeriod() always returns 0
    if (!this.settingsService.settings) {
      await this.settingsService.load();
    }

    this.mealPeriod();
    this.dayCycle = this.getCurrentDayInCycle();
  }

  ngOnDestroy(): void {
    this.stopScanner();
  }

  mealPeriod(): void {
    this.mealTimePeriod = this.dateService.getCurrentMealPeriod();
    console.log('Loaded mealTime from DateService:', this.mealTimePeriod);
  }

  getCurrentDayInCycle(): number {
    return this.dateService.calculateDayCycleForDate(this.currentSelectedDate);
  }

  /**
   * Returns the period to use for phase checks.
   * Prefers the clock-based mealTimePeriod, falls back to the
   * assignment-derived effectiveMealPeriod when DateService returns 0.
   */
  private getActiveMealPeriod(): '午餐' | '晚餐' | null {
    if (this.mealTimePeriod !== 0) return this.mealTimePeriod;
    return this.effectiveMealPeriod;
  }

  loadPatientData(): void {
    if (this.scannedPatientId === null) return;

    const period = this.getActiveMealPeriod();
    if (!period) {
      console.warn('loadPatientData: meal period not yet resolved, skipping.');
      return;
    }

    this.intakeService
      .getIntakesByMealPeriod(this.scannedPatientId, period)
      .subscribe(intakes => {
        this.intakes = intakes;
        console.log('Number of food intakes:', intakes.length);
        console.log('First Intake Record Meal Details:', intakes[0]?.meal_detail?.meal_time, period);
      });
  }

  /**
   * Re-checks the meal phase status using the best available period.
   * Called after assignments load (which may resolve effectiveMealPeriod)
   * and directly from stopScanner when mealTimePeriod is already known.
   */
  private refreshMealPhaseStatus(): void {
    if (this.scannedPatientId === null) return;

    const period = this.getActiveMealPeriod();
    if (!period) {
      console.warn('refreshMealPhaseStatus: meal period not yet resolved, skipping.');
      return;
    }

    this.intakeService
      .getMealPhasesForDate(this.scannedPatientId, period)
      .subscribe(phase => {
        this.mealPhaseStatus = phase;
        console.log(`Meal Phase Status (period: ${period}):`, phase);
      });
  }

  goBackToSelection(): void {
    this.mealSelectionStep = true;
    this.selectedMealType = null;
    this.stopScanner();
  }

  toggleScanner(): void {
    if (this.showScanner) {
      this.stopScanner();
    } else {
      this.startScanner();
    }
  }

  startScanner(): void {
    this.showScanner = true;
    this.scanResult = null;

    navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    })
    .then(stream => {
      if (this.videoElement?.nativeElement) {
        this.videoElement.nativeElement.srcObject = stream;
        this.videoElement.nativeElement.play();
        console.log('Camera started successfully');
        this.startQRDetection();
      }
    })
    .catch(err => {
      console.error('Error accessing camera:', err);
      this.showScanner = false;
    });
  }

  stopScanner(): void {
    this.showScanner = false;

    if (this.videoElement?.nativeElement?.srcObject) {
      const stream = this.videoElement.nativeElement.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      this.videoElement.nativeElement.srcObject = null;
      console.log('Camera stopped');
    }

    console.log('SCAN RESULT BEFORE UPLOAD:', this.scanResult);

    if (this.scannedPatientId !== null) {
      // loadFilteredMeals resolves effectiveMealPeriod and calls
      // refreshMealPhaseStatus internally — so we call it first.
      this.loadFilteredMeals();

      console.log('Meal Assignments', this.mealAssignments);

      this.patientService.getLTCPatient(this.scannedPatientId).subscribe({
        next: (patient) => {
          this.patient = patient;
          console.log('Loaded patient:', this.patient);
        },
        error: (err) => console.error('Failed to load patient:', err)
      });

      // Only call directly when DateService already gave us a real period.
      // When mealTimePeriod is 0, loadFilteredMeals() resolves effectiveMealPeriod
      // from the assignment and calls refreshMealPhaseStatus there.
      if (this.mealTimePeriod !== 0) {
        this.refreshMealPhaseStatus();
      }
    }
  }

  setMealType(type: 'Before' | 'After'): void {
    this.selectedMealType = type;
  }

  loadFilteredMeals(): void {
    if (!this.scannedPatientId || !this.dayCycle) return;

    const fetchAssignments$ =
      this.mealTimePeriod === 0
        ? this.mealAssignmentService.getMealAssignmentsByLTCPatient(this.scannedPatientId)
        : this.intakeService.getAssignmentsByMealPeriod(
            this.scannedPatientId,
            this.mealTimePeriod,
            this.dayCycle
          );

    fetchAssignments$.subscribe(assignments => {
      let filteredAssignments = assignments.filter(
        a => a.meal_detail?.day_cycle === this.dayCycle
      );

      if (this.mealTimePeriod !== 0) {
        filteredAssignments = filteredAssignments.filter(
          a => a.meal_type === this.mealTimePeriod
        );
      }

      this.mealAssignments = filteredAssignments;
      console.log('Filtered assignments for today & meal period:', filteredAssignments);

      if (filteredAssignments.length > 0) {
        this.selectedMealAssignmentId = filteredAssignments[0].id;
        console.log('Auto-selected assignment ID:', this.selectedMealAssignmentId);

        // When DateService returned 0 (outside meal hours), derive the
        // effective meal period from the assignment itself so phase checks work.
        if (this.mealTimePeriod === 0) {
          const derived = filteredAssignments[0].meal_detail?.meal_time as '午餐' | '晚餐' | undefined;
          if (derived) {
            this.effectiveMealPeriod = derived;
            console.log('effectiveMealPeriod resolved from assignment:', derived);

            // Now that we have a valid period, load intakes and check phase
            this.loadPatientData();
            this.refreshMealPhaseStatus();
          } else {
            console.warn('Assignment has no meal_time — cannot resolve meal period.');
          }
        }
      } else {
        console.warn('No meal assignments found for this patient and meal period');
        this.selectedMealAssignmentId = 0;
      }
    });
  }

  onQRScanned(result: string): void {
    this.scanResult = result;

    const patientId = parseInt(result, 10);
    if (isNaN(patientId)) {
      console.warn('QR does not contain a patient ID');
      return;
    }

    this.scannedPatientId = patientId;
    // Reset derived period for fresh scan
    this.effectiveMealPeriod = null;
    this.mealPhaseStatus = null;
    this.selectedMealType = null;

    this.loadMealAssignments(patientId);
    this.stopScanner();
  }

  private loadMealAssignments(patientId: number): void {
    this.loadingAssignments = true;
    this.assignmentError = null;
    this.mealAssignments = [];

    this.mealAssignmentService
      .getMealAssignmentsByLTCPatient(patientId)
      .subscribe({
        next: (assignments) => {
          this.mealAssignments = assignments;
          this.loadingAssignments = false;
        },
        error: () => {
          this.assignmentError = '無法加載該患者的膳食分配';
          this.loadingAssignments = false;
        }
      });
  }

  getMealTypeDisplayText(): string {
    return this.selectedMealType === 'Before' ? '餐前' : '餐後';
  }

  private startQRDetection(): void {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    this.scanInterval = setInterval(() => {
      if (this.videoElement && this.videoElement.nativeElement.readyState === 4) {
        const video = this.videoElement.nativeElement;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        if (context) {
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          try {
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const qrResult = this.detectQRCode(imageData);
            if (qrResult) {
              this.onQRScanned(qrResult);
            }
          } catch (error) {
            console.error('QR detection error:', error);
          }
        }
      }
    }, 100);
  }

  private detectQRCode(imageData: ImageData): string | null {
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    return code ? code.data : null;
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
      if (grouped[today]) {
        return { [today]: grouped[today] };
      }
      return {};
    } catch (error) {
      console.error('Error determining today cycle day:', error);
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

  resetState(): void {
    this.isProcessing = false;
    this.loadingMessage = '';
    this.uploadCompleted = false;
    this.redirectStarted = false;
    this.scanResult = null;
    this.showScanner = false;
    this.scannedPatientId = null;
    this.effectiveMealPeriod = null;
    this.mealPhaseStatus = null;
    this.selectedMealType = null;
  }

  private redirectToQRLink(qrData: string): void {
    try {
      if (qrData.startsWith('http://') || qrData.startsWith('https://')) {
        window.open(qrData, '_blank');
      } else if (qrData.startsWith('/')) {
        this.router.navigate([qrData]);
      } else {
        const patientId = parseInt(qrData);
        if (!isNaN(patientId)) {
          this.router.navigate(['/patient', patientId]);
        } else {
          console.log('QR Code contains:', qrData);
          alert(`QR Code detected: ${qrData}`);
        }
      }
    } catch (error) {
      console.error('Error handling QR redirect:', error);
    }
  }

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
            console.log('now running tx2 backend');
            if (!this.selectedMealAssignmentId) {
              throw new Error('No meal assignment selected');
            }

            const assignment = this.mealAssignments.find(a => a.id === this.selectedMealAssignmentId);
            if (!assignment) {
              throw new Error('Selected meal assignment not found');
            }

            const jszip = new JSZip();
            const zip = await jszip.loadAsync(zipBlob);

            const rgbFileData = await zip.file('rgb_image.png')?.async('blob');
            if (!rgbFileData) throw new Error('RGB image not found in ZIP');

            const weightBlob = await zip.file('weightdatas.json')?.async('blob');
            if (!weightBlob) throw new Error('weightdatas.json not found in ZIP');

            const weightText = await weightBlob.text();
            console.log('Raw JSON text:', weightText);

            const imageFile = new File([rgbFileData], `intake_${Date.now()}.png`, { type: 'image/png' });

            const csvBlob = await zip.file('depth.csv')?.async('blob');
            if (!csvBlob) throw new Error('depth.csv not found in ZIP');

            const csvFile = new File([csvBlob], `depth_${Date.now()}.csv`, { type: 'text/csv' });

            let netWeight = 0;
            try {
              const weightData = JSON.parse(weightText);
              netWeight = weightData?.net_weight ?? 0;
            } catch (error) {
              console.error('Failed to parse weight JSON:', error);
            }

            const meal_phase = this.selectedMealType === 'Before' ? '前' : '後';
            console.log('meal_phase:', meal_phase);

            const formData = new FormData();
            formData.append('meal', assignment.meal.toString());
            formData.append('ltc_patient', (assignment.ltc_patient || 0).toString());
            formData.append('weight_g', netWeight.toString());

            if (meal_phase === '前') {
              formData.append('volume_ml', '100');
            } else {
              const beforeRecord = this.intakes.find(r => r.meal_phase === '前');
              if (beforeRecord && beforeRecord.weight_g > 0) {
                const consumed = ((beforeRecord.weight_g - netWeight) / beforeRecord.weight_g) * 100;
                formData.append('volume_ml', Math.max(0, Math.min(100, consumed)).toFixed(2));
              }
            }

            formData.append('recorded_at', new Date().toISOString());
            formData.append('meal_phase', meal_phase);
            formData.append('image', imageFile);
            formData.append('depth_csv', csvFile);

            const user = this.auth.currentUser;
            if (!user) return;
            const username = user.email ? user.email.split('@')[0] : 'Unknown';
            console.log('recorded_by:', username);
            formData.append('recorded_by', username);

            formData.append('machine', environment.machineID.toString());

            const createdRecord = await this.intakeService.createIntake(formData).toPromise();
            console.log('Intake record created successfully:', createdRecord);

            this.notificationService.addNotification({
              firebase_uid: user.uid,
              title: 'New Task',
              message: `${this.patient!.room_number} 房-${this.patient!.bed_number} 床，已為 ${assignment.meal_name} 餐${meal_phase}提供食物攝取記錄。`,
              read: false,
            });

            this.isProcessing = false;

            if (this.scannedPatientId) {
              this.router.navigate(['patient-info', this.scannedPatientId, 'intakes']);
            }

            resolve(createdRecord);

          } catch (err) {
            console.error('Failed to create intake record:', err);
            this.isProcessing = false;
            reject(err);
          }
        },
        error: (error) => {
          console.error('API Error:', error);
          this.isProcessing = false;
          reject(error);
        }
      });
    });
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