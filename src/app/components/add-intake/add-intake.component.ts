
import { Component, ElementRef, ViewChild, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import jsQR from 'jsqr';
import { MealAssignment } from '../../models/meal-assignment.mode';
import { MealAssignmentService } from '../../services/meal-assignment.service';
import { PatientService } from '../../services/patient.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IntakeRecord } from '../../models/food-intake.model';
import { IntakeService } from '../../services/intake.service';
import JSZip from 'jszip';

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
  selectedMealAssignmentId: number | null = null;

  loadingAssignments = false;
  assignmentError: string | null = null;

  // Scanner state
  showScanner = false;
  scanResult: string | null = null;
  
  // Meal selection state
  mealSelectionStep = true; // Show selection first
  selectedMealType: 'Before' | 'After' | null = null;

  private stream: MediaStream | null = null;
  private scanInterval: any;

  isProcessing = false;
  loadingMessage = '';
  uploadCompleted = false;
  redirectStarted = false;

  constructor(
    private router: Router,
    private http: HttpClient,
    private mealAssignmentService: MealAssignmentService,
    private patientService: PatientService,
    private intakeService: IntakeService
  ) {}

  ngOnInit(): void {
    // Initialize component
  }

  ngOnDestroy(): void {
    this.stopScanner();
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
    return grouped;
  }
  
  dayCycleSort = (
    a: { key: string; value: MealAssignment[] },
    b: { key: string; value: MealAssignment[] }
  ): number => Number(a.key) - Number(b.key);
  
  getMealsByType(assignments: MealAssignment[], type: string): MealAssignment[] {
    return assignments.filter(a => a.meal_type === type);
  }

  selectMealAssignment(assignment: MealAssignment): void {
    this.selectedMealAssignmentId = assignment.id;
    console.log('Selected assignment:', assignment);
  }

  // private async handleQRCodeDetected(qrData: string): Promise<void> {
  //   this.scanResult = qrData; 
  //   console.log('QR Code detected:', qrData);
    
  //   // Stop the camera
  //   this.stopScanner();
  //   this.showScanner = false;

  //   // Start loading state
  //   this.isProcessing = true;
  //   this.loadingMessage = 'QR Code detected, processing...';
  //   this.uploadCompleted = false;
  //   this.redirectStarted = false;

  //   try {
  //     // Wait for test upload to complete before proceeding
  //     this.loadingMessage = 'Uploading data to server...';
  //     console.log('Uploading data before redirect...');
      
  //     await this.capture();
      
  //     this.uploadCompleted = true;
  //     this.loadingMessage = 'Upload successful, preparing to redirect...';
  //     console.log('Upload completed, now redirecting...');
      
  //     // Small delay to show the completed state
  //     setTimeout(() => {
  //       this.redirectStarted = true;
  //       this.loadingMessage = 'Redirecting to patient information...';
        
  //       // After successful upload, redirect to the hardcoded URL
  //       const redirectUrl = `/meal-intake/all`; 
  //       this.router.navigate([redirectUrl]);
  //     }, 1000);
      
  //   } catch (error) {
  //     console.error('Upload failed, but still redirecting:', error);
  //     this.loadingMessage = 'Upload failed, but continuing to redirect...';
      
  //     setTimeout(() => {
  //       this.redirectStarted = true;
  //       this.loadingMessage = 'Redirecting to patient information...';
        
  //       const redirectUrl = `/meal-intake/all`;
  //       this.router.navigate([redirectUrl]);
  //     }, 1000);
  //   }
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
    return new Promise((resolve, reject) => {
      const apiUrl = 'http://127.0.0.1:8000/api/capture/meal/'; // Use TX2 IP
  
      this.http.post(apiUrl, {}, { responseType: 'blob', withCredentials: false}).subscribe({
        next: async (zipBlob) => {
          try {
            if (!this.selectedMealAssignmentId) {
              throw new Error('No meal assignment selected');
            }
  
            // Find selected assignment
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
  
            const imageFile = new File([rgbFileData], `intake_${Date.now()}.png`, { type: 'image/png' });
  
            // Optional: extract inpainted depth image or CSV if needed
            // const inpaintBlob = await zip.file("inpainted_depth_image.png")?.async("blob");
            // const csvText = await zip.file("depth.csv")?.async("text");
  
            // Prepare IntakeRecord payload
            const intakePayload = {
              meal: assignment.meal,
              ltc_patient: assignment.ltc_patient || 0,
              weight_g: 0, // You may update this from your logic if TX2 provides weight
              volume_ml: 0, // Same for volume
              recorded_at: new Date().toISOString(),
              image: imageFile // send actual file if your backend accepts multipart/form-data
            };
  
            // Post to backend using IntakeService
            const createdRecord = await this.intakeService.createIntake(intakePayload).toPromise();
            console.log('Intake record created successfully:', createdRecord);
  
            // Navigate to patient intakes page
            if (this.scannedPatientId) {
              this.router.navigate(['/patient-info/intakes', this.scannedPatientId]);
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
