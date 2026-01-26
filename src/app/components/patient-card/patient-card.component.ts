import { Component, OnInit, Input, EventEmitter, Output, ElementRef, HostListener } from '@angular/core';
import { PatientService } from '../../services/patient.service';
import { RecommendedIntakeService } from '../../services/recommended-intake.service';
import { LTCPatient } from '../../models/ltc-patient.model';
import { RecommendedIntake } from '../../models/recommended-intake.model';

import { Meal } from '../../models/meal.model';
import { Router } from '@angular/router';

@Component({
  selector: 'app-patient-card',
  imports: [],
  templateUrl: './patient-card.component.html',
  styleUrls: ['./patient-card.component.scss']
})
export class PatientCardComponent implements OnInit {
  @Input() patientId: number = 1; 
  @Output() patientIdChange = new EventEmitter<number>();  

  ltcPatient: LTCPatient | null = null;
  assignedLunch: Meal | null = null;
  recommendedIntake: RecommendedIntake | null = null;
  loading: boolean = true;
  error: string | null = null;
  intakeUnit: string | null = null;  

  totalPatients: number = 0;

  constructor(
    private patientService: PatientService,
    private recommendedIntakeService: RecommendedIntakeService,
    private router: Router,
    private elementRef: ElementRef,
  ) {}

