import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { SeeHistoryButtonComponent } from "../see-history-button/see-history-button.component";
import { Patient } from '../../models/patient.model';
import { PatientService } from '../../services/patient.service';

@Component({
  selector: 'app-bmi-card',
  imports: [SeeHistoryButtonComponent],
  templateUrl: './bmi-card.component.html',
  styleUrls: ['./bmi-card.component.scss']
})
export class BmiCardComponent implements OnInit, OnChanges {
  @Input() patientId: number = 1; // Accept patientId from parent component

  patient: Patient | null = null;
  loading: boolean = true;
  error: string | null = null;

  constructor(private patientService: PatientService) {}

  ngOnInit(): void {
    if (this.patientId) {
      this.fetchPatientData();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['patientId'] && !changes['patientId'].isFirstChange()) {
      // Call fetchPatientData whenever patientId changes (not on first init)
      this.fetchPatientData();
    }
  }

  fetchPatientData(): void {
    this.loading = true;  // Start loading whenever data is being fetched
    this.patientService.getPatient(this.patientId).subscribe(
      (patientData: Patient) => {
        this.patient = patientData;
        this.loading = false;  // Stop loading once data is fetched
      },
      (err) => {
        this.error = 'Failed to load patient data!';
        this.loading = false;
        console.error('Error fetching patient data:', err);
      }
    );
  }

  getHeight(): string {
    return this.patient?.height_cm?.toString() || '--';
  }

  getWeight(): string {
    return this.patient?.weight_kg?.toString() || '--';
  }
}
