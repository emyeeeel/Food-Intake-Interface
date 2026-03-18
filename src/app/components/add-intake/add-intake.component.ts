
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

@Component({
  selector: 'app-add-intake',
  templateUrl: './add-intake.component.html',
  styleUrl: './add-intake.component.scss',
  imports: [CommonModule, FormsModule]
})
export class AddIntakeComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;

  scannedPatientId: number | null = null;

  mealAssignments: MealAssignment[] = [];
  selectedMealAssignmentId: number | 0 = 0;

  loadingAssignments = false;
  assignmentError: string | null = null;

  checking = true;

  intakes: IntakeRecord[] = [];

  // Scanner state
  showScanner = false;
  scanResult: string | null = null;
  
  // Meal selection state
  mealSelectionStep = false; // Show selection first
  selectedMealType: 'Before' | 'After' | null = null;

  private stream: MediaStream | null = null;
  private scanInterval: any;

  //Meal Period Decider
  mealTimePeriod: '午餐' | '晚餐' | 0 = 0;

  patient: LTCPatient | null = null;
  dayCycle: number | null = null;

  isProcessing = false;
  loadingMessage = '';
  uploadCompleted = false;
  redirectStarted = false;

  constructor(
    private router: Router,
    private http: HttpClient,
    private mealAssignmentService: MealAssignmentService,
    private patientService: PatientService,
    private intakeService: IntakeService,
    private dateService: DateService,
    private weightService: WeightService,
    private notificationService: NotificationService,
    private auth: Auth,
  ) {}

  mealPhaseStatus: '前' | '後' | 'done' | null = null;

  currentSelectedDate: Date = new Date();
  
  ngOnInit(): void {
    // Initialize component
    this.mealPeriod();
    this.dayCycle = this.getCurrentDayInCycle();
  }

  loadPatientData(): void {
    if (this.scannedPatientId !== null){
      this.intakeService
      .getIntakesByMealPeriod(this.scannedPatientId!, this.mealTimePeriod as '午餐' | '晚餐')
      .subscribe(intakes => {
        this.intakes = intakes;
        console.log('Number of food intakes:', intakes.length);
        console.log('First Intake Record Meal Details: ', intakes[0]?.meal_detail?.meal_time, this.mealTimePeriod)
      });
    }
  }

