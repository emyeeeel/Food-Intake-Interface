import { Component, ElementRef, Input, ViewChild, AfterViewInit } from '@angular/core';
import QRCode from 'qrcode';

@Component({
  selector: 'app-qr-test',
  templateUrl: './qr-test.component.html',
  styleUrls: ['./qr-test.component.scss']
})
export class QrTestComponent implements AfterViewInit {
  @Input() patientId: number = 1;
  @Input() type: 'Details' | 'Intake' = 'Details'; // new input to switch QR type
  @ViewChild('qrCanvas') qrCanvas!: ElementRef<HTMLCanvasElement>;

  ngAfterViewInit() {
    const detailsUrl = `https://h3vkhzth-4200.asse.devtunnels.ms/patient-info/${this.patientId}`;
    const intakeUrl = `https://h3vkhzth-8000.asse.devtunnels.ms/api/patients/${this.patientId}/recommended-intake/`;

    const apiUrl = this.type === 'Intake' ? intakeUrl : detailsUrl;

    QRCode.toCanvas(this.qrCanvas.nativeElement, apiUrl, {
      width: 200,
      margin: 2
    }, (error: any) => {
      if (error) console.error('QR generation error:', error);
    });
  }
}
