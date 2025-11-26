import { Component, ElementRef, ViewChild } from '@angular/core';
import QRCode from 'qrcode';

@Component({
  selector: 'app-qr-test',
  imports: [],
  templateUrl: './qr-test.component.html',
  styleUrl: './qr-test.component.scss'
})
export class QrTestComponent {
  @ViewChild('qrCanvas') qrCanvas!: ElementRef<HTMLCanvasElement>;

  ngAfterViewInit() {
    const patientId = 1;
    // const apiUrl = `http://127.0.0.1:8000/api/patients/${patientId}/`;
    const apiUrl = `https://mr7661km-8000.asse.devtunnels.ms/api/patients/${patientId}/`;

    QRCode.toCanvas(this.qrCanvas.nativeElement, apiUrl, {
      width: 200,
      margin: 2
    }, (error: any) => {
      if (error) console.error('QR generation error:', error);
    });
  }
}
