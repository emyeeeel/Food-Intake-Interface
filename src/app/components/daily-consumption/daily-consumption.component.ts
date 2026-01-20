import { Component } from '@angular/core';
import { ConsumptionBarComponent } from "../consumption-bar/consumption-bar.component";


@Component({
  selector: 'app-daily-consumption',
  imports: [ConsumptionBarComponent],
  templateUrl: './daily-consumption.component.html',
  styleUrl: './daily-consumption.component.scss'
})
export class DailyConsumptionComponent {
  dailyPercentages: number[] = [];

  ngOnInit(): void {
    this.generateRandomPercentages();
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
