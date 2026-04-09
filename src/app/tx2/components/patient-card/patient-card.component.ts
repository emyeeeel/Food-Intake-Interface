import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-patient-card',
  imports: [],
  templateUrl: './patient-card.component.html',
  styleUrl: './patient-card.component.scss',
})
export class PatientCardComponent {
  @Input() roomBed: string = '--';
}
