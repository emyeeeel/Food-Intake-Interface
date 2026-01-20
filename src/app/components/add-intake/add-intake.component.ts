import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import jsQR from 'jsqr';
import { QrTestComponent } from "../qr-test/qr-test.component";

@Component({
  selector: 'app-add-intake',
  imports: [CommonModule, QrTestComponent],
  templateUrl: './add-intake.component.html',
  styleUrl: './add-intake.component.scss'
})
export class AddIntakeComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;

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
    private http: HttpClient
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
    console.log(`QR Code scanned for ${this.selectedMealType} meal:`, result);
    
    // Process the scanned result based on meal type
    this.processIntakeRecord(result, this.selectedMealType!);
  }

  processIntakeRecord(qrData: string, mealType: 'Before' | 'After'): void {
    // Implement your intake record processing logic here
    console.log(`Processing ${mealType} meal intake:`, qrData);
    
    // Example: Parse QR data and create intake record
    // You might want to navigate to another component or show a form
    this.handleQRCodeDetected(qrData);
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

  private async handleQRCodeDetected(qrData: string): Promise<void> {
    this.scanResult = qrData; 
    console.log('QR Code detected:', qrData);
    
    // Stop the camera
    this.stopScanner();
    this.showScanner = false;

    // Start loading state
    this.isProcessing = true;
    this.loadingMessage = 'QR Code detected, processing...';
    this.uploadCompleted = false;
    this.redirectStarted = false;

    try {
      // Wait for test upload to complete before proceeding
      this.loadingMessage = 'Uploading data to server...';
      console.log('Uploading data before redirect...');
      
      await this.capture();
      
      this.uploadCompleted = true;
      this.loadingMessage = 'Upload successful, preparing to redirect...';
      console.log('Upload completed, now redirecting...');
      
      // Small delay to show the completed state
      setTimeout(() => {
        this.redirectStarted = true;
        this.loadingMessage = 'Redirecting to patient information...';
        
        // After successful upload, redirect to the hardcoded URL
        const redirectUrl = `/meal-intake/all`; 
        this.router.navigate([redirectUrl]);
      }, 1000);
      
    } catch (error) {
      console.error('Upload failed, but still redirecting:', error);
      this.loadingMessage = 'Upload failed, but continuing to redirect...';
      
      setTimeout(() => {
        this.redirectStarted = true;
        this.loadingMessage = 'Redirecting to patient information...';
        
        const redirectUrl = `/meal-intake/all`;
        this.router.navigate([redirectUrl]);
      }, 1000);
    }
  }

  resetState(): void {
    this.isProcessing = false;
    this.loadingMessage = '';
    this.uploadCompleted = false;
    this.redirectStarted = false;
    this.scanResult = null;
    this.showScanner = false;
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

  private capture(): Promise<any> {
    return new Promise((resolve, reject) => {
      const apiUrl = 'http://127.0.0.1:8000/api/capture/';  //let this receive qr url link
      
      const testData = {
        message: 'QR Code scanned - uploading intake data',
        timestamp: new Date().toISOString(),
        segment_url: this.scanResult, 
        data: {
          test: true,
          value: 123,
          source: 'qr_scanner'
        }
      };

      console.log('Sending test data to API:', testData);

      this.http.post(apiUrl, testData).subscribe({
        next: (response) => {
          console.log('API Response:', response);
          console.log('Test upload successful!');
          resolve(response);
        },
        error: (error) => {
          console.error('API Error:', error);
          console.log('Test upload failed:', error.message);
          reject(error);
        },
        complete: () => {
          console.log('Test upload request completed');
        }
      });
    });
  }
}
