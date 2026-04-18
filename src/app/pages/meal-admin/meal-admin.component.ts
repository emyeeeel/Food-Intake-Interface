import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { saveAs } from 'file-saver';

import { MealsService } from '../../services/meals.service';
import { MealAssignmentService } from '../../services/meal-assignment.service';
import { IntakeService } from '../../services/intake.service';
import { DateService } from '../../services/date.service';
import { Meal } from '../../models/meal.model';
import { PlateTypeLabelPipe } from '../../pipes/plate-type-label.pipe';

/**
 * MVP scope (Phase 1, 2026-04-18):
 *  - List all meals (cyclic + open) with search + sort + pagination
 *  - Usage count per meal (assignments + intakes), aggregated client-side
 *  - Inline edit of meal_name and plate_type (PATCH via existing endpoint)
 *
 * Deferred (see HANDOVER §2):
 *  - Archive / unarchive   (needs Meal.is_archived migration)
 *  - Hard delete           (needs cascade safety + usage-count gate)
 *  - Merge duplicates      (needs new backend endpoint)
 */

interface UsageCount {
  assignments: number;
  intakes: number;
}

type SortField = 'id' | 'menu_mode' | 'meal_name' | 'meal_time' | 'day_or_date' | 'plate_type' | 'usage' | 'updated_at';

@Component({
  selector: 'app-meal-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PlateTypeLabelPipe],
  templateUrl: './meal-admin.component.html',
  styleUrl: './meal-admin.component.scss',
})
export class MealAdminComponent implements OnInit {
  loading = true;
  loadError: string | null = null;

  allMeals: Meal[] = [];
  filteredMeals: Meal[] = [];
  paginatedMeals: Meal[] = [];
  usageByMealId: Map<number, UsageCount> = new Map();

  // Filters / sort / paging
  searchQuery = '';
  modeFilter: '' | 'cyclic' | 'open' = '';
  archiveFilter: 'active' | 'archived' | 'all' = 'active';  // Phase 2: default hides archived
  sortField: SortField = 'id';
  sortAsc = true;

  currentPage = 1;
  pageSize = 20;
  pageSizeOptions = [10, 20, 50, 100];

  // Inline edit state
  editingMealId: number | null = null;
  editBuffer: { meal_name: string; plate_type: string } = { meal_name: '', plate_type: '' };
  savingIds: Set<number> = new Set();
  editError: string | null = null;

  plateTypeOptions = [
    { value: '金属板', label: '金屬鐵盤' },
    { value: '金属碗', label: '金屬碗' },
    { value: '陶瓷碗', label: '陶瓷碗' },
  ];

  constructor(
    private mealsService: MealsService,
    private mealAssignmentService: MealAssignmentService,
    private intakeService: IntakeService,
    private dateService: DateService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadAll();
  }

  // === Data loading ===

  loadAll(): void {
    this.loading = true;
    this.loadError = null;

    forkJoin({
      meals: this.mealsService.getMeals(),
      assignments: this.mealAssignmentService.getMealAssignmentsWithRawFilters({}),
      intakes: this.intakeService.getIntakes(),
    }).subscribe({
      next: ({ meals, assignments, intakes }) => {
        this.allMeals = meals;
        this.usageByMealId = this.buildUsageCounts(assignments, intakes);
        this.applyFilter();
        this.loading = false;
      },
      error: (err) => {
        console.error('[MealAdmin] load failed:', err);
        this.loadError = '資料載入失敗，請重試。';
        this.loading = false;
      },
    });
  }

  private buildUsageCounts(assignments: any[], intakes: any[]): Map<number, UsageCount> {
    const map = new Map<number, UsageCount>();

    const bump = (mealId: number | null | undefined, key: keyof UsageCount) => {
      if (mealId == null) return;
      const existing = map.get(mealId) ?? { assignments: 0, intakes: 0 };
      existing[key] += 1;
      map.set(mealId, existing);
    };

    for (const a of assignments ?? []) {
      bump(a?.meal ?? a?.meal_detail?.id ?? null, 'assignments');
    }
    for (const i of intakes ?? []) {
      bump(i?.meal ?? i?.meal_detail?.id ?? null, 'intakes');
    }

    return map;
  }

