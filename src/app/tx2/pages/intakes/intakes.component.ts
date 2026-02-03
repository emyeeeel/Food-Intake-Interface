import { Component, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from "../../components/header/header.component";
import { PatientService } from '../../../services/patient.service';
import { LTCPatient } from '../../../models/ltc-patient.model';
import { AddIntakeComponent } from "../../components/add-intake/add-intake.component";


@Component({
  selector: 'app-intakes',
  imports: [MatIconModule, CommonModule, HeaderComponent, AddIntakeComponent],
  templateUrl: './intakes.component.html',
  styleUrl: './intakes.component.scss',
})
export class IntakesComponent implements OnInit  {
  patients: LTCPatient[] = [];  
  loading: boolean = true;

  selectedRoom: string | null = null;
  selectedBed: LTCPatient | null = null;

  constructor(private patientService: PatientService) {}

  ngOnInit(): void {
    this.loadLTCPatients()
  }

  private loadLTCPatients(): void {
    this.patientService.getLTCPatients().subscribe(
      (patients) => {
        this.patients = patients;  
        this.loading = false;
        console.log(patients)
      },
      (error) => {
        console.error('Error fetching LTC patients:', error);
        this.loading = false;
      }
    );
  }

  getUniqueRooms(): string[] {
    const rooms = this.patients.map(p => p.room_number);
    return Array.from(new Set(rooms));
  }

  getBedsForRoom(room: string) {
    return this.patients.filter(p => p.room_number === room);
  }

  selectRoom(room: string) {
    this.selectedRoom = room;
    this.selectedBed = null; 
  }

  selectBed(patient: LTCPatient) {
    this.selectedBed = patient;
  }

  backToRooms() {
    this.selectedRoom = null;
    this.selectedBed = null;
  }

  backToBeds() {
    this.selectedBed = null;
  }
}
