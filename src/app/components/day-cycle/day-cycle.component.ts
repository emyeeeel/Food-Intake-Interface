import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-day-cycle',
  imports: [CommonModule],
  templateUrl: './day-cycle.component.html',
  styleUrl: './day-cycle.component.scss'
})
export class DayCycleComponent {
  @Input() selectedTime: string = 'Day 1';
  @Output() dayChanged = new EventEmitter<string>();

  timeOptions: string[] = [];
  isDropdownOpen: boolean = false;

  constructor() {
    // Generate Day 1 to Day 14 options
    for (let i = 1; i <= 14; i++) {
      this.timeOptions.push(`Day ${i}`);
    }
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  selectTime(time: string): void {
    this.selectedTime = time;
    this.isDropdownOpen = false;
    this.dayChanged.emit(time);
  }

  // Close dropdown when clicking outside (optional)
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.cycle')) {
      this.isDropdownOpen = false;
    }
  }
}