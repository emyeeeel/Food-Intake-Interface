import { Component, OnInit } from '@angular/core';
import { ConsumptionBarComponent } from "../consumption-bar/consumption-bar.component";
import { LTCPatient } from '../../models/ltc-patient.model';
import { PatientService } from '../../services/patient.service';


@Component({
  selector: 'app-daily-consumption',
  imports: [ConsumptionBarComponent],
  templateUrl: './daily-consumption.component.html',
  styleUrl: './daily-consumption.component.scss'
})
export class DailyConsumptionComponent implements OnInit {
  patients: LTCPatient[] = [];  
  dailyPercentages: number[] = [];

  constructor(private patientService: PatientService) {}

  ngOnInit(): void {
    this.loadLTCPatients()
    this.generateRandomPercentages();
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

  generateRandomPercentages(): void {
    this.dailyPercentages = [];
    for (let i = 0; i < 7; i++) {
      // Generate random percentage between 10 and 100
      const randomPercentage = Math.floor(Math.random() * 91) + 10;
      this.dailyPercentages.push(randomPercentage);
    }
  }
}
