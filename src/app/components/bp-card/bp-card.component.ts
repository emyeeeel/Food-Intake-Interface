import { Component, Input, SimpleChanges } from '@angular/core';
import { SeeHistoryButtonComponent } from "../see-history-button/see-history-button.component";
import { Patient } from '../../models/patient.model';
import { PatientService } from '../../services/patient.service';

@Component({
  selector: 'app-bp-card',
  imports: [SeeHistoryButtonComponent],
  templateUrl: './bp-card.component.html',
  styleUrl: './bp-card.component.scss'
})
export class BpCardComponent {
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

  getHeartRate(): string {
    return this.patient?.heart_rate?.toString() || '--';
  }

  getBP(): string {
    if (this.patient?.systolic_bp && this.patient?.diastolic_bp) {
      return `${this.patient.systolic_bp}/${this.patient.diastolic_bp}`;
    }
    return '--/--';
  }
}
