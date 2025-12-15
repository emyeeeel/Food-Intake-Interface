import { Component, OnInit, Input, OnChanges, SimpleChanges, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { QrTestComponent } from '../qr-test/qr-test.component';
import { PatientService } from '../../services/patient.service';
import { RecommendedIntakeService } from '../../services/recommended-intake.service';
import { MealAssignmentService } from '../../services/meal-assignment.service';
import { Patient } from '../../models/patient.model';
import { RecommendedIntake } from '../../models/recommended-intake.model';
import { CommonModule } from '@angular/common';
import jsQR from 'jsqr';
import { GetAnalysisService } from '../../services/get-analysis.service';
import { MealAssignment } from '../../models/meal-assignment.mode';
import { Meal } from '../../models/meal.model';
import { MealsService } from '../../services/meals.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-patient-details',
  imports: [QrTestComponent, CommonModule],
  templateUrl: './patient-details.component.html',
  styleUrls: ['./patient-details.component.scss']
})
export class PatientDetailsComponent implements OnInit, OnChanges, OnDestroy {
  @Input() patientId: number = 1;
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;

  patient: Patient | null = null;
  recommendedIntake: RecommendedIntake | null = null;
  mealAssignments: MealAssignment[] = [];
  private mealMap: Map<number, Meal> = new Map();
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
    if (!this.patient || !this.recommendedIntake || !this.mealAssignments.length) {
      return ''; // Return empty or default if data not ready
    }
  
    // Generate random intake (grams) for each meal (e.g., 150g - 700g)
    const mealText = this.mealAssignments
    .map((meal, index) => {
      const intakeGrams = Math.floor(Math.random() * (700 - 150 + 1)) + 150;
      const mealName = this.mealMap.get(meal.meal)?.meal_name || 'Unknown Meal'; // <-- get name
      return `Meal ${index + 1}: ${meal.meal_type.charAt(0).toUpperCase() + meal.meal_type.slice(1)}, ${mealName}, ${intakeGrams} g`;
    })
    .join('\n');

  
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
  
  PATIENT DETAILS:
  Patient Name: ${this.patient.name}
  Age: ${this.patient.age}
  Gender: ${this.patient.sex}
  Height: ${this.patient.height_cm} cm
  Weight: ${this.patient.weight_kg} kg
  BMI: ${this.patient.bmi}
  Heart Rate: ${this.patient.heart_rate} bpm
  Blood Pressure: ${this.patient.systolic_bp}/${this.patient.diastolic_bp} mmHg
  Activity Level: ${this.patient.activity_level}
  
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
  }

  

  private loadAllDataAndAnalyze(patientId: number) {
    this.loading = true;
    this.error = null;
  
    // Load patient
    this.patientService.getPatient(patientId).subscribe({
      next: (patientData) => {
        this.patient = patientData;
  
        // Load recommended intake
        this.recommendedIntakeService.getRecommendedIntake(patientId).subscribe({
          next: (recData) => {
            this.recommendedIntake = recData.nutritional_recommendations;
  
            // Load meal assignments
            this.mealAssignmentService.getAssignmentsByPatient(patientId).subscribe({
              next: (assignments) => {
                this.mealAssignments = assignments;
  
                // All data loaded, now build query
                this.query = this.buildQuery();

                console.log(this.query)
  
                // Call analysis service
                this.getAnalysisService.getAnalysis(this.query).subscribe({
                  next: (response: { recommendation: string }) => {
                    this.recommendedAnalysis = this.formatAnalysisForUI(response.recommendation)
                    console.log(this.recommendedAnalysis)
                    this.loading = false;
                  },
                  error: (err) => {
                    console.error(err);
                    this.recommendedAnalysis = 'Failed to load analysis.';
                    this.loading = false;
                  }
                });
              },
              error: (err) => {
                console.error(err);
                this.error = 'Failed to load meal assignments';
                this.loading = false;
              }
            });
          },
          error: (err) => {
            console.error(err);
            this.error = 'Failed to load recommended intake';
            this.loading = false;
          }
        });
      },
      error: (err) => {
        console.error(err);
        this.error = 'Failed to load patient details';
        this.loading = false;
      }
    });
  }
  

  ngOnChanges(changes: SimpleChanges) {
    if (changes['patientId'] && changes['patientId'].currentValue) {
      this.loadPatient(changes['patientId'].currentValue);
    }
  }

  ngOnDestroy() {
    this.stopCamera();
  }

  private loadPatient(patientId: number) {
    this.loading = true;
    this.error = null;

    this.patientService.getPatient(patientId).subscribe({
      next: (data) => {
        this.patient = data;
        this.loading = false;
        console.log('Patient:', this.patient);
        this.loadRecommendedIntake(patientId);
        this.loadMealAssignments(patientId);
      },
      error: (err) => {
        this.error = 'Failed to load patient details';
        this.loading = false;
        console.error('Error loading patient:', err);
      }
    });
  }

  private loadRecommendedIntake(patientId: number) {
    this.recommendedIntakeService.getRecommendedIntake(patientId).subscribe({
      next: (data) => {
        this.recommendedIntake = data.nutritional_recommendations;
        console.log('Recommended Intake:', this.recommendedIntake);
      },
      error: (err) => {
        console.error('Error loading recommended intake:', err);
      }
    });
  }

  private loadMealAssignments(patientId: number) {
    this.mealAssignmentService.getAssignmentsByPatient(patientId).subscribe({
      next: (assignments) => {
        this.mealAssignments = assignments;
  
        // Prepare observables for all meals
        const mealRequests = this.mealAssignments.map(a =>
          this.mealsService.getMeal(a.meal)
        );
  
        forkJoin(mealRequests).subscribe({
          next: (meals) => {
            meals.forEach(meal => this.mealMap.set(meal.id, meal));
            console.log(meals) //this returns 
          },
          error: (err) => console.error('Failed to load meals', err)
        });
      },
      error: (err) => console.error('Error loading meal assignments:', err)
    });
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
      this.error = 'Unable to access camera. Please check permissions.';
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
          this.router.navigate(['/patient', patientId]);
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
}
