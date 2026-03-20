import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LTCPatient } from '../../models/ltc-patient.model';
import { PatientService } from '../../services/patient.service';

@Component({
  selector: 'app-display-patient',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './display-patient.component.html',
  styleUrl: './display-patient.component.scss',
})
export class DisplayPatientComponent implements OnInit {
  patients: LTCPatient[] = [];
  paginatedPatients: LTCPatient[] = [];
  isLoading = false;
  error: string | null = null;

  // Pagination properties
  currentPage = 1;
  pageSize = 7;
  totalPatients = 0;
  totalPages = 0;
  targetPage: number | null = null;

  // Search and filter
  searchTerm: string = '';
  filterSex: string = '';

  constructor(private patientService: PatientService) {}

  ngOnInit(): void {
    this.getPatients();
  }

  getPatients(): void {
    this.isLoading = true;
    this.error = null;

    this.patientService.getLTCPatients().subscribe({
      next: (patients: LTCPatient[]) => {
        this.patients = patients;
        this.totalPatients = patients.length;
        this.calculatePagination();
        this.updatePaginatedPatients();

        console.log('Patients loaded successfully:', patients);
        console.log(`Total patients count: ${patients.length}`);
        console.log(`Displaying ${this.pageSize} patients per page`);

        // Log detailed patient information
        patients.forEach((patient, index) => {
          console.log(`Patient ${index + 1}:`, {
            id: patient.id,
            room_number: patient.room_number,
            bed_number: patient.bed_number,
            age: patient.age,
            sex: patient.sex,
            height_cm: patient.height_cm,
            weight_kg: patient.weight_kg,
            activity_level: patient.activity_level,
          });
        });

        this.isLoading = false;
      },
      error: (error) => {
        this.error = 'Failed to load patients';
        console.error('Error loading patients:', error);
        console.error('Error details:', {
          message: error.message,
          status: error.status,
          url: error.url
        });
        this.isLoading = false;
      },
      complete: () => {
        console.log('Patients loading completed');
      }
    });
  }

  // Pagination methods
  calculatePagination(): void {
    const filteredPatients = this.getFilteredPatients();
    this.totalPatients = filteredPatients.length;
    this.totalPages = Math.ceil(this.totalPatients / this.pageSize);
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }
  }

  updatePaginatedPatients(): void {
    const filteredPatients = this.getFilteredPatients();
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedPatients = filteredPatients.slice(startIndex, endIndex);
  }

  getFilteredPatients(): LTCPatient[] {
    return this.patients.filter(patient => {
      const matchesSearch = this.searchTerm === '' || 
        patient.room_number.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        patient.bed_number.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const matchesFilter = this.filterSex === '' || patient.sex === this.filterSex;
      
      return matchesSearch && matchesFilter;
    });
  }

  goToPage(pageNumber: number): void {
    if (pageNumber >= 1 && pageNumber <= this.totalPages) {
      this.currentPage = pageNumber;
      this.updatePaginatedPatients();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePaginatedPatients();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePaginatedPatients();
    }
  }

  jumpToPage(): void {
    if (this.targetPage !== null) {
      this.goToPage(this.targetPage);
      this.targetPage = null;
    }
  }

  // Search and Filter Methods
  onSearchChange(): void {
    this.currentPage = 1;
    this.calculatePagination();
    this.updatePaginatedPatients();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.calculatePagination();
    this.updatePaginatedPatients();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.filterSex = '';
    this.currentPage = 1;
    this.calculatePagination();
    this.updatePaginatedPatients();
  }

  // Get page numbers for pagination display
  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }
}
