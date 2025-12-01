import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import QRCode from 'qrcode';

@Component({
  selector: 'app-qr-test',
  imports: [],
  templateUrl: './qr-test.component.html',
  styleUrl: './qr-test.component.scss'
})
export class QrTestComponent {
  @Input() patientId: number = 1;
  @ViewChild('qrCanvas') qrCanvas!: ElementRef<HTMLCanvasElement>;
  

  ngAfterViewInit() {
    const apiUrl = `https://mr7661km-4200.asse.devtunnels.ms/home`;
    // const apiUrl = `http://127.0.0.1:8000/api/patients/${this.patientId}/recommended-intake`;
    // const apiUrl = `https://h3vkhzth-8000.asse.devtunnels.ms//api/patients/${this.patientId}/`;
    // const apiUrl = `https://h3vkhzth-4200.asse.devtunnels.ms//login`;
    

    QRCode.toCanvas(this.qrCanvas.nativeElement, apiUrl, {
      width: 200,
      margin: 2
    }, (error: any) => {
      if (error) console.error('QR generation error:', error);
    });
  }
}
