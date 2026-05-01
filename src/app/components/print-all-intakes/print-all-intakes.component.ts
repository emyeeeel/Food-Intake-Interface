import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IntakeRecord } from '../../models/food-intake.model';
import { IntakeService } from '../../services/intake.service';

@Component({
  selector: 'app-print-all-intakes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './print-all-intakes.component.html',
  styleUrl: './print-all-intakes.component.scss',
})
export class PrintAllIntakesComponent implements OnInit {
  intakes: IntakeRecord[] = [];
  paginatedIntakes: IntakeRecord[] = [];
  loading: boolean = true;
  error: string | null = null;

  // Pagination properties
  currentPage = 1;
  pageSize = 6; // Items per page
  totalIntakes = 0;
  totalPages = 0;
  targetPage: number | null = null;

  // Selection
  selectedIntakes: Set<number> = new Set();

  constructor(private intakeService: IntakeService) {}

  ngOnInit(): void {
    this.loadAllIntakes();
  }

  loadAllIntakes(): void {
    this.loading = true;
    this.error = null;

    this.intakeService.getIntakes().subscribe({
      next: (response) => {
        this.intakes = response;
        console.log(this.intakes)
        this.totalIntakes = response.length;
        this.calculatePagination();
        this.updatePaginatedIntakes();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading intakes:', err);
        this.error = 'Failed to load intakes';
        this.loading = false;
      }
    });
  }

  formatDate(dateStr: string): Date {
    return new Date(dateStr.split('.')[0] + 'Z');
  }

  calculatePagination(): void {
    this.totalPages = Math.ceil(this.totalIntakes / this.pageSize);
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }
  }

  updatePaginatedIntakes(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedIntakes = this.intakes.slice(startIndex, endIndex);
  }

  // Selection Methods
  toggleIntakeSelection(intakeId: number, event?: any): void {
    if (this.selectedIntakes.has(intakeId)) {
      this.selectedIntakes.delete(intakeId);
    } else {
      this.selectedIntakes.add(intakeId);
    }
  }

  selectAllCurrentPage(): void {
    this.paginatedIntakes.forEach(intake => {
      this.selectedIntakes.add(intake.id);
    });
  }

  deselectAllCurrentPage(): void {
    this.paginatedIntakes.forEach(intake => {
      this.selectedIntakes.delete(intake.id);
    });
  }

  isAllCurrentPageSelected(): boolean {
    return this.paginatedIntakes.every(intake => this.selectedIntakes.has(intake.id));
  }

  isAnyCurrentPageSelected(): boolean {
    return this.paginatedIntakes.some(intake => this.selectedIntakes.has(intake.id));
  }

  clearSelection(): void {
    this.selectedIntakes.clear();
  }

  // Pagination Methods
  goToFirstPage(): void {
    this.currentPage = 1;
    this.updatePaginatedIntakes();
  }

  goToPreviousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePaginatedIntakes();
    }
  }

  goToNextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePaginatedIntakes();
    }
  }

  goToLastPage(): void {
    this.currentPage = this.totalPages;
    this.updatePaginatedIntakes();
  }

  goToPage(page: any): void {
    if (typeof page === 'number' && page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedIntakes();
    }
  }

  goToTargetPage(): void {
    if (this.targetPage && this.targetPage >= 1 && this.targetPage <= this.totalPages) {
      this.currentPage = this.targetPage;
      this.updatePaginatedIntakes();
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
    return Math.min(this.currentPage * this.pageSize, this.totalIntakes);
  }

  // Print Methods
  printAllIntakes(): void {
    const printWindow = window.open('', '', 'height=600,width=800');
    if (printWindow) {
      const intakeRows = this.intakes.map(i => `
        <tr>
          <td>${i.ltc_patient_detail?.room_number || '-'}</td>
          <td>${i.ltc_patient_detail?.bed_number || '-'}</td>
          <td>${i.ltc_patient_detail?.name || '-'}</td>
          <td>${i.meal_detail?.meal_name || '-'}</td>
          <td>${i.weight_g || '-'}</td>
          <td>${i.volume_ml || '-'}</td>
          <td>${new Date(i.recorded_at).toLocaleString()}</td>
        </tr>
      `).join('');

      const html = `
        <html>
          <head>
            <title>Intake Report</title>
            <style>
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #40C1AC; color: white; }
              h2 { text-align: center; }
            </style>
          </head>
          <body>
            <h2>Intake Report - ${new Date().toLocaleDateString()}</h2>
            <table>
              <thead>
                <tr>
                  <th>Room</th>
                  <th>Bed</th>
                  <th>Patient</th>
                  <th>Meal</th>
                  <th>Weight (g)</th>
                  <th>Volume (ml)</th>
                  <th>Recorded At</th>
                </tr>
              </thead>
              <tbody>
                ${intakeRows}
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

  printSelectedIntakes(): void {
    const selected = Array.from(this.selectedIntakes);
    const intakesToPrint = this.intakes.filter(i => selected.includes(i.id));

    const printWindow = window.open('', '', 'height=600,width=800');
    if (printWindow) {
      const intakeRows = intakesToPrint.map(i => `
        <tr>
          <td>${i.ltc_patient_detail?.room_number || '-'}</td>
          <td>${i.ltc_patient_detail?.bed_number || '-'}</td>
          <td>${i.ltc_patient_detail?.name || '-'}</td>
          <td>${i.meal_detail?.meal_name || '-'}</td>
          <td>${i.weight_g || '-'}</td>
          <td>${i.volume_ml || '-'}</td>
          <td>${new Date(i.recorded_at).toLocaleString()}</td>
        </tr>
      `).join('');

      const html = `
        <html>
          <head>
            <title>Intake Report - Selected</title>
            <style>
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #40C1AC; color: white; }
              h2 { text-align: center; }
            </style>
          </head>
          <body>
            <h2>Selected Intakes - ${new Date().toLocaleDateString()}</h2>
            <table>
              <thead>
                <tr>
                  <th>Room</th>
                  <th>Bed</th>
                  <th>Patient</th>
                  <th>Meal</th>
                  <th>Weight (g)</th>
                  <th>Volume (ml)</th>
                  <th>Recorded At</th>
                </tr>
              </thead>
              <tbody>
                ${intakeRows}
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
