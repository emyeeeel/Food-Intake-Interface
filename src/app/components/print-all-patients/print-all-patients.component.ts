import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LTCPatient } from '../../models/ltc-patient.model';
import { PatientService } from '../../services/patient.service';

@Component({
  selector: 'app-print-all-patients',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './print-all-patients.component.html',
  styleUrl: './print-all-patients.component.scss',
})
export class PrintAllPatientsComponent implements OnInit {
  patients: LTCPatient[] = [];
  paginatedPatients: LTCPatient[] = [];
  loading: boolean = true;
  error: string | null = null;

  // Pagination properties
  currentPage = 1;
  pageSize = 6; // Rows per page
  totalPatients = 0;
  totalPages = 0;
  targetPage: number | null = null;

  // Selection
  selectedPatients: Set<number> = new Set();

  constructor(private patientService: PatientService) {}

  ngOnInit(): void {
    this.loadAllPatients();
  }

  loadAllPatients(): void {
    this.loading = true;
    this.error = null;

    this.patientService.getLTCPatients().subscribe({
      next: (response) => {
        this.patients = response;
        this.totalPatients = response.length;
        this.calculatePagination();
        this.updatePaginatedPatients();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading patients:', err);
        this.error = 'Failed to load patients';
        this.loading = false;
      }
    });
  }

  calculatePagination(): void {
    this.totalPages = Math.ceil(this.totalPatients / this.pageSize);
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }
  }

  updatePaginatedPatients(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedPatients = this.patients.slice(startIndex, endIndex);
  }

  // Selection Methods
  togglePatientSelection(patientId: number, event?: any): void {
    if (this.selectedPatients.has(patientId)) {
      this.selectedPatients.delete(patientId);
    } else {
      this.selectedPatients.add(patientId);
    }
  }

  selectAllCurrentPage(): void {
    this.paginatedPatients.forEach(patient => {
      this.selectedPatients.add(patient.id);
    });
  }

  deselectAllCurrentPage(): void {
    this.paginatedPatients.forEach(patient => {
      this.selectedPatients.delete(patient.id);
    });
  }

  isAllCurrentPageSelected(): boolean {
    return this.paginatedPatients.every(patient => this.selectedPatients.has(patient.id));
  }

  isAnyCurrentPageSelected(): boolean {
    return this.paginatedPatients.some(patient => this.selectedPatients.has(patient.id));
  }

  clearSelection(): void {
    this.selectedPatients.clear();
  }

  // Pagination Methods
  goToFirstPage(): void {
    this.currentPage = 1;
    this.updatePaginatedPatients();
  }

  goToPreviousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePaginatedPatients();
    }
  }

  goToNextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePaginatedPatients();
    }
  }

  goToLastPage(): void {
    this.currentPage = this.totalPages;
    this.updatePaginatedPatients();
  }

  goToPage(page: any): void {
    if (typeof page === 'number' && page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedPatients();
    }
  }

  goToTargetPage(): void {
    if (this.targetPage && this.targetPage >= 1 && this.targetPage <= this.totalPages) {
      this.currentPage = this.targetPage;
      this.updatePaginatedPatients();
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
    return Math.min(this.currentPage * this.pageSize, this.totalPatients);
  }

  // Print Methods
  printAllPatients(): void {
    const printWindow = window.open('', '', 'height=600,width=800');
    if (printWindow) {
      const patientRows = this.patients.map(p => `
        <tr>
          <td>${p.room_number}</td>
          <td>${p.bed_number}</td>
          <td>${p.birthdate}</td>
          <td>${p.sex === 'M' ? 'Male' : p.sex === 'F' ? 'Female' : p.sex}</td>
          <td>${p.height_cm}</td>
          <td>${p.weight_kg}</td>
          <td>${p.activity_level}</td>
        </tr>
      `).join('');

      const html = `
        <html>
          <head>
            <title>Patient Report</title>
            <style>
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #40C1AC; color: white; }
              h2 { text-align: center; }
            </style>
          </head>
          <body>
            <h2>Patient Report - ${new Date().toLocaleDateString()}</h2>
            <table>
              <thead>
                <tr>
                  <th>Room</th>
                  <th>Bed</th>
                  <th>Age</th>
                  <th>Sex</th>
                  <th>Height (cm)</th>
                  <th>Weight (kg)</th>
                  <th>Activity Level</th>
                </tr>
              </thead>
              <tbody>
                ${patientRows}
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

  printSelectedPatients(): void {
    const selected = Array.from(this.selectedPatients);
    const patientsToPrint = this.patients.filter(p => selected.includes(p.id));

    const printWindow = window.open('', '', 'height=600,width=800');
    if (printWindow) {
      const patientRows = patientsToPrint.map(p => `
        <tr>
          <td>${p.room_number}</td>
          <td>${p.bed_number}</td>
          <td>${p.birthdate}</td>
          <td>${p.sex === 'M' ? 'Male' : p.sex === 'F' ? 'Female' : p.sex}</td>
          <td>${p.height_cm}</td>
          <td>${p.weight_kg}</td>
          <td>${p.activity_level}</td>
        </tr>
      `).join('');

      const html = `
        <html>
          <head>
            <title>Selected Patients Report</title>
            <style>
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #40C1AC; color: white; }
              h2 { text-align: center; }
            </style>
          </head>
          <body>
            <h2>Selected Patients Report - ${new Date().toLocaleDateString()}</h2>
            <table>
              <thead>
                <tr>
                  <th>Room</th>
                  <th>Bed</th>
                  <th>Age</th>
                  <th>Sex</th>
                  <th>Height (cm)</th>
                  <th>Weight (kg)</th>
                  <th>Activity Level</th>
                </tr>
              </thead>
              <tbody>
                ${patientRows}
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

  onKeyDown(event: KeyboardEvent): void {
    // Can add keyboard shortcuts here if needed
  }
}
