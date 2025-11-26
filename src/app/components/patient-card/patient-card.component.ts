import { Component, OnInit, Input, EventEmitter, Output } from '@angular/core';
import { PatientService } from '../../services/patient.service';
import { RecommendedIntakeService } from '../../services/recommended-intake.service';
import { Patient } from '../../models/patient.model';
import { RecommendedIntake } from '../../models/recommended-intake.model';
import { CommonModule } from '@angular/common';
import { Meal } from '../../models/meal.model';

@Component({
  selector: 'app-patient-card',
  imports: [CommonModule],
  templateUrl: './patient-card.component.html',
  styleUrls: ['./patient-card.component.scss']
})
export class PatientCardComponent implements OnInit {
  @Input() patientId: number = 1; 
  @Output() patientIdChange = new EventEmitter<number>();  

  patient: Patient | null = null;
  assignedLunch: Meal | null = null;
  recommendedIntake: RecommendedIntake | null = null;
  loading: boolean = true;
  error: string | null = null;
  intakeUnit: string | null = null;

  totalPatients: number = 0;

  constructor(
    private patientService: PatientService,
    private recommendedIntakeService: RecommendedIntakeService,
  ) {}

  ngOnInit(): void {
    this.loadPatientCount(); 
    if (this.patientId) {
      this.fetchPatientData();
    }
  }

  private loadPatientCount(): void {
    this.patientService.getPatientCount().subscribe({
      next: count => this.totalPatients = count,
      error: err => console.error('Error fetching patient count:', err)
    });
  }

  // Check if Previous button should be disabled
  isPrevDisabled(): boolean {
    return this.patientId <= 1;
  }

  // Check if Next button should be disabled
  isNextDisabled(): boolean {
    return this.patientId >= this.totalPatients;
  }

  fetchPatientData(): void {
    this.patientService.getPatient(this.patientId).subscribe(
      (patientData: Patient) => {
        this.patient = patientData;
        this.fetchRecommendedIntake(patientData.id);
      },
      (err) => {
        this.error = 'Failed to load patient data!';
        this.loading = false;
        console.error('Error fetching patient data:', err);
      }
    );
  }

  fetchRecommendedIntake(patientId: number): void {
    this.recommendedIntakeService.getRecommendedIntake(patientId).subscribe(
      (response: any) => {
        this.recommendedIntake = response.nutritional_recommendations;
        this.intakeUnit = response.units.protein;
        this.loading = false;
        console.log('Recommended Intake: ', response)
      },
      (err) => {
        this.error = 'Error fetching recommended intake data!';
        this.loading = false;
        console.error('Error fetching recommended intake:', err);
      }
    );
  }

  // Helper methods to display patient and recommended intake data
  getDisplayName(): string {
    return this.patient?.name || 'No Patient Selected';
  }

  getDisplayAge(): number | string {
    return this.patient?.age || '--';
  }

  getRecommendedIntakeDisplay(): string {
    return this.recommendedIntake?.protein ? `${this.recommendedIntake.protein}` : '--';
  }

  // Events for navigation and options
  @Output() previousClicked = new EventEmitter<void>();
  @Output() nextClicked = new EventEmitter<void>();
  @Output() optionsClicked = new EventEmitter<void>();

  // Navigate to the previous patient
  onPreviousPatient(): void {
    if (this.patientId > 1) {
      this.patientId--;  
      this.patientIdChange.emit(this.patientId);  
      this.fetchPatientData(); 
    }
  }

  // Navigate to the next patient
  onNextPatient(): void {
    this.patientId++;  
    this.patientIdChange.emit(this.patientId); 
    this.fetchPatientData(); 
  }

  onOptionsClick(): void {
    this.optionsClicked.emit();
  }
}
