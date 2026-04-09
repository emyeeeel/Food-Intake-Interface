import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Ingredient } from '../../models/ingredient.model';
import { IngredientsService } from '../../services/ingredients.service';

@Component({
  selector: 'app-print-all-ingredients',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './print-all-ingredients.component.html',
  styleUrl: './print-all-ingredients.component.scss',
})
export class PrintAllIngredientsComponent implements OnInit {
  ingredients: Ingredient[] = [];
  paginatedIngredients: Ingredient[] = [];
  loading: boolean = true;
  error: string | null = null;

  // Pagination properties
  currentPage = 1;
  pageSize = 5; // Items per page
  totalIngredients = 0;
  totalPages = 0;
  targetPage: number | null = null;

  // Selection
  selectedIngredients: Set<number> = new Set();

  constructor(private ingredientsService: IngredientsService) {}

  ngOnInit(): void {
    this.loadAllIngredients();
  }

  loadAllIngredients(): void {
    this.loading = true;
    this.error = null;

    this.ingredientsService.getIngredients().subscribe({
      next: (response) => {
        this.ingredients = response;
        this.totalIngredients = response.length;
        this.calculatePagination();
        this.updatePaginatedIngredients();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading ingredients:', err);
        this.error = 'Failed to load ingredients';
        this.loading = false;
      }
    });
  }

  calculatePagination(): void {
    this.totalPages = Math.ceil(this.totalIngredients / this.pageSize);
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }
  }

  updatePaginatedIngredients(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedIngredients = this.ingredients.slice(startIndex, endIndex);
  }

  // Selection Methods
  toggleIngredientSelection(ingredientId: number, event?: any): void {
    if (this.selectedIngredients.has(ingredientId)) {
      this.selectedIngredients.delete(ingredientId);
    } else {
      this.selectedIngredients.add(ingredientId);
    }
  }

  selectAllCurrentPage(): void {
    this.paginatedIngredients.forEach(ingredient => {
      this.selectedIngredients.add(ingredient.id);
    });
  }

  deselectAllCurrentPage(): void {
    this.paginatedIngredients.forEach(ingredient => {
      this.selectedIngredients.delete(ingredient.id);
    });
  }

  isAllCurrentPageSelected(): boolean {
    return this.paginatedIngredients.every(ingredient => this.selectedIngredients.has(ingredient.id));
  }

  isAnyCurrentPageSelected(): boolean {
    return this.paginatedIngredients.some(ingredient => this.selectedIngredients.has(ingredient.id));
  }

  clearSelection(): void {
    this.selectedIngredients.clear();
  }

  // Pagination Methods
  goToFirstPage(): void {
    this.currentPage = 1;
    this.updatePaginatedIngredients();
  }

  goToPreviousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePaginatedIngredients();
    }
  }

  goToNextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePaginatedIngredients();
    }
  }

  goToLastPage(): void {
    this.currentPage = this.totalPages;
    this.updatePaginatedIngredients();
  }

  goToPage(page: any): void {
    if (typeof page === 'number' && page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedIngredients();
    }
  }

  goToTargetPage(): void {
    if (this.targetPage && this.targetPage >= 1 && this.targetPage <= this.totalPages) {
      this.currentPage = this.targetPage;
      this.updatePaginatedIngredients();
      this.targetPage = null;
    }
  }

  getVisiblePages(): (number | string)[] {
    const pages: (number | string)[] = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) {
        pages.push('...');
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    if (endPage < this.totalPages) {
      if (endPage < this.totalPages - 1) {
        pages.push('...');
      }
      pages.push(this.totalPages);
    }

    return pages;
  }

  getStartIndex(): number {
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  getEndIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalIngredients);
  }

  // Print Methods
  printAllIngredients(): void {
    const printWindow = window.open('', '', 'height=600,width=800');
    if (printWindow) {
      const ingredientRows = this.ingredients.map(i => `
        <tr>
          <td>${i.id}</td>
          <td>${i.name}</td>
          <td>${i.food_group || '-'}</td>
        </tr>
      `).join('');

      const html = `
        <html>
          <head>
            <title>Ingredient Report</title>
            <style>
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #40C1AC; color: white; }
              h2 { text-align: center; }
            </style>
          </head>
          <body>
            <h2>Ingredient Report - ${new Date().toLocaleDateString()}</h2>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Food Group</th>
                </tr>
              </thead>
              <tbody>
                ${ingredientRows}
              </tbody>
            </table>
          </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  }

  printSelectedIngredients(): void {
    const selected = Array.from(this.selectedIngredients);
    const ingredientsToPrint = this.ingredients.filter(i => selected.includes(i.id));

    const printWindow = window.open('', '', 'height=600,width=800');
    if (printWindow) {
      const ingredientRows = ingredientsToPrint.map(i => `
        <tr>
          <td>${i.id}</td>
          <td>${i.name}</td>
          <td>${i.food_group || '-'}</td>
        </tr>
      `).join('');

      const html = `
        <html>
          <head>
            <title>Ingredient Report - Selected</title>
            <style>
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #40C1AC; color: white; }
              h2 { text-align: center; }
            </style>
          </head>
          <body>
            <h2>Selected Ingredients - ${new Date().toLocaleDateString()}</h2>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Food Group</th>
                </tr>
              </thead>
              <tbody>
                ${ingredientRows}
              </tbody>
            </table>
          </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  }
}
