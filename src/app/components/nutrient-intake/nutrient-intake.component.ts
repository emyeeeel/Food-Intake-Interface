import { Component, OnInit } from '@angular/core';
import { SeeHistoryButtonComponent } from "../see-history-button/see-history-button.component";
import { IntakeLegendComponent } from "../intake-legend/intake-legend.component";

import { PieChartComponent } from "../pie-chart/pie-chart.component";
import { FoodGroupService } from '../../services/food-group.service';
import { LTCPatient } from '../../models/ltc-patient.model';
import { PatientService } from '../../services/patient.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-nutrient-intake',
  imports: [SeeHistoryButtonComponent, IntakeLegendComponent, PieChartComponent, CommonModule],
  templateUrl: './nutrient-intake.component.html',
  styleUrls: ['./nutrient-intake.component.scss']
})
export class NutrientIntakeComponent implements OnInit {
  patients: LTCPatient[] = [];  
  nutritionLegends: { color: string; text: string; percent: string }[] = [];

  private colors: string[] = ['#A9B0E5', '#6F7BD4', '#8DD3C8', '#40C1AC', '#4C9FA0', '#00313C'];


  constructor(private patientService: PatientService, private foodGroupService: FoodGroupService) {}

  ngOnInit(): void {
    this.loadLTCPatients()
    this.loadFoodGroups();
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

  private loadFoodGroups(): void {
    this.foodGroupService.getFoodGroups().subscribe({
      next: (foodGroups) => {
        // this.nutritionLegends = foodGroups.map((fg, index) => ({
        //   text: fg.name,
        //   color: this.colors[index % this.colors.length], 
        //   percent: '0%'
        // }));

        // Exclude food group with id 7 (Condiments/Seasonings) since this is to be discussed
        const filteredGroups = foodGroups.filter(fg => fg.id !== 7);

        this.nutritionLegends = filteredGroups.map((fg, index) => ({
          text: fg.name,
          color: this.colors[index % this.colors.length], 
          percent: '0%'
        }));
        console.log(this.nutritionLegends)

        this.generateSimpleRandomPercentages();
      },
      error: (err) => {
        console.error('Error fetching food groups:', err);
      }
    });
  }

private generateSimpleRandomPercentages(): void {
  const count = this.nutritionLegends.length;

  if (count === 0) return;

  const minShare = 8;   // minimum % per slice
  const maxShare = 30;  // prevents dominance

  let remaining = 100;

  const values: number[] = [];

  for (let i = 0; i < count; i++) {
    const slicesLeft = count - i;

    if (i === count - 1) {
      values.push(remaining);
    } else {
      const maxAllowed = Math.min(maxShare, remaining - minShare * (slicesLeft - 1));
      const minAllowed = minShare;

      const value =
        Math.floor(Math.random() * (maxAllowed - minAllowed + 1)) + minAllowed;

      values.push(value);
      remaining -= value;
    }
  }

  // shuffle for natural distribution
  values.sort(() => Math.random() - 0.5);

  this.nutritionLegends.forEach((legend, i) => {
    legend.percent = `${values[i]}%`;
  });
}

}
