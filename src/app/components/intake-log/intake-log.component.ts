import { Component, Input, OnInit } from '@angular/core';
import { TagsComponent } from "../tags/tags.component";

@Component({
  selector: 'app-intake-log',
  templateUrl: './intake-log.component.html',
  styleUrl: './intake-log.component.scss',
  imports: [TagsComponent]
})
export class IntakeLogComponent implements OnInit {
  @Input() time!: string;
  @Input() assignedMeal!: string;
  @Input() weight!: number;
  @Input() percent!: number;
  @Input() volume: string | number = 0;
  
  iconSrc: string = '';

  ngOnInit(): void {
    this.setIconSrc();
  }

  private setIconSrc(): void {
    const timeToIconMap: { [key: string]: string } = {
      '午餐': 'assets/icons/lunch-time.svg',
      '晚餐': 'assets/icons/dinner-time.svg',
      'snack': 'assets/icons/snack-time.svg'
    };

    const timeKey = this.time.toLowerCase();
    this.iconSrc = timeToIconMap[timeKey] || 'assets/icons/lunch-time.svg';
  }
  
  get formattedAssignedMeal(): string {
    if (!this.assignedMeal) return '';

    const [meal, id, phase] = this.assignedMeal.split('-');

    const mealMap: { [key: string]: string } = {
      '午餐': 'L',
      '晚餐': 'D'
    };

    const phaseMap: { [key: string]: string } = {
      '前': 'B',
      '後': 'A'
    };

    const mappedMeal = mealMap[meal] || meal;
    const mappedPhase = phaseMap[phase] || phase;

    return `${mappedMeal}-${id}-${mappedPhase}`;
  }
}