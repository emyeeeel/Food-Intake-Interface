import { Component, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { PatientCardComponent } from "../../components/patient-card/patient-card.component";
import { PatientService } from '../../../services/patient.service';
import { LTCPatient } from '../../../models/ltc-patient.model';
import { HeaderComponent } from "../../components/header/header.component";



@Component({
  selector: 'app-patient',
  imports: [MatIconModule, CommonModule, PatientCardComponent, HeaderComponent],
  templateUrl: './patients.component.html',
  styleUrl: './patients.component.scss',
})
export class PatientsComponent implements OnInit {
  patients: LTCPatient[] = [];  

  constructor(private patientService: PatientService) {}

  ngOnInit(): void {
    this.loadLTCPatients()
  }

  private loadLTCPatients(): void {
    this.patientService.getLTCPatients().subscribe(
      (patients) => {
        this.patients = patients;  
      },
      (error) => {
        console.error('Error fetching LTC patients:', error);
      }
    );
  }

  formatRoomBed(patient: LTCPatient): string {
    return `${patient.room_number}-${patient.bed_number}`;
  }
}
