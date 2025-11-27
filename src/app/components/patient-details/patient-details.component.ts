import { Component, OnInit } from '@angular/core';
import { QrTestComponent } from '../qr-test/qr-test.component';
import { PatientService } from '../../services/patient.service';
import { Patient } from '../../models/patient.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-patient-details',
  imports: [QrTestComponent, CommonModule],
  templateUrl: './patient-details.component.html',
  styleUrl: './patient-details.component.scss'
})
export class PatientDetailsComponent implements OnInit {
  patient: Patient | null = null;
  loading: boolean = true;
  error: string | null = null;

  constructor(private patientService: PatientService) {}

  ngOnInit() {
    this.loadPatientDetails(1);
  }

  loadPatientDetails(patientId: number) {
    this.loading = true;
    this.error = null;
    this.patientService.getPatient(patientId).subscribe({
      next: (data) => {
        this.patient = data;
        this.loading = false;
        console.log(this.patient);
      },
      error: (err) => {
        this.error = 'Failed to load patient details';
        this.loading = false;
        console.error('Error loading patient:', err);
      }
    });
  }
}
