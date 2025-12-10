import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, OnDestroy } from '@angular/core';
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
export class AddIntakeComponent implements OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  showQRCode = false;
  showScanner = false;
  scanResult: string | null = null;
  error: string | null = null;

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

  ngOnDestroy() {
    this.stopCamera();
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

  private async handleQRCodeDetected(qrData: string): Promise<void> {
    this.scanResult = qrData; 
    console.log('QR Code detected:', qrData);
    
    // Stop the camera
    this.stopCamera();
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
    this.error = null;
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

    console.log("SCAN RESULT BEFORE UPLOAD:", this.scanResult);
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
