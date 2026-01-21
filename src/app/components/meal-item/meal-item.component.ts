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
    console.log('View meal');
    this.closeOptions();

    this.router.navigate(['/meal-catalog/view']).catch(error => { 
      console.error('Navigation failed:', error);
    });
  }
  closeOptions(): void {
    this.optionsOpen = false;
  }

  onEditMeal(): void {
    console.log('Edit meal');
    this.closeOptions();

    this.router.navigate(['/meal-catalog/edit']).catch(error => { 
      console.error('Navigation failed:', error);
    });
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