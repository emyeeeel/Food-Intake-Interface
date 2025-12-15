import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { IngredientsCardComponent } from "../ingredients-card/ingredients-card.component";
import { IngredientsService } from '../../services/ingredients.service';
import { Ingredient } from '../../models/ingredient.model';

@Component({
  selector: 'app-display-ingredients',
  imports: [CommonModule, RouterModule, IngredientsCardComponent],
  templateUrl: './display-ingredients.component.html',
  styleUrl: './display-ingredients.component.scss'
})
export class DisplayIngredientsComponent implements OnInit, OnDestroy {
  ingredients: Ingredient[] = [];
  paginatedIngredients: Ingredient[] = [];
  isLoading: boolean = true;
  error: string | null = null;
  
  // Pagination properties
  currentPage: number = 1;
  itemsPerPage: number = 4; 
  totalIngredients: number = 0;
  totalPages: number = 0;
  
  private destroy$ = new Subject<void>();

  constructor(private ingredientsService: IngredientsService) {}

  ngOnInit(): void {
    this.loadIngredients();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadIngredients(): void {
    this.isLoading = true;
    this.error = null;

    this.ingredientsService.getIngredients()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (ingredients: Ingredient[]) => {
          this.ingredients = ingredients;
          this.totalIngredients = ingredients.length;
          this.calculateTotalPages();
          this.updatePaginatedIngredients();
          this.isLoading = false;
          console.log('Ingredients loaded successfully:', ingredients);
        },
        error: (error) => {
          console.error('Error loading ingredients:', error);
          this.error = 'Failed to load ingredients. Please try again.';
          this.isLoading = false;
        }
      });
  }

  refreshIngredients(): void {
    this.loadIngredients();
  }

  // Pagination methods
  private calculateTotalPages(): void {
    this.totalPages = Math.ceil(this.totalIngredients / this.itemsPerPage);
  }

  private updatePaginatedIngredients(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedIngredients = this.ingredients.slice(startIndex, endIndex);
  }

  goToFirstPage(): void {
    this.currentPage = 1;
    this.updatePaginatedIngredients();
  }

  goToLastPage(): void {
    this.currentPage = this.totalPages;
    this.updatePaginatedIngredients();
  }

  goToNextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePaginatedIngredients();
    }
  }

  goToPreviousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePaginatedIngredients();
    }
  }

  goToPage(page: number | string): void {
    if (typeof page === 'number' && page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedIngredients();
    }
  }

  getVisiblePages(): (number | string)[] {
    const visiblePages: (number | string)[] = [];
    const maxVisiblePages = 5;
    
    if (this.totalPages <= maxVisiblePages) {
      for (let i = 1; i <= this.totalPages; i++) {
        visiblePages.push(i);
      }
    } else {
      const halfVisible = Math.floor(maxVisiblePages / 2);
      let startPage = Math.max(1, this.currentPage - halfVisible);
      let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);
      
      if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }
      
      if (startPage > 1) {
        visiblePages.push(1);
        if (startPage > 2) {
          visiblePages.push('...');
        }
      }
      
      for (let i = startPage; i <= endPage; i++) {
        visiblePages.push(i);
      }
      
      if (endPage < this.totalPages) {
        if (endPage < this.totalPages - 1) {
          visiblePages.push('...');
        }
        visiblePages.push(this.totalPages);
      }
    }
    
    return visiblePages;
  }

  trackByIngredientId(index: number, ingredient: Ingredient): number {
    return ingredient.id;
  }
}