mealPeriod(): void {
  this.mealTimePeriod = this.dateService.getCurrentMealPeriod();
  console.log('Loaded mealTime:', this.mealTimePeriod); 
}

  getCurrentDayInCycle(): number {
    return this.dateService.calculateDayCycleForDate(this.currentSelectedDate);
  }

  ngOnDestroy(): void {
    this.stopScanner();
  }

  // // Meal type selection
  // selectMealType(type: 'Before' | 'After'): void {
  //   this.selectedMealType = type;
  //   this.mealSelectionStep = false; // Hide selection buttons
  //   console.log(`Selected meal type: ${type}`);
  // }

  // Go back to meal selection
  goBackToSelection(): void {
    this.mealSelectionStep = true;
    this.selectedMealType = null;
    this.stopScanner(); // Stop scanner if running
  }

  // Scanner methods
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
        facingMode: 'environment', // Use back camera if available
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    })
    .then(stream => {
      if (this.videoElement?.nativeElement) {
        this.videoElement.nativeElement.srcObject = stream;
        this.videoElement.nativeElement.play();
        console.log('Camera started successfully');
        // Here you would typically initialize your QR scanner library
        // For example, using jsQR or QuaggaJS
        this.startQRDetection();
      }
    })
    .catch(err => {
      console.error('Error accessing camera:', err);
      this.showScanner = false;
      // Handle camera permission denied or not available
    });
  }

  stopScanner(): void {
    this.showScanner = false;
    
    if (this.videoElement?.nativeElement?.srcObject) {
      const stream = this.videoElement.nativeElement.srcObject as MediaStream;
      const tracks = stream.getTracks();
      
      tracks.forEach(track => {
        track.stop();
      });
      
      this.videoElement.nativeElement.srcObject = null;
      console.log('Camera stopped');
    }

    console.log("SCAN RESULT BEFORE UPLOAD:", this.scanResult);

    if (this.scannedPatientId !== null) {
      this.loadPatientData();
      this.loadFilteredMeals();
      console.log('Meal Assignments', this.mealAssignments)
      this.patientService.getLTCPatient(this.scannedPatientId).subscribe({
        next: (patient) => {
          this.patient = patient;
          console.log('Loaded patient:', this.patient);
        },
        error: (err) => {
          console.error('Failed to load patient:', err);
        }
      });

      this.intakeService
      .getMealPhasesForDate(this.scannedPatientId, this.mealTimePeriod as '午餐' | '晚餐')
      .subscribe(phase => {
        // phase might be '前', '後', 'done', or null
        this.mealPhaseStatus = phase;
        console.log('Meal Phase Status', this.mealPhaseStatus)
      });
    }

  }

  setMealType(type: 'Before' | 'After') {
    this.selectedMealType = type;
  }

  // loadFilteredMeals(): void {
  //   if (!this.scannedPatientId || !this.dayCycle) return;

  //   const filters: any = {};

  //   if (this.scannedPatientId) {
  //     filters.ltc_patient = this.scannedPatientId;
  //   }

  //   if (this.dayCycle) {
  //     filters.day_cycle = this.dayCycle;
  //   }

  //   if (this.mealTimePeriod) {
  //     filters.meal_type = this.mealTimePeriod;  
  //     console.log('Time Period', this.mealTimePeriod)
  //   }

  //   console.log('Filters', filters)
  //   console.log("Patient:", this.scannedPatientId);
  //   console.log("Day cycle:", this.dayCycle);
  //   console.log("Meal period:", this.mealTimePeriod);

  //   this.intakeService
  //   .getAssignmentsByMealPeriod(
  //     this.scannedPatientId,
  //     this.mealTimePeriod,
  //     this.dayCycle
  //   )
  //   .subscribe(assignments => {
  //     this.mealAssignments = assignments;
  //     console.log('Filtered assignments:', assignments);

  //     if (assignments.length > 0) {
        
  //       this.selectedMealAssignmentId = assignments[0].id;
  //       console.log(
  //         'Meal Assignment ID:',
  //         this.selectedMealAssignmentId,
  //         assignments[0].meal_detail?.meal_name
  //       );

  //       console.log(this.intakes)
  //     } else {
  //       console.warn('No meal assignments found for this patient and meal period');
  //       this.selectedMealAssignmentId = 0;
  //     }
  //   });

  //   // this.mealAssignmentService
  //   //   .getMealAssignmentsWithFilters(filters)
  //   //   .subscribe({
  //   //     next: (data) => {
  //   //       this.mealAssignments = data;
  //   //     },
  //   //     error: (err) => {
  //   //       console.error('Error loading filtered meals', err);
  //   //     }
  //   //   });
  // }

  loadFilteredMeals(): void {
  if (!this.scannedPatientId || !this.dayCycle) return;

  // Determine the meal assignments source
  const fetchAssignments$ =
    this.mealTimePeriod === 0
      ? this.mealAssignmentService.getMealAssignmentsByLTCPatient(this.scannedPatientId)
      : this.intakeService.getAssignmentsByMealPeriod(
          this.scannedPatientId,
          this.mealTimePeriod,
          this.dayCycle
        );

  fetchAssignments$.subscribe(assignments => {
    // Filter by day cycle
    let filteredAssignments = assignments.filter(a => a.meal_detail?.day_cycle === this.dayCycle);

    // If mealTimePeriod is lunch/dinner, filter by that too
    if (this.mealTimePeriod !== 0) {
      filteredAssignments = filteredAssignments.filter(a => a.meal_type === this.mealTimePeriod);
    }

    this.mealAssignments = filteredAssignments;

    console.log('Filtered assignments for today & meal period:', filteredAssignments);

    if (filteredAssignments.length > 0) {
      this.selectedMealAssignmentId = filteredAssignments[0].id;
      console.log('Auto-selected assignment ID:', this.selectedMealAssignmentId);
    } else {
      console.warn('No meal assignments found for this patient and meal period');
      this.selectedMealAssignmentId = 0;
    }
  });
}

  // Handle QR scan result
  onQRScanned(result: string): void {
    this.scanResult = result;
  
    const patientId = parseInt(result, 10);
    if (isNaN(patientId)) {
      console.warn('QR does not contain a patient ID');
      return;
    }
  
    this.scannedPatientId = patientId;
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

  // Helper method to get display text
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

  // selectMealAssignment(assignment: MealAssignment): void {
  //   this.selectedMealAssignmentId = assignment.id;
  //   console.log('Selected assignment:', assignment);
  // }

  

  resetState(): void {
    this.isProcessing = false;
    this.loadingMessage = '';
    this.uploadCompleted = false;
    this.redirectStarted = false;
    this.scanResult = null;
    this.showScanner = false;
    this.scannedPatientId = null;
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
        const apiUrl = 'http://192.168.0.174:8000/api/capture/meal/'; // Use TX2 IP 
    
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
              
              const csvBlob = await zip.file("depth.csv")?.async("blob");
              if (!csvBlob) {
                throw new Error("depth.csv not found in ZIP");
              }

              const csvFile = new File(
                [csvBlob],
                `depth_${Date.now()}.csv`,
                { type: "text/csv" }
              );

              console.log(csvFile);
              console.log(csvFile.name);
              console.log(csvFile.type);
  
              // Get net weight from json zip
              let netWeight = 0;

              try {
                const weightData = JSON.parse(weightText);
                netWeight = weightData?.net_weight ?? 0;
              } catch (error) {
                console.error('Failed to parse weight JSON:', error);
              }
  
              // Determine meal phase based on selected meal type
              const meal_phase = this.selectedMealType === 'Before' ? '前' : '後';

              console.log(meal_phase)
  
              // if after, kwaang record before nga weight then i minus then get percentage
  
              // Prepare IntakeRecord payload
              // const intakePayload = {
              //   meal: assignment.meal,
              //   ltc_patient: assignment.ltc_patient || 0,
              //   weight_g: netWeight, // You may update this from your logic if TX2 provides weight
              //   volume_ml: 0, // Same for volume
              //   recorded_at: new Date().toISOString(),
              //   image: imageFile, // send actual file if your backend accepts multipart/form-data,
              //   depth_csv: csvFile,
              //   meal_phase: meal_phase,
              // };
  
              // console.log(intakePayload)

              const formData = new FormData();

              formData.append('meal', assignment.meal.toString());
              formData.append('ltc_patient', (assignment.ltc_patient || 0).toString());
              formData.append('weight_g', netWeight.toString());
              if(meal_phase == '前'){
                formData.append('volume_ml', '100');
              }else{
                const beforeRecord = this.intakes.find(r => r.meal_phase === '前');

                if (beforeRecord && beforeRecord.weight_g > 0) {
                  const beforeWeight = beforeRecord.weight_g;
                  const afterWeight = netWeight; 

                  const consumed = ((beforeWeight - afterWeight) / beforeWeight) * 100;
                  const consumedClamped = Math.max(0, Math.min(100, consumed)); 
                  
                  formData.append('volume_ml', consumedClamped.toFixed(2).toString());
                }
              }
              formData.append('recorded_at', new Date().toISOString());
              formData.append('meal_phase', meal_phase);

              formData.append('image', imageFile);
              formData.append('depth_csv', csvFile);
              const user = this.auth.currentUser;
              if (!user) return;
              const email = user?.email;
              const username = email ? email.split('@')[0] : 'Unknown';
              console.log(username)
              formData.append('recorded_by', username);

              // Post to backend using IntakeService
              const createdRecord = await this.intakeService.createIntake(formData).toPromise();
              console.log('Intake record created successfully:', createdRecord);
  
              // this.snackBar.open('食物攝取記錄已成功創建', '', {
              //   duration: 5000,
              //   horizontalPosition: 'end', // Right side of the screen
              //   verticalPosition: 'top',   // Top of the screen
              //   panelClass: ['my-custom-snackbar'] // Custom class to apply margin
              // });
  
              this.notificationService.addNotification({
                firebase_uid: user.uid,
                title: 'New Task',
                message: `${this.patient!.room_number} 房-${this.patient!.bed_number} 床，已為 ${assignment.meal_name} 餐${meal_phase}提供食物攝取記錄。`,
                read: false,
              });
  
              this.isProcessing = false;
    
              // Navigate to patient intakes page
              if (this.scannedPatientId) {
                this.router.navigate(['patient-info', this.scannedPatientId, 'intakes']);
                // this.router.navigate(['/meals']);
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
