import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AddMealFormComponent } from '../add-meal-form/add-meal-form.component';
import { AddMealExcelImportComponent } from '../add-meal-excel-import/add-meal-excel-import.component';
import { ModeBannerComponent } from '../mode-banner/mode-banner.component';

@Component({
  selector: 'app-add-meal',
  standalone: true,
  imports: [CommonModule, AddMealFormComponent, AddMealExcelImportComponent, ModeBannerComponent],
  templateUrl: './add-meal.component.html',
  styleUrl: './add-meal.component.scss',
})
export class AddMealComponent {
  selectedOption: 'addMeal' | 'updateCycle' | null = null;

  selectOption(option: 'addMeal' | 'updateCycle'): void {
    this.selectedOption = option;
  }

  goBackToOptions(): void {
    this.selectedOption = null;
  }
}
