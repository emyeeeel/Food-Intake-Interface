import { Component } from '@angular/core';
import { Router } from '@angular/router'; // Add Router import if you want navigation
import { MenuBarComponent } from "../../components/menu-bar/menu-bar.component";
import { BackComponent } from "../../components/back/back.component";
import { SearchBarComponent } from "../../components/search-bar/search-bar.component";
import { NotifComponent } from "../../components/notif/notif.component";
import { FilterIconComponent } from "../../components/filter-icon/filter-icon.component";
import { FilterOptionsComponent } from "../../components/filter-options/filter-options.component";
import { CommonModule } from '@angular/common';
import { MainOptionsComponent } from "../../components/main-options/main-options.component";
import { IngredientsCategoriesComponent } from "../../components/ingredients-categories/ingredients-categories.component";

@Component({
  selector: 'app-ingredients',
  imports: [CommonModule, MenuBarComponent, BackComponent, SearchBarComponent, NotifComponent, FilterIconComponent, FilterOptionsComponent, MainOptionsComponent, IngredientsCategoriesComponent],
  templateUrl: './ingredients.component.html',
  styleUrl: './ingredients.component.scss'
})
export class IngredientsComponent {
  isMobileMenuOpen = false; 
  filterOptions: string[] = [
    '低過敏源飲食',
    '高纖維飲食',
    '低鈉飲食',
    '低脂飲食',
    '無乳糖飲食'
  ];

  categories = [
    {
      image: 'assets/images/ingredients/vegetable.png',
      alt: 'Vegetable',
      text: '蔬菜'
    },
    {
      image: 'assets/images/ingredients/grains.png', 
      alt: 'Grain',
      text: '穀物'
    },
    {
      image: 'assets/images/ingredients/protein.png',
      alt: 'Protein',
      text: '蛋白質'
    },
    {
      image: 'assets/images/ingredients/dairy.png',
      alt: 'Dairy', 
      text: '乳製品'
    },
    {
      image: 'assets/images/ingredients/watermelon.png',
      alt: 'Fruits',
      text: '水果'
    },
    {
      image: 'assets/images/ingredients/nuts-seeds.png',
      alt: 'Nuts & Seeds',
      text: '堅果種子'
    },
    {
      image: 'assets/images/ingredients/eggs.png',
      alt: 'Eggs',
      text: '蛋製品'
    },
    {
      image: 'assets/images/ingredients/fats-oils.png',
      alt: 'Fats & Oils',
      text: '油脂類(奶油)'
    },
    {
      image: 'assets/images/ingredients/sweetener.png',
      alt: 'Sweetener',
      text: '代糖'
    },
    {
      image: 'assets/images/ingredients/legumes.png',
      alt: 'Legumes',
      text: '豆類(煉莢豆)'
    }
  ];

  constructor(private router: Router) {} 

  // Method to handle category selection
  onCategorySelected(category: any): void {
    console.log('Selected category:', category);
    // Add navigation or filtering logic here
    // Example: this.router.navigate(['/ingredients', category.id]);
  }

  // Methods for main options
  navigateToAddIngredient(): void {
    console.log('Navigate to Add Ingredient');
    this.router.navigate(['/ingredients/add']);
  }

  navigateToAllIngredients(): void {
    console.log('Navigate to All Ingredients');
    this.router.navigate(['/ingredients/all']);
  }

  printIngredients(): void {
    console.log('Print Ingredients');
    this.router.navigate(['/ingredients/print']);
  }

  // Called by MenuBar to toggle main content dimming
  onMobileMenuToggle(isOpen: boolean) {
    this.isMobileMenuOpen = isOpen;
  }
}
