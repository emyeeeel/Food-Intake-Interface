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
    // const detailsUrl = `https://h3vkhzth-4200.asse.devtunnels.ms/patient-info/${this.patientId}`;
    // const intakeUrl = `https://h3vkhzth-8000.asse.devtunnels.ms/api/patients/${this.patientId}/recommended-intake/`;

    const detailsUrl = `https://mr7661km-4200.asse.devtunnels.ms/patient-info/${this.patientId}`;
    const intakeUrl = `https://mr7661km-8000.asse.devtunnels.ms/api/patients/${this.patientId}/recommended-intake/`;
    const apiUrl = this.type === 'Intake' ? intakeUrl : detailsUrl;
    // const apiUrl = 'https://mr7661km-4200.asse.devtunnels.ms/home';

    QRCode.toCanvas(this.qrCanvas.nativeElement, apiUrl, {
      width: 200,
      margin: 2
    }, (error: any) => {
      if (error) console.error('QR generation error:', error);
    });

    const ws = new WebSocket("wss://mr7661km-8000.asse.devtunnels.ms/ws/test/"); 
    //"ws://192.168.0.100:8000/ws/test/" this only works if angular endpoint is currently running on http 
    //change 192.168.0.100:8000 to <ip address>:<port> of LLM server 
    //if angular runs on https like utilizing port forwarded endpoint, use wss 
    //e.g. "wss://mr7661km-8000.asse.devtunnels.ms/ws/test/" -> this worked on both 
  
    ws.onopen = () => console.log("WS CONNECTED");
    ws.onerror = (error) => console.error("WS ERROR:", error);
    ws.onmessage = (msg) => console.log("WS MESSAGE:", msg.data);
  
    ws.onclose = () => console.log("WS CLOSED");
  }
}