  ngOnInit(): void {
    this.loadPatientCount(); 
    if (this.patientId) {
      this.fetchPatientData();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (this.optionsOpen) {
      const target = event.target as HTMLElement;
      const optionElement = this.elementRef.nativeElement.querySelector('.option');
      const dropdownElement = this.elementRef.nativeElement.querySelector('.options-dropdown');
      
      // Check if click is outside both the option button and dropdown
      if (optionElement && dropdownElement) {
        const isClickInsideOption = optionElement.contains(target);
        const isClickInsideDropdown = dropdownElement.contains(target);
        
        if (!isClickInsideOption && !isClickInsideDropdown) {
          this.closeOptions();
        }
      }
    }
  }

  private loadPatientCount(): void {
    // Use LTC patient count instead of regular patient count
    this.patientService.getLTCPatientCount().subscribe({
      next: count => this.totalPatients = count,
      error: err => console.error('Error fetching LTC patient count:', err)
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
    // Fetch LTC patient data instead of regular patient
    this.patientService.getLTCPatient(this.patientId).subscribe({
      next: (ltcPatientData: LTCPatient) => {
        this.ltcPatient = ltcPatientData;
        // Use the LTC patient's ID from the response, not the patientId
        this.fetchRecommendedIntake(ltcPatientData.id);
      },
      error: (err) => {
        this.error = 'Failed to load LTC patient data!';
        this.loading = false;
        console.error('Error fetching LTC patient data:', err);
      }
    });
  }

  fetchRecommendedIntake(ltcPatientId: number): void {
    // Check if your backend has LTC-specific recommended intake endpoint
    // If not, you might need to skip this or create a separate service
    
    // Option 1: If you have LTC-specific recommended intake service
    // this.recommendedIntakeService.getLTCRecommendedIntake(ltcPatientId).subscribe({...});
    
    // Option 2: Skip recommended intake for LTC patients if not available
    console.log('LTC Patient loaded, skipping recommended intake for now');
    this.loading = false;
    return;
    
    // Option 3: If using regular recommended intake service (current issue)
    // Comment this out since it's causing the issue
    /*
    this.recommendedIntakeService.getRecommendedIntake(ltcPatientId).subscribe({
      next: (response: any) => {
        this.recommendedIntake = response.nutritional_recommendations;
        this.intakeUnit = response.units.protein;
        this.loading = false;
        console.log('Recommended Intake: ', response);
      },
      error: (err) => {
        this.error = 'Error fetching recommended intake data!';
        this.loading = false;
        console.error('Error fetching recommended intake:', err);
      }
    });
    */
  }

  // Helper methods to display LTC patient and recommended intake data
  getDisplayName(): string {
    // LTC patients use room-bed identifier instead of name
    return this.ltcPatient ? `${this.ltcPatient.room_number}-${this.ltcPatient.bed_number}` : '未選擇病人';
  }

  getDisplayAge(): number | string {
    return this.ltcPatient?.age || '--';
  }

  getDisplaySex(): string {
    return this.ltcPatient?.sex || '--';
  }

  getDisplayBMI(): number | string {
    if (this.ltcPatient?.height_cm && this.ltcPatient?.weight_kg) {
      const bmi = this.ltcPatient.weight_kg / Math.pow(this.ltcPatient.height_cm / 100, 2);
      return Math.round(bmi * 10) / 10; // Round to 1 decimal place
    }
    return '--';
  }

  getDisplayHeight(): string {
    return this.ltcPatient?.height_cm ? `${this.ltcPatient.height_cm} cm` : '--';
  }

  getDisplayWeight(): string {
    return this.ltcPatient?.weight_kg ? `${this.ltcPatient.weight_kg} kg` : '--';
  }

  getDisplayActivityLevel(): string {
    return this.ltcPatient?.activity_level || '--';
  }

  getRecommendedIntakeDisplay(): string {
    // Since we're not loading recommended intake for LTC patients
    return '--';
    
    // Or if you want to calculate basic BMR for LTC patients:
    // return this.calculateBasicCalories();
  }

  // Optional: Calculate basic caloric needs for LTC patients
  private calculateBasicCalories(): string {
    if (!this.ltcPatient) return '--';
    
    const { age, sex, height_cm, weight_kg } = this.ltcPatient;
    if (!age || !height_cm || !weight_kg) return '--';
    
    // Harris-Benedict equation
    let bmr: number;
    if (sex.toLowerCase() === 'male') {
      bmr = 88.362 + (13.397 * weight_kg) + (4.799 * height_cm) - (5.677 * age);
    } else {
      bmr = 447.593 + (9.247 * weight_kg) + (3.098 * height_cm) - (4.330 * age);
    }
    
    // Activity multiplier (simplified)
    const activityMultipliers: { [key: string]: number } = {
      'sedentary': 1.2,
      'light': 1.375,
      'moderate': 1.55,
      'active': 1.725,
      'very_active': 1.9
    };
    
    const multiplier = activityMultipliers[this.ltcPatient.activity_level] || 1.2;
    const dailyCalories = Math.round(bmr * multiplier);
    
    return `${dailyCalories} kcal`;
  }

  // Events for navigation and options
  @Output() previousClicked = new EventEmitter<void>();
  @Output() nextClicked = new EventEmitter<void>();
  @Output() optionsClicked = new EventEmitter<void>();

  // Navigate to the previous patient
  onPreviousPatient(): void {
    this.closeOptions();
    if (this.patientId > 1) {
      this.patientId--;  
      this.patientIdChange.emit(this.patientId);  
      this.fetchPatientData(); 
    }
  }

  // Navigate to the next patient
  onNextPatient(): void {
    this.closeOptions();
    this.patientId++;  
    this.patientIdChange.emit(this.patientId); 
    this.fetchPatientData(); 
  }

  optionsOpen: boolean = false;

  onOptionsClick(): void {
    this.optionsOpen = true;
    this.optionsClicked.emit();
  }

  closeOptions(): void {
    this.optionsOpen = false;
  }

  onEditPatient(): void {
    console.log('Edit LTC patient', this.patientId);
    this.closeOptions();

    // Update navigation to use LTC patient routes
    this.router.navigate(['/patient-info/edit', this.patientId]).catch(error => {
      console.error('Navigation failed:', error);
      alert('Failed to navigate to edit LTC patient details. Please try again.');
    });
  }
  
  onViewPatient(): void {
    console.log('View LTC patient', this.patientId);
    this.closeOptions();

    // Update navigation to use LTC patient routes
    this.router.navigate(['/patient-info/view', this.patientId]).catch(error => {
      console.error('Navigation failed:', error);
      alert('Failed to navigate to LTC patient details. Please try again.');
    });
  }

  // Additional helper methods specific to LTC patients
  getRoomNumber(): string {
    return this.ltcPatient?.room_number || '--';
  }

  getBedNumber(): string {
    return this.ltcPatient?.bed_number || '--';
  }

  getPatientIdentifier(): string {
    return this.ltcPatient ? `${this.ltcPatient.room_number}-${this.ltcPatient.bed_number}` : '--';
  }

  // Check if LTC patient data is loaded
  hasPatientData(): boolean {
    return this.ltcPatient !== null;
  }

  // Check if patient has complete basic info
  hasCompleteBasicInfo(): boolean {
    return !!(this.ltcPatient?.room_number && 
             this.ltcPatient?.bed_number && 
             this.ltcPatient?.age && 
             this.ltcPatient?.sex);
  }

  // Check if patient has complete physical info
  hasCompletePhysicalInfo(): boolean {
    return !!(this.ltcPatient?.height_cm && 
             this.ltcPatient?.weight_kg && 
             this.ltcPatient?.activity_level);
  }
}
