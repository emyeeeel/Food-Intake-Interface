import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Patient } from '../../models/patient.model';
import { RecommendedIntake } from '../../models/recommended-intake.model';
import { PatientService } from '../../services/patient.service';

import { MenuBarComponent } from "../../components/menu-bar/menu-bar.component";
import { BackComponent } from "../../components/back/back.component";
import { SearchBarComponent } from "../../components/search-bar/search-bar.component";
import { NotifComponent } from "../../components/notif/notif.component";
import { MainOptionsComponent } from "../../components/main-options/main-options.component";
import { DateContainerComponent } from "../../components/date-container/date-container.component";
import { PatientCardComponent } from "../../components/patient-card/patient-card.component";
import { BmiCardComponent } from "../../components/bmi-card/bmi-card.component";
import { BpCardComponent } from "../../components/bp-card/bp-card.component";
import { MealAssignmentComponent } from "../../components/meal-assignment/meal-assignment.component";
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-patient-info',
  imports: [
    MenuBarComponent, BackComponent, SearchBarComponent, NotifComponent,
    MainOptionsComponent, DateContainerComponent, PatientCardComponent,
    BmiCardComponent, BpCardComponent, MealAssignmentComponent, CommonModule
  ],
  templateUrl: './patient-info.component.html',
  styleUrls: ['./patient-info.component.scss']
})
export class PatientInfoComponent implements OnInit {
  patientId: number = 1;  
  loading: boolean = true;
  error: string | null = null;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.patientId = this.getPatientIdFromRoute() || 1;
    // console.log('Patient ID:',this.patientId)
  }

  getPatientIdFromRoute(): number | null {
    const url = this.router.url;
    const match = url.match(/\/patient-info\/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  onPatientIdChange(newPatientId: number): void {
    this.patientId = newPatientId; 
  }

  navigateToAddRecord(): void {
    console.log('Navigate to Add Record');
    this.router.navigate(['/patient-info/add']);
  }

  navigateToAllRecord(): void {
    console.log('Navigate to See All Records');
    this.router.navigate(['/patient-info/all']);
  }

  navigateToPrintRecord(): void {
    console.log('Navigate to Print Record');
    this.router.navigate(['/patient-info/print']);
  }
}
