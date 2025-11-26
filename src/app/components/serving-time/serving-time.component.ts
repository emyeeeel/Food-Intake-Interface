import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-serving-time',
  imports: [CommonModule],
  templateUrl: './serving-time.component.html',
  styleUrl: './serving-time.component.scss'
})
export class ServingTimeComponent {
  @Input() selectedTime: string = 'Lunch';
  @Output() timeChanged = new EventEmitter<string>();

  timeOptions: string[] = ['Lunch', 'Dinner'];
  isDropdownOpen: boolean = false;

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  selectTime(time: string): void {
    this.selectedTime = time;
    this.isDropdownOpen = false;
    this.timeChanged.emit(time);
  }

  // Close dropdown when clicking outside (optional)
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.serving')) {
      this.isDropdownOpen = false;
    }
  }
}