  refresh(): void {
    this.cancelEdit();
    this.loadAll();
  }

  // === Filter / sort / paginate ===

  applyFilter(): void {
    let result = [...this.allMeals];

    // Archive filter
    if (this.archiveFilter === 'active') {
      result = result.filter(m => !m.is_archived);
    } else if (this.archiveFilter === 'archived') {
      result = result.filter(m => !!m.is_archived);
    }
    // 'all' = no archive filtering

    // Mode filter
    if (this.modeFilter) {
      result = result.filter(m => (m.menu_mode ?? 'cyclic') === this.modeFilter);
    }

    // Search query
    const q = (this.searchQuery || '').trim().toLowerCase();
    if (q) {
      result = result.filter(m => {
        const name = (m.meal_name || '').toLowerCase();
        const code = this.getMealCode(m).toLowerCase();
        const dayOrDate = this.getDayOrDate(m).toLowerCase();
        return name.includes(q) || code.includes(q) || dayOrDate.includes(q);
      });
    }

    // Sort
    result.sort((a, b) => {
      const cmp = this.compareBy(a, b, this.sortField);
      return this.sortAsc ? cmp : -cmp;
    });

    this.filteredMeals = result;
    this.currentPage = 1;
    this.paginate();
  }

  private compareBy(a: Meal, b: Meal, field: SortField): number {
    switch (field) {
      case 'id':
        return (a.id ?? 0) - (b.id ?? 0);
      case 'menu_mode':
        return (a.menu_mode ?? 'cyclic').localeCompare(b.menu_mode ?? 'cyclic');
      case 'meal_name':
        return (a.meal_name ?? '').localeCompare(b.meal_name ?? '', 'zh-Hant');
      case 'meal_time':
        return (a.meal_time ?? '').localeCompare(b.meal_time ?? '');
      case 'day_or_date':
        return this.getDayOrDate(a).localeCompare(this.getDayOrDate(b));
      case 'plate_type':
        return (a.plate_type ?? '').localeCompare(b.plate_type ?? '');
      case 'usage':
        return this.totalUsage(a) - this.totalUsage(b);
      case 'updated_at':
        return (a.updated_at ?? '').localeCompare(b.updated_at ?? '');
    }
  }

