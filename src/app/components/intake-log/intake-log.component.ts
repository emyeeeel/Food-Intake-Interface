import { Component, Input, OnInit } from '@angular/core';
import { TagsComponent } from '../tags/tags.component';

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

  iconSrc = '';

  ngOnInit(): void {
    this.setIconSrc();
  }

  private normalizeMealTime(value: string): string {
    const normalized = (value || '').trim().toLowerCase();

    if (
      normalized === '\u5348\u9910' ||
      normalized.includes('å') ||
      normalized.includes('\u5348')
    ) {
      return '\u5348\u9910';
    }

    if (
      normalized === '\u665a\u9910' ||
      normalized.includes('æ') ||
      normalized.includes('\u665a')
    ) {
      return '\u665a\u9910';
    }

    if (normalized === '\u9ede\u5fc3' || normalized === 'snack') {
      return '\u9ede\u5fc3';
    }

    return value;
  }

  private setIconSrc(): void {
    const normalizedTime = this.normalizeMealTime(this.time);
    const timeToIconMap: Record<string, string> = {
      '\u5348\u9910': 'assets/icons/lunch-time.svg',
      '\u665a\u9910': 'assets/icons/dinner-time.svg',
      '\u9ede\u5fc3': 'assets/icons/snack-time.svg'
    };

    this.iconSrc = timeToIconMap[normalizedTime] || 'assets/icons/lunch-time.svg';
  }

  get displayTime(): string {
    return this.normalizeMealTime(this.time);
  }

  get formattedAssignedMeal(): string {
    if (!this.assignedMeal) {
      return '';
    }

    const [meal, id, phase] = this.assignedMeal.split('-');
    const normalizedMeal = this.normalizeMealTime(meal);

    const mealMap: Record<string, string> = {
      '\u5348\u9910': 'L',
      '\u665a\u9910': 'D',
      '\u9ede\u5fc3': 'S'
    };

    const phaseMap: Record<string, string> = {
      before: 'B',
      after: 'A',
      A: 'A',
      B: 'B'
    };

    const mappedMeal = mealMap[normalizedMeal] || meal;
    const mappedPhase = phaseMap[phase] || phase || 'A';

    return `${mappedMeal}-${id}-${mappedPhase}`;
  }
}
