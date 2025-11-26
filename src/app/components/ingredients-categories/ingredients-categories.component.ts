import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ingredients-categories',
  imports: [CommonModule],
  templateUrl: './ingredients-categories.component.html',
  styleUrl: './ingredients-categories.component.scss'
})
export class IngredientsCategoriesComponent {
  @Input() imageSrc: string = 'assets/images/ingredients/vegetable.png';
  @Input() imageAlt: string = 'Vegetable';
  @Input() categoryText: string = 'Vegetable';
}