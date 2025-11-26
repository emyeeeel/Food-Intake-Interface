import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-meal-item',
  imports: [CommonModule],
  templateUrl: './meal-item.component.html',
  styleUrl: './meal-item.component.scss'
})
export class MealItemComponent {
  @Input() mealImageSrc: string = 'assets/images/meals/meal-1.png';
  @Input() mealImageAlt: string = 'Meal Image';
  @Input() mealCode: string = 'L-01-A';
  @Input() dayCycleLabel: string = '日循环';
  @Input() dayCycleValue: string = '第1天';
  @Input() mealTimeLabel: string = '用餐时间';
  @Input() mealTimeValue: string = '午餐';
  @Input() plateTypeLabel: string = '板式';
  @Input() plateTypeValue: string = '便当';
}