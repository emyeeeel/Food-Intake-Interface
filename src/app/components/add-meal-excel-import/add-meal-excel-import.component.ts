import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { Meal } from '../../models/meal.model';
import { MealsService } from '../../services/meals.service';
import { DateService } from '../../services/date.service';
import { SettingsService } from '../../services/settings.service';
import { toISODate, compactDate } from '../../utils/meal.utils';

@Component({
  selector: 'app-add-meal-excel-import',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './add-meal-excel-import.component.html',
  styleUrl: './add-meal-excel-import.component.scss',
})
export class AddMealExcelImportComponent {
  @Output() back = new EventEmitter<void>();

  selectedFile: File | null = null;
  isDragActive = false;
  isUploading = false;

  showModeMismatchModal = false;
  mismatchDetectedMode: 'cyclic' | 'open' | null = null;

  constructor(
    private mealsService: MealsService,
    private dateService: DateService,
    private settingsService: SettingsService,
    private router: Router,
  ) {}

  get menuMode(): 'cyclic' | 'open' {
    return this.dateService.getCurrentMenuMode();
  }

  get menuModeLabel(): string {
    return this.menuMode === 'open' ? '開放模式' : '循環模式';
  }

  onBackClick(): void {
    this.back.emit();
  }

  // === File handling ===

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.handleFile(target.files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragActive = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragActive = false;
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragActive = false;
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  handleFile(file: File): void {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (!allowedTypes.includes(file.type)) {
      alert('請選擇有效的Excel檔案 (.xlsx 或 .xls)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('檔案大小不能超過 10MB');
      return;
    }
    this.selectedFile = file;
  }

  removeFile(event: Event): void {
    event.stopPropagation();
    this.selectedFile = null;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // === Upload ===

  async uploadExcelFile(): Promise<void> {
    if (!this.selectedFile) return;

    const detected = await this.detectExcelMode(this.selectedFile);
    if (detected !== 'unknown' && detected !== this.menuMode) {
      this.mismatchDetectedMode = detected;
      this.showModeMismatchModal = true;
      return;
    }

    this.isUploading = true;

    const upload$ = this.menuMode === 'open'
      ? this.mealsService.addOpenMealCycle(this.selectedFile)
      : this.mealsService.updateMealCycle(this.selectedFile);

    upload$.subscribe({
      next: (response) => {
        this.isUploading = false;

        const created = response.created_count ?? 0;
        const updated = response.updated_count ?? 0;
        const noChanges = response.no_changes_count ?? 0;
        const skipped = response.skipped_count ?? 0;
        const excelDup = response.duplicate_in_excel_count ?? 0;
        const errors = response.error_count ?? 0;
        const totalIndiv = response.total_individual_meals ?? (created + updated + noChanges);

        let msg = '檔案上傳成功！\n\n';
        if (created) msg += `✓ 新增 ${created} 道菜色\n`;
        if (updated) msg += `✎ 更新 ${updated} 道菜色\n`;
        if (noChanges) msg += `= 既有 ${noChanges} 道菜色（內容相同，不變動）\n`;
        if (skipped) msg += `↷ 跳過 ${skipped} 筆（空行或 filter 不符）\n`;
        if (excelDup) msg += `⚠ Excel 內重複 ${excelDup} 筆\n`;
        if (errors) msg += `✗ 錯誤 ${errors} 筆\n`;

        if (!created && !updated && !errors && noChanges) {
          msg += '\n所有菜色都已存在於資料庫中，匯入動作對資料沒有實際改變。';
          msg += '\n（若你預期應該新增，請檢查 day_cycle / 餐期 / 菜名是否與既有資料相同。）';
        } else {
          msg += `\n共處理 ${totalIndiv} 筆菜色`;
        }

        alert(msg);
        setTimeout(() => this.router.navigate(['/meal-catalog']), 1000);
      },
      error: (error) => {
        this.isUploading = false;
        let msg = '檔案上傳失敗！\n\n';
        if (error.error?.message) {
          msg += error.error.message;
        } else {
          msg += '請檢查檔案格式是否正確\n確保所有必填欄位都已填寫';
        }
        alert(msg);
      },
    });
  }

  // === Mode-mismatch modal ===

  closeModeMismatchModal(): void {
    this.showModeMismatchModal = false;
    this.mismatchDetectedMode = null;
    this.selectedFile = null;
  }

  downloadTemplateFromMismatch(): void {
    this.downloadTemplate();
  }

  modeLabel(mode: 'cyclic' | 'open' | null): string {
    if (mode === 'cyclic') return '循環模式';
    if (mode === 'open') return '開放模式';
    return '未知';
  }

  // === Template download ===

  downloadTemplate(): void {
    if (this.menuMode === 'open') {
      this.downloadOpenTemplate();
    } else {
      this.downloadCyclicTemplate();
    }
  }

  private buildTemplateFilename(): string {
    const dateStr = compactDate(toISODate(this.dateService.getTodayDate()));
    const center = this.settingsService.careCenterName || '長照中心';
    const modeLabel = this.menuMode === 'open' ? '開放' : '循環';
    return `${center}-菜單-${modeLabel}-${dateStr}.xlsx`;
  }

  private downloadCyclicTemplate(): void {
    const filename = this.buildTemplateFilename();
    this.mealsService.getMealsFiltered({ menu_mode: 'cyclic' }).subscribe({
      next: (allMeals: Meal[]) => {
        const data: any[] = [];
        for (let day = 1; day <= 7; day++) {
          const dateStr = toISODate(this.dateService.getDateForCycleDay(day));
          for (const mealTime of ['午餐', '晚餐']) {
            const names = allMeals
              .filter(m => String(m.day_cycle) === String(day) && m.meal_time === mealTime)
              .map(m => m.meal_name).filter(n => n?.trim()).join(', ');
            data.push({ '日期': dateStr, '日週期': day, '用餐時間': mealTime, '菜色名稱': names || '請填入菜色名稱' });
          }
        }
        this.exportTemplateExcel(data, filename, 'cyclic');
      },
      error: () => {
        const data: any[] = [];
        for (let day = 1; day <= 7; day++) {
          const dateStr = toISODate(this.dateService.getDateForCycleDay(day));
          for (const mealTime of ['午餐', '晚餐']) {
            data.push({ '日期': dateStr, '日週期': day, '用餐時間': mealTime, '菜色名稱': '請填入菜色名稱' });
          }
        }
        this.exportTemplateExcel(data, filename, 'cyclic');
      },
    });
  }

  private downloadOpenTemplate(): void {
    const filename = this.buildTemplateFilename();
    const today = this.dateService.getTodayDate();
    const data: any[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const iso = toISODate(d);
      for (const mealTime of ['午餐', '晚餐']) {
        data.push({ '日期': iso, '用餐時間': mealTime, '菜色名稱': '請填入菜色名稱' });
      }
    }
    this.exportTemplateExcel(data, filename, 'open');
  }

  private exportTemplateExcel(data: any[], filename: string, mode: 'cyclic' | 'open'): void {
    import('xlsx').then(XLSX => {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      ws['!cols'] = mode === 'open'
        ? [{ wch: 12 }, { wch: 15 }, { wch: 60 }]
        : [{ wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 60 }];
      const sheetName = mode === 'open' ? '開放菜單' : '7天循環菜單';
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([buf], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      import('file-saver').then(fs => fs.saveAs(blob, filename));
    });
  }

  private async detectExcelMode(file: File): Promise<'cyclic' | 'open' | 'unknown'> {
    const XLSX = await import('xlsx');
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const firstSheet = wb.SheetNames[0];
    if (!firstSheet) return 'unknown';
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[firstSheet], { header: 1 }) as any[][];
    if (!rows.length) return 'unknown';
    const headers = (rows[0] || []).map((h: any) => String(h ?? '').trim());
    if (headers.includes('日週期')) return 'cyclic';
    if (headers.includes('日期') && headers.includes('用餐時間') && headers.includes('菜色名稱')) return 'open';
    return 'unknown';
  }
}
