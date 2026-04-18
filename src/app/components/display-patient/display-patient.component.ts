import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
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
  @ViewChild('residentExcelInput') residentExcelInput?: ElementRef<HTMLInputElement>;

  patients: LTCPatient[] = [];
  paginatedPatients: LTCPatient[] = [];
  isLoading = false;
  error: string | null = null;
  deletingPatientId: number | null = null;

  uploadInProgress = false;
  importInProgress = false;
  uploadedExcelName = '';
  excelStatusMessage = '';
  excelStatusType: 'success' | 'error' | 'info' | null = null;

  currentPage = 1;
  pageSize = 7;
  totalPatients = 0;
  totalPages = 0;
  targetPage: number | null = null;

  searchTerm = '';
  filterSex = '';

  constructor(private patientService: PatientService) {}

  downloadTemplate(): void {
    import('xlsx').then(XLSX => {
      const header1 = ['住民資料導入(Inpatient)'];
      const header2 = ['住民ID(床號)', '姓名', '民國/西元年', '生日', '年齡', '性別', '身高', '體重', '活動量', '食物過敏原限制'];
      const example = ['101-01', '王小明', '西元年', '1950-01-15', '', '男', '160', '55', '低活動量', ''];

      const ws = XLSX.utils.aoa_to_sheet([header1, header2, example]);
      ws['!cols'] = [
        { wch: 15 }, // 住民ID
        { wch: 10 }, // 姓名
        { wch: 12 }, // 民國/西元年
        { wch: 14 }, // 生日
        { wch: 6 },  // 年齡
        { wch: 6 },  // 性別
        { wch: 6 },  // 身高
        { wch: 6 },  // 體重
        { wch: 12 }, // 活動量
        { wch: 16 }, // 食物過敏原
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '工作表1');

      const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([buf], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      import('file-saver').then(fs => {
        fs.saveAs(blob, '住民名單資料住宿範本.xlsx');
      });
    });
  }

  ngOnInit(): void {
    this.getPatients();
  }

  getPatients(): void {
    this.isLoading = true;
    this.error = null;

    this.patientService.getLTCPatients().subscribe({
      next: (patients: LTCPatient[]) => {
        this.patients = patients;
        this.calculatePagination();
        this.updatePaginatedPatients();
        this.isLoading = false;
      },
      error: () => {
        this.error = '載入住民資料失敗。';
        this.isLoading = false;
      }
    });
  }

  openExcelPicker(): void {
    this.residentExcelInput?.nativeElement.click();
  }

  onResidentExcelSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.uploadInProgress = true;
    this.excelStatusMessage = '';
    this.excelStatusType = null;

    this.patientService.uploadResidentExcel(file).subscribe({
      next: (response) => {
        this.uploadedExcelName = response.filename;
        this.excelStatusType = 'success';
        this.excelStatusMessage = `已上傳：${response.filename}`;
        this.uploadInProgress = false;
        input.value = '';
      },
      error: () => {
        this.excelStatusType = 'error';
        this.excelStatusMessage = 'Excel 上傳失敗，請稍後再試。';
        this.uploadInProgress = false;
        input.value = '';
      }
    });
  }

  importResidentExcel(): void {
    this.importInProgress = true;
    this.excelStatusMessage = '';
    this.excelStatusType = null;

    this.patientService.importResidentExcel().subscribe({
      next: (response) => {
        const { created, updated, skipped } = response.summary;
        this.excelStatusType = 'success';
        this.excelStatusMessage = `匯入完成：新增 ${created} 筆、更新 ${updated} 筆、略過 ${skipped} 筆。`;
        this.importInProgress = false;
        this.getPatients();
      },
      error: () => {
        this.excelStatusType = 'error';
        this.excelStatusMessage = '匯入 Excel 失敗，請先確認是否已上傳檔案。';
        this.importInProgress = false;
      }
    });
  }

  deletePatient(patient: LTCPatient): void {
    const patientLabel = `${patient.room_number}-${patient.bed_number}`;
    const patientName = patient.name ? `（${patient.name}）` : '';
    const confirmed = window.confirm(`確定要刪除住民 ${patientLabel}${patientName} 嗎？此動作無法復原。`);

    if (!confirmed) {
      return;
    }

    this.deletingPatientId = patient.id;
    this.error = null;

    this.patientService.deleteLTCPatient(patient.id).subscribe({
      next: () => {
        this.patients = this.patients.filter((item) => item.id !== patient.id);
        this.calculatePagination();
        this.updatePaginatedPatients();
        this.deletingPatientId = null;
      },
      error: () => {
        this.error = '刪除住民失敗，請稍後再試。';
        this.deletingPatientId = null;
      }
    });
  }

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
    return this.patients.filter((patient) => {
      const matchesSearch = this.searchTerm === ''
        || patient.room_number.toLowerCase().includes(this.searchTerm.toLowerCase())
        || patient.bed_number.toLowerCase().includes(this.searchTerm.toLowerCase())
        || (patient.name || '').toLowerCase().includes(this.searchTerm.toLowerCase());

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
      this.currentPage += 1;
      this.updatePaginatedPatients();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage -= 1;
      this.updatePaginatedPatients();
    }
  }

  jumpToPage(): void {
    if (this.targetPage !== null) {
      this.goToPage(this.targetPage);
      this.targetPage = null;
    }
  }

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

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
    const endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let page = startPage; page <= endPage; page += 1) {
      pages.push(page);
    }

    return pages;
  }
}