  setSort(field: SortField): void {
    if (this.sortField === field) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortField = field;
      this.sortAsc = true;
    }
    this.applyFilter();
  }

  sortIndicator(field: SortField): string {
    if (this.sortField !== field) return '';
    return this.sortAsc ? ' ▲' : ' ▼';
  }

  paginate(): void {
    const total = this.filteredMeals.length;
    const maxPage = Math.max(1, Math.ceil(total / this.pageSize));
    if (this.currentPage > maxPage) this.currentPage = maxPage;
    const start = (this.currentPage - 1) * this.pageSize;
    this.paginatedMeals = this.filteredMeals.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredMeals.length / this.pageSize));
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages) return;
    this.currentPage = p;
    this.paginate();
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.paginate();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.modeFilter = '';
    this.applyFilter();
  }

  clearSearchOnly(): void {
    this.searchQuery = '';
    this.applyFilter();
  }

  setModeFilter(mode: '' | 'cyclic' | 'open'): void {
    this.modeFilter = mode;
    this.applyFilter();
  }

  setArchiveFilter(f: 'active' | 'archived' | 'all'): void {
    this.archiveFilter = f;
    this.applyFilter();
  }

  // === Display helpers ===

  /** "L-1-231" for cyclic, "L-20260420-286" for open. Matches show-meal/edit-meal. */
  getMealCode(meal: Meal): string {
    const timeMap: Record<string, string> = { '午餐': 'L', '晚餐': 'D', '點心': 'S' };
    const letter = timeMap[meal.meal_time] || 'U';
    const mode = meal.menu_mode ?? 'cyclic';
    if (mode === 'open' && meal.serve_date) {
      return `${letter}-${meal.serve_date.replace(/-/g, '')}-${meal.id}`;
    }
    return `${letter}-${meal.day_cycle ?? '?'}-${meal.id}`;
  }

  /** "第 3 天" for cyclic, "2026-04-20 (週一)" for open. */
  getDayOrDate(meal: Meal): string {
    const mode = meal.menu_mode ?? 'cyclic';
    if (mode === 'open' && meal.serve_date) {
      return `${meal.serve_date} (${this.dateService.getWeekdayLabel(meal.serve_date)})`;
    }
    return `第 ${meal.day_cycle ?? '?'} 天`;
  }

  getUsage(meal: Meal): UsageCount {
    return this.usageByMealId.get(meal.id) ?? { assignments: 0, intakes: 0 };
  }

  totalUsage(meal: Meal): number {
    const u = this.getUsage(meal);
    return u.assignments + u.intakes;
  }

  /** "0 筆" when unused (deletable in future). Intakes > 0 means meal has real intake history. */
  isHighRiskMeal(meal: Meal): boolean {
    return this.getUsage(meal).intakes > 0;
  }

  formatUpdatedAt(meal: Meal): string {
    if (!meal.updated_at) return '-';
    const d = new Date(meal.updated_at);
    if (isNaN(d.getTime())) return meal.updated_at;
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  }

  // === Inline edit ===

  startEdit(meal: Meal): void {
    if (this.editingMealId !== null && this.editingMealId !== meal.id) {
      // Silently discard other row's unsaved changes; keep UX simple.
    }
    this.editError = null;
    this.editingMealId = meal.id;
    this.editBuffer = {
      meal_name: meal.meal_name ?? '',
      plate_type: meal.plate_type ?? '金属板',
    };
  }

  cancelEdit(): void {
    this.editingMealId = null;
    this.editError = null;
    this.editBuffer = { meal_name: '', plate_type: '' };
  }

  saveEdit(meal: Meal): void {
    const name = (this.editBuffer.meal_name || '').trim();
    if (!name) {
      this.editError = '菜名不可為空。';
      return;
    }
    if (!this.editBuffer.plate_type) {
      this.editError = '請選擇餐盤類型。';
      return;
    }

    this.savingIds.add(meal.id);
    this.editError = null;

    this.mealsService.updateMealJson(meal.id, {
      meal_name: name,
      plate_type: this.editBuffer.plate_type,
    }).subscribe({
      next: (updated) => {
        // Patch the in-memory meal so the table updates without full reload.
        const idx = this.allMeals.findIndex(m => m.id === meal.id);
        if (idx !== -1) {
          this.allMeals[idx] = { ...this.allMeals[idx], ...updated };
        }
        this.savingIds.delete(meal.id);
        this.cancelEdit();
        this.applyFilter();
      },
      error: (err) => {
        console.error('[MealAdmin] save failed:', err);
        this.editError = '儲存失敗：' + (err?.error?.detail || err?.message || '未知錯誤');
        this.savingIds.delete(meal.id);
      },
    });
  }

  isEditing(meal: Meal): boolean {
    return this.editingMealId === meal.id;
  }

  isSaving(meal: Meal): boolean {
    return this.savingIds.has(meal.id);
  }

  // === CSV export ===

  /**
   * Export current filtered/sorted list to CSV. Respects search + mode + archive filters,
   * so users can export "unused" subset, "archived" subset, etc. by filtering first.
   * UTF-8 BOM prefix for Excel-on-Windows compatibility.
   */
  exportCSV(): void {
    if (!this.filteredMeals.length) return;

    const plateLabel = (v: string | null | undefined): string => {
      const match = this.plateTypeOptions.find(p => p.value === v);
      return match ? match.label : (v ?? '');
    };

    const header = ['代碼', '模式', '菜名', '餐期', '日期/天數', '餐盤', '指派數', '攝取數', '更新時間', '狀態'];
    const rows = this.filteredMeals.map(m => {
      const u = this.getUsage(m);
      return [
        this.getMealCode(m),
        (m.menu_mode ?? 'cyclic') === 'open' ? '開放' : '循環',
        m.meal_name ?? '',
        m.meal_time ?? '',
        this.getDayOrDate(m),
        plateLabel(m.plate_type),
        String(u.assignments),
        String(u.intakes),
        this.formatUpdatedAt(m),
        m.is_archived ? '停用中' : '使用中',
      ];
    });

    const esc = (v: string) => {
      if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
      return v;
    };
    const csv = [header, ...rows].map(r => r.map(esc).join(',')).join('\r\n');
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });

    const ts = new Date();
    const stamp = `${ts.getFullYear()}${String(ts.getMonth() + 1).padStart(2, '0')}${String(ts.getDate()).padStart(2, '0')}-${String(ts.getHours()).padStart(2, '0')}${String(ts.getMinutes()).padStart(2, '0')}`;
    saveAs(blob, `菜色管理-${stamp}.csv`);
  }

  // === Navigation ===

  goBackToEngineering(): void {
    this.router.navigate(['/engineering']);
  }

  // === Archive / Unarchive (Phase 2) ===

  archivingIds: Set<number> = new Set();

  isArchiving(meal: Meal): boolean {
    return this.archivingIds.has(meal.id);
  }

  archiveMeal(meal: Meal): void {
    if (this.archivingIds.has(meal.id)) return;
    if (!confirm(`停用「${meal.meal_name}」？既有指派與攝取紀錄不受影響，可以隨時啟用。`)) return;

    this.archivingIds.add(meal.id);
    this.mealsService.archiveMeal(meal.id).subscribe({
      next: (res) => {
        const idx = this.allMeals.findIndex(m => m.id === meal.id);
        if (idx !== -1) {
          this.allMeals[idx] = { ...this.allMeals[idx], is_archived: res.is_archived };
        }
        this.archivingIds.delete(meal.id);
        this.applyFilter();
      },
      error: (err) => {
        console.error('[MealAdmin] archive failed:', err);
        alert('停用失敗：' + (err?.error?.detail || err?.message || '未知錯誤'));
        this.archivingIds.delete(meal.id);
      },
    });
  }

  unarchiveMeal(meal: Meal): void {
    if (this.archivingIds.has(meal.id)) return;

    this.archivingIds.add(meal.id);
    this.mealsService.unarchiveMeal(meal.id).subscribe({
      next: (res) => {
        const idx = this.allMeals.findIndex(m => m.id === meal.id);
        if (idx !== -1) {
          this.allMeals[idx] = { ...this.allMeals[idx], is_archived: res.is_archived };
        }
        this.archivingIds.delete(meal.id);
        this.applyFilter();
      },
      error: (err) => {
        console.error('[MealAdmin] unarchive failed:', err);
        alert('啟用失敗：' + (err?.error?.detail || err?.message || '未知錯誤'));
        this.archivingIds.delete(meal.id);
      },
    });
  }

  // === Stats helpers for header ===

  get totalCount(): number { return this.allMeals.length; }
  get activeCount(): number { return this.allMeals.filter(m => !m.is_archived).length; }
  get archivedCount(): number { return this.allMeals.filter(m => !!m.is_archived).length; }
  get cyclicCount(): number { return this.allMeals.filter(m => (m.menu_mode ?? 'cyclic') === 'cyclic').length; }
  get openCount(): number { return this.allMeals.filter(m => m.menu_mode === 'open').length; }
  get unusedCount(): number { return this.allMeals.filter(m => this.totalUsage(m) === 0 && !m.is_archived).length; }
  get highRiskCount(): number { return this.allMeals.filter(m => this.isHighRiskMeal(m)).length; }
}
