import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-meal-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './meal-item.component.html',
  styleUrl: './meal-item.component.scss'
})
export class MealItemComponent {
  @Input() mealImageSrc: string = '';
  @Input() mealImageAlt: string = '';
  @Input() mealCode: string = '';
  @Input() dayCycleLabel: string = '天數';
  @Input() dayCycleValue: string = '';
  @Input() mealTimeLabel: string = '餐別';
  @Input() mealTimeValue: string = '';
  @Input() plateTypeLabel: string = '樣式';
  @Input() plateTypeValue: string = '';

  @Input() mealId: number | null = null;

  // Dropdown state
  optionsOpen: boolean = false;

  // Output events for parent components to handle
  @Output() viewMeal = new EventEmitter<void>();
  @Output() editMeal = new EventEmitter<void>();

  constructor(
    private router: Router,
  ) {}

  toggleOptions(): void {
    this.optionsOpen = !this.optionsOpen;
  }

  onViewMeal(): void {
    console.log('View meal with ID:', this.mealId);
    this.closeOptions();

    // Check if mealId is valid before navigation
    if (this.mealId) {
      this.router.navigate(['/meal-catalog/view', this.mealId]).catch(error => { 
        console.error('Navigation failed:', error);
      });
    } else {
      console.error('Cannot navigate: mealId is null or undefined');
    }
  }

  onEditMeal(): void {
    console.log('Edit meal with ID:', this.mealId);
    this.closeOptions();

    // Check if mealId is valid before navigation
    if (this.mealId) {
      this.router.navigate(['/meal-catalog/edit', this.mealId]).catch(error => { 
        console.error('Navigation failed:', error);
      });
    } else {
      console.error('Cannot navigate: mealId is null or undefined');
    }
  }

  closeOptions(): void {
    this.optionsOpen = false;
  }

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.row-1')) {
      this.optionsOpen = false;
    }
  }
}