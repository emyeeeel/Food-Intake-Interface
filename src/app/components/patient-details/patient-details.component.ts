import { Component, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import { QrTestComponent } from '../qr-test/qr-test.component';
import { PatientService } from '../../services/patient.service';
import { RecommendedIntakeService } from '../../services/recommended-intake.service';
import { Patient } from '../../models/patient.model';
import { RecommendedIntake } from '../../models/recommended-intake.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-patient-details',
  imports: [QrTestComponent, CommonModule],
  templateUrl: './patient-details.component.html',
  styleUrls: ['./patient-details.component.scss']
})
export class PatientDetailsComponent implements OnInit, OnChanges {
  @Input() patientId: number = 1;

  patient: Patient | null = null;
  recommendedIntake: RecommendedIntake | null = null;
  loading: boolean = true;
  error: string | null = null;

  constructor(
    private patientService: PatientService,
    private recommendedIntakeService: RecommendedIntakeService
  ) {}

  ngOnInit() {
    this.loadPatient(this.patientId);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['patientId'] && changes['patientId'].currentValue) {
      this.loadPatient(changes['patientId'].currentValue);
    }
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
}
