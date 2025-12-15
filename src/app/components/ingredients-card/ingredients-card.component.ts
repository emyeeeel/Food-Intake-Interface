import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Ingredient } from '../../models/ingredient.model';
import { FoodGroupService } from '../../services/food-group.service';
import { FoodGroup } from '../../models/food-group.model';
import { NutrientService } from '../../services/nutrient.service';
import { Nutrient } from '../../models/nutrient.model';

@Component({
  selector: 'app-ingredients-card',
  imports: [CommonModule],
  templateUrl: './ingredients-card.component.html',
  styleUrls: ['./ingredients-card.component.scss']
})
export class IngredientsCardComponent implements OnInit {
  @Input() ingredient!: Ingredient;
  @Input() defaultImage: string = 'assets/images/ingredients/ingredients-placeholder.png'; 

  
  foodGroup: FoodGroup | null = null;
  nutrients: Nutrient[] = []; 

  constructor(
    private foodGroupService: FoodGroupService, 
    private nutrientService: NutrientService
  ) {}

  ngOnInit(): void {
    console.log('Ingredient: ', this.ingredient!.id, this.ingredient!.food_group, this.ingredient!.nutrients!.length);
    
    if (this.ingredient.food_group) {
      this.foodGroupService.getFoodGroup(this.ingredient.food_group)
        .subscribe(
          (data: FoodGroup) => {
            this.foodGroup = data;
            console.log('Fetched Food Group: ', this.foodGroup);
          },
          (error) => {
            console.error('Error fetching food group:', error);
          }
        );
    }

    if (this.ingredient.nutrients && this.ingredient.nutrients.length > 0) {
      this.ingredient.nutrients.forEach(nutrientId => {
        this.nutrientService.getNutrient(nutrientId).subscribe(
          (data: Nutrient) => {
            this.nutrients.push(data); 
            console.log('Fetched Nutrient: ', data);
          },
          (error) => {
            console.error('Error fetching nutrient:', error);
          }
        );
      });
    }
  }
 
  onImageError(event: any): void {
    event.target.src = this.defaultImage;
    event.target.style.display = 'none';
  }
}
