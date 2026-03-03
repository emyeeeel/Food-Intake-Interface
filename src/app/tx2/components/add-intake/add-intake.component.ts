
import { Component, OnInit, Input, inject } from '@angular/core';
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

@Component({
  selector: 'app-add-intake',
  templateUrl: './add-intake.component.html',
  styleUrl: './add-intake.component.scss',
  imports: [CommonModule, FormsModule]
})
export class AddIntakeComponent implements OnInit {
  @Input() scannedPatientId: number | null = null;
  patient: LTCPatient | null = null;

  mealAssignments: MealAssignment[] = [];
  selectedMealAssignmentId: number | null = null;

  loadingAssignments = false;
  assignmentError: string | null = null;

  mealSelectionStep = true; 
  selectedMealType: 'Before' | 'After' | null = null;

  isProcessing = false;
  loadingMessage = '';
  uploadCompleted = false;
  redirectStarted = false;
  
  constructor(
    private router: Router,
    private auth: Auth,
    private http: HttpClient,
    private mealAssignmentService: MealAssignmentService,
    private intakeService: IntakeService,
    private dateService: DateService,
    private weightService: WeightService,
    private notificationService: NotificationService,
    private patientService: PatientService
  ) {}

  ngOnInit(): void {
    if (this.scannedPatientId !== null) {
      console.log(this.scannedPatientId)
      // Fetch patient
      this.patientService.getLTCPatient(this.scannedPatientId).subscribe({
        next: (patient) => {
          this.patient = patient;
          console.log('Loaded patient:', this.patient);
        },
        error: (err) => {
          console.error('Failed to load patient:', err);
        }
      });
      this.loadMealAssignments(this.scannedPatientId);
    }
  }

  // Meal type selection
  selectMealType(type: 'Before' | 'After'): void {
    this.selectedMealType = type;
    this.mealSelectionStep = false; // Hide selection buttons
    console.log(`Selected meal type: ${type}`);
  }

  // Go back to meal selection
  goBackToSelection(): void {
    this.mealSelectionStep = true;
    this.selectedMealType = null;
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

  // Helper method to get display text
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

    // Only return the group that matches today's cycle day
    try {
      const today = this.dateService.getTodaysCycleDay().toString();
      if (grouped[today]) {
        return { [today]: grouped[today] };
      }
      // If no assignments for today, return empty object (template will render nothing)
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
    const groups = this.getMealsByDayCycle();
    return Object.keys(groups).length > 0;
  }

  selectMealAssignment(assignment: MealAssignment): void {
    this.selectedMealAssignmentId = assignment.id;
    console.log('Selected assignment:', assignment);
  }

  resetState(): void {
    this.isProcessing = false;
    this.loadingMessage = '';
    this.uploadCompleted = false;
    this.redirectStarted = false;
    this.scannedPatientId = null;
  }

  public capture(): Promise<any> {
    this.isProcessing = true;
    return new Promise((resolve, reject) => {
      const apiUrl = 'https://p0zqhc3k-8000.jpe1.devtunnels.ms/api/capture/meal/'; // Use TX2 IP 
  
      this.http.post(apiUrl, {}, { responseType: 'blob', withCredentials: false}).subscribe({
        next: async (zipBlob) => {
          try {
            console.log('now running tx2 backend')
            if (!this.selectedMealAssignmentId) {
              throw new Error('No meal assignment selected');
            }
  
            // Find the selected meal assignment
            const assignment = this.mealAssignments.find(a => a.id === this.selectedMealAssignmentId);
            if (!assignment) {
              throw new Error('Selected meal assignment not found');
            }
  
            // Load ZIP
            const jszip = new JSZip();
            const zip = await jszip.loadAsync(zipBlob);
  
            // Extract RGB image as Blob
            const rgbFileData = await zip.file("rgb_image.png")?.async("blob");
            if (!rgbFileData) {
              throw new Error("RGB image not found in ZIP");
            }

            const weightBlob = await zip.file("weightdatas.json")?.async("blob");
            if (!weightBlob) throw new Error("weightdatas.json not found in ZIP");

            // Convert Blob to text
            const weightText = await weightBlob.text(); // now you have the JSON as string

            console.log("Raw JSON text:", weightText);

  
            const imageFile = new File([rgbFileData], `intake_${Date.now()}.png`, { type: 'image/png' });
  
            // Optional: extract inpainted depth image or CSV if needed
            // const inpaintBlob = await zip.file("inpainted_depth_image.png")?.async("blob");
            // const csvText = await zip.file("depth.csv")?.async("text");

            // Get net weight from weight service
            const netWeightResponse = await firstValueFrom(this.weightService.getNetWeight());
            const netWeight = netWeightResponse.net_weight || 0;
            console.log(netWeight)

            // Determine meal phase based on selected meal type
            const meal_phase = this.selectedMealType === 'Before' ? '前' : '後';

            // if after, kwaang record before nga weight then i minus then get percentage

            // Prepare IntakeRecord payload
            const intakePayload = {
              meal: assignment.meal,
              ltc_patient: assignment.ltc_patient || 0,
              weight_g: netWeight, // You may update this from your logic if TX2 provides weight
              volume_ml: 0, // Same for volume
              recorded_at: new Date().toISOString(),
              image: imageFile, // send actual file if your backend accepts multipart/form-data,
              meal_phase: meal_phase
            };

            console.log(intakePayload)
  
            // Post to backend using IntakeService
            const createdRecord = await this.intakeService.createIntake(intakePayload).toPromise();
            console.log('Intake record created successfully:', createdRecord);

            // this.snackBar.open('食物攝取記錄已成功創建', '', {
            //   duration: 5000,
            //   horizontalPosition: 'end', // Right side of the screen
            //   verticalPosition: 'top',   // Top of the screen
            //   panelClass: ['my-custom-snackbar'] // Custom class to apply margin
            // });

            const user = this.auth.currentUser; 
            if (!user) return;

            this.notificationService.addNotification({
              firebase_uid: user.uid,
              title: 'New Task',
              message: `${this.patient!.room_number} 房-${this.patient!.bed_number} 床，已為 ${assignment.meal_name} 餐${meal_phase}提供食物攝取記錄。`,
              read: false,
            });

            this.isProcessing = false;
  
            // Navigate to patient intakes page
            if (this.scannedPatientId) {
              // this.router.navigate(['patient-info/intakes', this.scannedPatientId]);
              this.router.navigate(['/meals']);
            }
  
            resolve(createdRecord);
  
          } catch (err) {
            console.error('Failed to create intake record:', err);
            reject(err);
          }
        },
        error: (error) => {
          console.error('API Error:', error);
          reject(error);
        }
      });
    });
  }
  
}
