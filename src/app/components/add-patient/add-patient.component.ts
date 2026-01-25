import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Patient {
  roomNumber: string;
  bedNumber: string;
  age: number | null;
  sex: string;
  height: number | null;
  weight: number | null;
  activityLevel: string;
}

@Component({
  selector: 'app-add-patient',
  imports: [CommonModule, FormsModule],
  templateUrl: './add-patient.component.html',
  styleUrl: './add-patient.component.scss',
})
export class AddPatientComponent {
  isLoading = false;
  isSuccess = false;

  patient: Patient = {
    roomNumber: '',
    bedNumber: '',
    age: null,
    sex: '',
    height: null,
    weight: null,
    activityLevel: ''
  };

  onSubmit(): void {
    if (!this.isFormValid()) {
      alert('Please fill in all required fields');
      return;
    }

    this.isLoading = true;
    
    // Simulate API call
    setTimeout(() => {
      console.log('Patient data:', this.patient);
      this.isLoading = false;
      this.isSuccess = true;
      
      // Show success message
      alert('Patient added successfully!');
      
      // Reset form after success
      setTimeout(() => {
        this.onReset();
      }, 2000);
    }, 2000);
  }

  onReset(): void {
    this.patient = {
      roomNumber: '',
      bedNumber: '',
      age: null,
      sex: '',
      height: null,
      weight: null,
      activityLevel: ''
    };
    this.isSuccess = false;
  }

  isFormValid(): boolean {
    return !!(
      this.patient.roomNumber.trim() &&
      this.patient.bedNumber.trim() &&
      this.patient.age !== null &&
      this.patient.age > 0
    );
  }
}
