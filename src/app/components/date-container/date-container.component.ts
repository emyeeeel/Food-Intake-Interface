import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-date-container',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './date-container.component.html',
  styleUrl: './date-container.component.scss'
})
export class DateContainerComponent implements OnInit {
  @Input() isHomePage: boolean = false;
  
  selectedDate: string = '';
  showPopup: boolean = false;
  currentWeekRange: string = '';
  currentDay: string = '';

  constructor() {
    // Set today's date as default
    const today = new Date();
    this.selectedDate = today.toISOString().split('T')[0];
    this.updateDateDisplays();
  }

  ngOnInit(): void {
    this.updateDateDisplays();
  }

  togglePopup(): void {
    this.showPopup = !this.showPopup;
  }

  closePopup(): void {
    this.showPopup = false;
  }

  onDateSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.selectedDate = target.value;
    this.updateDateDisplays();
    console.log('Date selected from popup:', this.selectedDate);
  }

  selectToday(): void {
    const today = new Date();
    this.selectedDate = today.toISOString().split('T')[0];
    this.updateDateDisplays();
    console.log('Today selected:', this.selectedDate);
  }

  confirmSelection(): void {
    this.closePopup();
    console.log('Date confirmed:', this.selectedDate);
  }

  private updateDateDisplays(): void {
    if (!this.selectedDate) return;

    const date = new Date(this.selectedDate + 'T00:00:00'); // Avoid timezone issues
    
    // Update current day display
    this.currentDay = date.toLocaleDateString('zh-TW', {
      month: 'short',
      day: 'numeric',
      weekday: 'short'
    });

    // Calculate week range (Sunday to Saturday)
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - dayOfWeek);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    this.currentWeekRange = `${startOfWeek.toLocaleDateString('zh-TW', {
      month: 'short',
      day: 'numeric'
    })} - ${endOfWeek.toLocaleDateString('zh-TW', {
      month: 'short',
      day: 'numeric'
    })}`;
  }

  // Helper method to get formatted date (if needed elsewhere)
  getFormattedDate(): string {
    if (!this.selectedDate) return '';
    
    const date = new Date(this.selectedDate + 'T00:00:00');
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  }

  // Get selected date value (for parent components)
  getSelectedDate(): string {
    return this.selectedDate;
  }

  // Set date from parent component (if needed)
  setDate(dateString: string): void {
    this.selectedDate = dateString;
    this.updateDateDisplays();
  }
}
