import { Component, OnInit, Input, OnChanges, SimpleChanges, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { QrTestComponent } from '../qr-test/qr-test.component';
import { PatientService } from '../../services/patient.service';
import { RecommendedIntakeService } from '../../services/recommended-intake.service';
import { Patient } from '../../models/patient.model';
import { RecommendedIntake } from '../../models/recommended-intake.model';
import { CommonModule } from '@angular/common';
import jsQR from 'jsqr';

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
  loading: boolean = true;
  showQRCode = false;
  showScanner = false;
  scanResult: string | null = null;
  error: string | null = null;
  
  private stream: MediaStream | null = null;
  private scanInterval: any;

  constructor(
    private patientService: PatientService,
    private recommendedIntakeService: RecommendedIntakeService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadPatient(this.patientId);
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
        
        // Start QR code detection after camera is ready
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
    
    // Stop the camera
    this.stopCamera();
    this.showScanner = false;
    
    // Parse the QR data and redirect
    this.redirectToQRLink(qrData);
  }

  private redirectToQRLink(qrData: string): void {
    try {
      // Check if it's a URL
      if (qrData.startsWith('http://') || qrData.startsWith('https://')) {
        // External URL - open in new tab
        window.open(qrData, '_blank');
      } else if (qrData.startsWith('/')) {
        // Internal route
        this.router.navigate([qrData]);
      } else {
        // Try to parse as patient ID or other data
        const patientId = parseInt(qrData);
        if (!isNaN(patientId)) {
          // Navigate to patient page
          this.router.navigate(['/patient', patientId]);
        } else {
          // Handle other QR data formats
          console.log('QR Code contains:', qrData);
          // You can add custom logic here based on your QR code format
          // For now, just show the result
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
