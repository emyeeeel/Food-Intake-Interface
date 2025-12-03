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
  @Input() originalVolume!: number;
  @Input() remainingPercent!: number;
  @Input() remainingVolume!: number;
  
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
}