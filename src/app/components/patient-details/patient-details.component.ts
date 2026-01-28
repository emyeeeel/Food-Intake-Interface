import { Component, OnInit, Input, OnChanges, SimpleChanges, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { QrTestComponent } from '../qr-test/qr-test.component';
import { PatientService } from '../../services/patient.service';
import { RecommendedIntakeService } from '../../services/recommended-intake.service';
import { MealAssignmentService } from '../../services/meal-assignment.service';
import { LTCPatient } from '../../models/ltc-patient.model';
import { RecommendedIntake } from '../../models/recommended-intake.model';

import jsQR from 'jsqr';
import { GetAnalysisService } from '../../services/get-analysis.service';
import { MealAssignment } from '../../models/meal-assignment.mode';
import { MealsService } from '../../services/meals.service';

@Component({
  selector: 'app-patient-details',
  imports: [QrTestComponent],
  templateUrl: './patient-details.component.html',
  styleUrls: ['./patient-details.component.scss']
})
export class PatientDetailsComponent implements OnInit, OnChanges, OnDestroy {
  @Input() patientId: number = 1;
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;

  ltcPatient: LTCPatient | null = null;
  recommendedIntake: RecommendedIntake | null = null;
  mealAssignments: MealAssignment[] = [];
  recommendedAnalysis: string | null = null;
  loading: boolean = true;
  showQRCode = false;
  showScanner = false;
  scanResult: string | null = null;
  error: string | null = null;
  
  private stream: MediaStream | null = null;
  private scanInterval: any;

  query: string = '';

  private buildQuery(): string {
    if (!this.ltcPatient || !this.recommendedIntake || !this.mealAssignments.length) {
      return ''; // Return empty or default if data not ready
    }
  
    // Use meal details directly from meal assignments (no need for separate meal map)
    const mealText = this.mealAssignments
      .map((assignment, index) => {
        const intakeGrams = Math.floor(Math.random() * (700 - 150 + 1)) + 150;
        const mealName = assignment.meal_detail?.meal_name || 'Unknown Meal';
        return `Meal ${index + 1}: ${assignment.meal_type.charAt(0).toUpperCase() + assignment.meal_type.slice(1)}, ${mealName}, ${intakeGrams} g`;
      })
      .join('\n');

    // Calculate BMI if height and weight are available
    const calculateBMI = (weight: number | null, height: number | null): number | null => {
      if (!weight || !height || height <= 0) return null;
      return Number((weight / Math.pow(height / 100, 2)).toFixed(1));
    };

    const bmi = calculateBMI(this.ltcPatient.weight_kg, this.ltcPatient.height_cm);
    const patientIdentifier = `${this.ltcPatient.room_number}-${this.ltcPatient.bed_number}` || `LTC Patient ${this.patientId}`;

    return `
You are a clinical nutrition assistant writing guidance for non-medical caregivers.

TASK:
Review the patient information, recommended daily intake, and meals, then provide clear dietary guidance that compares actual intake patterns against recommended needs.

CRITICAL OUTPUT RULES:
- Output PLAIN TEXT only
- Do NOT use JSON
- Do NOT use markdown
- Do NOT use bullet symbols other than the ones shown below
- Do NOT use code blocks or backticks
- Do NOT include medical disclaimers
- Do NOT include any introductory or closing remarks

FORMAT RULES (MUST FOLLOW EXACTLY):

Summary:
(2 short sentences describing overall diet vs recommended intake)

Key Health Concerns:
- Line 1
- Line 2

Dietary Issues Observed:
- Line 1
- Line 2

Caregiver Action Steps:
1. Step one
2. Step two
3. Step three

CONTENT LIMITS:
- Keep total length under 140 words
- Use simple, supportive language
- Focus on food choices, portion size, and balance
- Reference recommended intake only when helpful for guidance

LTC PATIENT DETAILS:
Patient ID: ${patientIdentifier}
Room: ${this.ltcPatient.room_number || 'N/A'}
Bed: ${this.ltcPatient.bed_number || 'N/A'}
Age: ${this.ltcPatient.age || 'Unknown'} years
Gender: ${this.ltcPatient.sex || 'Unknown'}
Height: ${this.ltcPatient.height_cm || 'N/A'} cm
Weight: ${this.ltcPatient.weight_kg || 'N/A'} kg
BMI: ${bmi || 'N/A'}
Activity Level: ${this.ltcPatient.activity_level || 'Unknown'}

RECOMMENDED DAILY INTAKE:
Calories: ${this.recommendedIntake.daily_caloric_needs} kcal
Protein: ${this.recommendedIntake.protein} g
Carbohydrates: ${this.recommendedIntake.carbohydrate} g
Fat: ${this.recommendedIntake.fat} g
Total Fiber: ${this.recommendedIntake.total_fiber} g
Alpha Linolenic Acid: ${this.recommendedIntake.alpha_linolenic_acid} g
Linoleic Acid: ${this.recommendedIntake.linoleic_acid} g
Total Water: ${this.recommendedIntake.total_water} L

MEAL INTAKES:
${mealText}

FINAL CHECK:
Return ONLY the formatted text exactly as specified above. No extra text. 
    `;
  }
  
  constructor(
    private patientService: PatientService,
    private recommendedIntakeService: RecommendedIntakeService,
    private mealAssignmentService: MealAssignmentService,
    private mealsService: MealsService,
    private getAnalysisService: GetAnalysisService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadAllDataAndAnalyze(this.patientId);
    this.getAnalysisService.testPing('Test prompt').subscribe({
      next: (response) => {
        console.log('Test ping response:', response);
      },
      error: (error) => {
        console.error('Test ping error:', error);
      }
    });
  }

  private loadAllDataAndAnalyze(patientId: number) {
    this.loading = true;
    this.error = null;
  
    // Load LTC patient instead of regular patient
    this.patientService.getLTCPatient(patientId).subscribe({
      next: (ltcPatientData) => {
        this.ltcPatient = ltcPatientData;
        console.log('LTC Patient loaded:', ltcPatientData);
  
        // Load recommended intake for LTC patient
        this.recommendedIntakeService.getRecommendedIntake(patientId).subscribe({
          next: (recData) => {
            this.recommendedIntake = recData.nutritional_recommendations;
            console.log('Recommended intake loaded:', recData);
  
            // Load meal assignments for LTC patient
            this.mealAssignmentService.getMealAssignmentsByLTCPatient(patientId).subscribe({
              next: (assignments) => {
                this.mealAssignments = assignments;
                console.log('LTC Meal assignments loaded:', assignments);
  
                // All data loaded, now build query
                this.query = this.buildQuery();
                console.log('Query built:', this.query);
  
                // Call analysis service
                this.getAnalysisService.getAnalysis(this.query).subscribe({
                  next: (response: { recommendation: string }) => {
                    this.recommendedAnalysis = this.formatAnalysisForUI(response.recommendation);
                    console.log('Analysis completed:', this.recommendedAnalysis);
                    this.loading = false;
                  },
                  error: (err) => {
                    console.error('Analysis error:', err);
                    this.recommendedAnalysis = '載入分析失敗.'; //Failed to load analysis
                    this.loading = false;
                  }
                });
              },
              error: (err) => {
                console.error('LTC meal assignments error:', err);
                this.error = '膳食分配加載失敗.'; //Failed to load meal assignments
                this.loading = false;
              }
            });
          },
          error: (err) => {
            console.error('LTC recommended intake error:', err);
            this.error = '加載建議攝取量失敗.'; //Failed to load recommended intake
            this.loading = false;
          }
        });
      },
      error: (err) => {
        console.error('LTC patient error:', err);
        this.error = '加載LTC患者詳細資料失敗.'; //Failed to load LTC patient details
        this.loading = false;
      }
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['patientId'] && changes['patientId'].currentValue) {
      this.loadAllDataAndAnalyze(changes['patientId'].currentValue);
    }
  }

  ngOnDestroy() {
    this.stopCamera();
  }

  private formatAnalysisForUI(rawText: string): string {
    let text = rawText.replace(/[*_#`]/g, '').trim();
    text = text.replace(/\n{2,}/g, '\n\n');
    return text;
  }

  toggleQRCode(): void {
    this.showQRCode = !this.showQRCode;
  }

  toggleScanner(): void {
    if (this.showScanner) {
      this.stopCamera();
    } else {
      this.startCamera();
    }
    this.showScanner = !this.showScanner;
  }

  private async startCamera(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 300 },
          height: { ideal: 300 }
        }
      });

      if (this.videoElement) {
        this.videoElement.nativeElement.srcObject = this.stream;
        await this.videoElement.nativeElement.play();
        
        this.startQRDetection();
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      this.error = '無法存取攝影機。請檢查權限。'; //Unable to access camera. Please check permissions.
    }
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
              this.handleQRCodeDetected(qrResult);
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

  private handleQRCodeDetected(qrData: string): void {
    this.scanResult = qrData;
    console.log('QR Code detected:', qrData);
    
    this.stopCamera();
    this.showScanner = false;
    
    this.redirectToQRLink(qrData);
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
          this.router.navigate(['/patient-info', patientId]);
        } else {
          console.log('QR Code contains:', qrData);
          alert(`QR Code detected: ${qrData}`);
        }
      }
    } catch (error) {
      console.error('Error handling QR redirect:', error);
      this.error = 'Invalid QR code format';
    }
  }

  private stopCamera(): void {
    // Clear the scan interval
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    if (this.videoElement) {
      this.videoElement.nativeElement.srcObject = null;
    }
    
    this.scanResult = null;
  }

  /**
   * Get LTC patient display name/identifier
   */
  getPatientDisplayName(): string {
    if (!this.ltcPatient) return `LTC Patient ${this.patientId}`;
    return `${this.ltcPatient.room_number}-${this.ltcPatient.bed_number}` || `LTC Patient ${this.patientId}`;
  }

  /**
   * Get patient BMI if calculable
   */
  getPatientBMI(): string {
    if (!this.ltcPatient?.weight_kg || !this.ltcPatient?.height_cm || this.ltcPatient.height_cm <= 0) {
      return 'N/A';
    }
    
    const bmi = this.ltcPatient.weight_kg / Math.pow(this.ltcPatient.height_cm / 100, 2);
    return bmi.toFixed(1);
  }

  /**
   * Get patient age display
   */
  getPatientAge(): string {
    return this.ltcPatient?.age?.toString() || 'Unknown';
  }

  /**
   * Get patient activity level display
   */
  getActivityLevelDisplay(): string {
    const activityLevel = this.ltcPatient?.activity_level;
    
    switch (activityLevel) {
      case 'inactive':
        return 'Inactive';
      case 'low_active':
        return 'Low Active';
      case 'active':
        return 'Active';
      case 'very_active':
        return 'Very Active';
      default:
        return 'Unknown';
    }
  }

  /**
   * Get debug info for current state
   */
  getDebugInfo(): any {
    return {
      patientId: this.patientId,
      hasLTCPatient: !!this.ltcPatient,
      hasRecommendedIntake: !!this.recommendedIntake,
      mealAssignmentsCount: this.mealAssignments.length,
      hasAnalysis: !!this.recommendedAnalysis,
      loading: this.loading,
      error: this.error
    };
  }

  /**
   * Navigate to patient meals view
   */
  navigateToPatientMeals(): void {
    if (this.patientId) {
      this.router.navigate(['/patient-info/meals', this.patientId]);
    } else {
      console.error('Patient ID is required to navigate to meals');
      this.error = 'Unable to navigate: Patient ID not found';
    }
  }

  /**
   * Navigate to patient intakes view
   */
  navigateToPatientIntakes(): void {
    if (this.patientId) {
      this.router.navigate(['/patient-info/intakes', this.patientId]);
    } else {
      console.error('Patient ID is required to navigate to intakes');
      this.error = 'Unable to navigate: Patient ID not found';
    }
  }
}
