import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IntakeService } from '../../services/intake.service';
import { IntakeRecord } from '../../models/food-intake.model';
import { IntakeLogComponent } from '../intake-log/intake-log.component';
import { EstimationService } from '../../services/estimate.service';
import { EstimationResult } from '../../models/estimation.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-display-intake',
  imports: [CommonModule, IntakeLogComponent, FormsModule],
  templateUrl: './display-intake.component.html',
  styleUrls: ['./display-intake.component.scss']
})
export class DisplayIntakeComponent implements OnInit {

  volumeRecords: EstimationResult[] = [];
  intakes: IntakeRecord[] = [];
  combinedRecords: { intake: IntakeRecord; volumes: EstimationResult[] }[] = [];

  // Pagination
  currentPage = 1;
  pageSize = 2;
  totalPages = 0;
  paginatedRecords: { intake: IntakeRecord; volumes: EstimationResult[] }[] = [];

  isLoading = false;
  error: string | null = null;

  constructor(
    private intakeService: IntakeService,
    private estimateService: EstimationService
  ) {}

  ngOnInit(): void {
    this.loadIntakes();
  }

  loadIntakes(): void {
    this.isLoading = true;
    this.error = null;
    this.combinedRecords = [];

    this.intakeService.getIntakes().subscribe({
      next: (records) => {
        this.intakes = records;

        const filteredRecords = records.filter(r => r.depth_csv);
        let pending = filteredRecords.length;

        if (pending === 0) {
          this.isLoading = false;
          return;
        }

        filteredRecords.forEach((intake) => {
          this.estimateService.getResultsByIntakeId(intake.id).subscribe({
            next: (results: EstimationResult[]) => {
              const okResults = results.filter(r => r.status === 'OK');
              if (okResults.length > 0) {
                this.combinedRecords.push({ intake, volumes: okResults });
              }
              pending--;
              if (pending === 0) {
                this.combinedRecords.sort((a, b) => {
                  const dateA = new Date(a.intake.recorded_at).getTime();
                  const dateB = new Date(b.intake.recorded_at).getTime();
                  return dateB - dateA;
                });

                this.calculatePagination();
                this.updatePaginatedRecords();
                this.isLoading = false;
              }
            },
            error: () => {
              pending--;
              if (pending === 0) {
                this.calculatePagination();
                this.updatePaginatedRecords();
                this.isLoading = false;
              }
            }
          });
        });
      },
      error: (err) => {
        console.error('Failed to fetch intake records:', err);
        this.error = 'Failed to load intake records.';
        this.isLoading = false;
      }
    });
  }

  calculatePagination(): void {
    this.totalPages = Math.ceil(this.combinedRecords.length / this.pageSize);
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }
  }

  updatePaginatedRecords(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    this.paginatedRecords = this.combinedRecords.slice(start, start + this.pageSize);
  }

  goToPage(page: number | string): void {
    if (typeof page === 'number' && page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedRecords();
    }
  }

  formatPatientIdentifier(intake: IntakeRecord): string {
    const room = intake.ltc_patient_detail?.room_number;
    const bed = intake.ltc_patient_detail?.bed_number;

    if (!room && !bed) return '-';

    return `${room ?? ''}-${bed ?? ''}`;
  }

  goToFirstPage(): void { this.goToPage(1); }
  goToLastPage(): void { this.goToPage(this.totalPages); }
  goToNextPage(): void { if (this.currentPage < this.totalPages) this.goToPage(this.currentPage + 1); }
  goToPreviousPage(): void { if (this.currentPage > 1) this.goToPage(this.currentPage - 1); }

  getVisiblePages(): (number | string)[] {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (this.totalPages <= maxVisible) {
      for (let i = 1; i <= this.totalPages; i++) pages.push(i);
    } else {
      const half = Math.floor(maxVisible / 2);
      let start = Math.max(1, this.currentPage - half);
      let end = Math.min(this.totalPages, this.currentPage + half);

      if (this.currentPage <= half) end = maxVisible;
      else if (this.currentPage > this.totalPages - half) start = this.totalPages - maxVisible + 1;

      if (start > 1) { pages.push(1); if (start > 2) pages.push('...'); }
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < this.totalPages) { if (end < this.totalPages - 1) pages.push('...'); pages.push(this.totalPages); }
    }

    return pages;
  }

  getFormattedVolume(record: { volumes: EstimationResult[] }): string {
    const raw = record.volumes[0]?.total_volume_ml;
    if (raw == null) return '0';
    const num = parseFloat(raw as any);
    return isNaN(num) ? '0' : num.toFixed(2);
  }

  refreshRecords(): void {
    this.currentPage = 1;
    this.loadIntakes();
  }
}