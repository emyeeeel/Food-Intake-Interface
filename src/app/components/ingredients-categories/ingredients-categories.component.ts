import { Component, Input } from '@angular/core';


@Component({
  selector: 'app-ingredients-categories',
  imports: [],
  templateUrl: './ingredients-categories.component.html',
  styleUrl: './ingredients-categories.component.scss'
})
export class IngredientsCategoriesComponent {
  @Input() imageSrc: string = 'assets/images/ingredients/vegetable.png';
  @Input() imageAlt: string = 'Vegetable';
  @Input() categoryText: string = 'Vegetable';
}