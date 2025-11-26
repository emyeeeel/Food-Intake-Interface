import { Component, OnInit } from '@angular/core';
import { SeeHistoryButtonComponent } from "../see-history-button/see-history-button.component";
import { IntakeLegendComponent } from "../intake-legend/intake-legend.component";
import { CommonModule } from '@angular/common';
import { PieChartComponent } from "../pie-chart/pie-chart.component";
import { FoodGroupService } from '../../services/food-group.service';

@Component({
  selector: 'app-nutrient-intake',
  imports: [SeeHistoryButtonComponent, IntakeLegendComponent, CommonModule, PieChartComponent],
  templateUrl: './nutrient-intake.component.html',
  styleUrls: ['./nutrient-intake.component.scss']
})
export class NutrientIntakeComponent implements OnInit {
  nutritionLegends: { color: string; text: string; percent: string }[] = [];

  private colors: string[] = ['#A9B0E5', '#6F7BD4', '#8DD3C8', '#40C1AC', '#4C9FA0', '#00313C'];

  constructor(private foodGroupService: FoodGroupService) {}

  ngOnInit(): void {
    this.loadFoodGroups();
  }

  private loadFoodGroups(): void {
    this.foodGroupService.getFoodGroups().subscribe({
      next: (foodGroups) => {
        this.nutritionLegends = foodGroups.map((fg, index) => ({
          text: fg.name,
          color: this.colors[index % this.colors.length], 
          percent: '0%'
        }));

        this.generateSimpleRandomPercentages();
      },
      error: (err) => {
        console.error('Error fetching food groups:', err);
      }
    });
  }

  // 10-100% random percentage (to be changed)
  private generateSimpleRandomPercentages(): void {
    this.nutritionLegends.forEach((legend) => {
      const randomPercent = Math.floor(Math.random() * 91) + 10; 
      legend.percent = `${randomPercent}%`;
    });
  }
}
