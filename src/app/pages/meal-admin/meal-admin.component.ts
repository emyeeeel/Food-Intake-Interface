import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { saveAs } from 'file-saver';

import { MealsService, MergePreviewResponse } from '../../services/meals.service';
import { MealAssignmentService } from '../../services/meal-assignment.service';
import { IntakeService } from '../../services/intake.service';
import { DateService } from '../../services/date.service';
import { SettingsService } from '../../services/settings.service';
import { Meal, MenuMode } from '../../models/meal.model';
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
    private settingsService: SettingsService,
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
    this.clearSelection();
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

  // === Quick add (inline modal) ===

  showAddModal = false;
  addSaving = false;
  addError: string | null = null;
  addForm: {
    meal_name: string;
    meal_time: string;
    menu_mode: MenuMode;
    day_cycle: number | null;
    serve_date: string | null;
    plate_type: string;
  } = {
    meal_name: '',
    meal_time: '午餐',
    menu_mode: 'cyclic',
    day_cycle: 1,
    serve_date: null,
    plate_type: '',
  };

  readonly mealTimeOptions = ['午餐', '晚餐', '點心'];

  openAddModal(): void {
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    this.addForm = {
      meal_name: '',
      meal_time: '午餐',
      menu_mode: this.settingsService.menuMode,
      day_cycle: 1,
      serve_date: iso,
      plate_type: '',
    };
    this.addError = null;
    this.showAddModal = true;
  }

  closeAddModal(): void {
    if (this.addSaving) return;
    this.showAddModal = false;
    this.addError = null;
  }

  submitAdd(): void {
    const name = (this.addForm.meal_name || '').trim();
    if (!name) {
      this.addError = '請輸入菜名。';
      return;
    }
    if (this.addForm.menu_mode === 'cyclic' && (this.addForm.day_cycle == null || this.addForm.day_cycle < 1)) {
      this.addError = '循環模式需要輸入有效的天數（≥1）。';
      return;
    }
    if (this.addForm.menu_mode === 'open' && !this.addForm.serve_date) {
      this.addError = '開放模式需要選擇日期。';
      return;
    }

    const payload: any = {
      meal_name: name,
      meal_time: this.addForm.meal_time,
      menu_mode: this.addForm.menu_mode,
      plate_type: this.addForm.plate_type || null,
      ingredients: [],
    };
    if (this.addForm.menu_mode === 'cyclic') {
      payload.day_cycle = this.addForm.day_cycle;
      payload.serve_date = null;
    } else {
      payload.serve_date = this.addForm.serve_date;
      payload.day_cycle = null;
    }

    this.addSaving = true;
    this.addError = null;
    this.mealsService.addMeal(payload).subscribe({
      next: (created) => {
        this.addSaving = false;
        this.showAddModal = false;
        this.loadAll();
        const plateHint = created.plate_type ? `，餐盤 ${created.plate_type}` : '';
        alert(`新增成功：${created.meal_name}（#${created.id}）${plateHint}`);
      },
      error: (err) => {
        console.error('[MealAdmin] add failed:', err);
        this.addError = '新增失敗：' + (err?.error?.detail || err?.message || JSON.stringify(err?.error) || '未知錯誤');
        this.addSaving = false;
      },
    });
  }

  // === Multi-select (Phase 4 merge) ===

  selectedIds: Set<number> = new Set();

  toggleSelection(meal: Meal, event?: Event): void {
    if (event) event.stopPropagation();
    if (this.selectedIds.has(meal.id)) {
      this.selectedIds.delete(meal.id);
    } else {
      this.selectedIds.add(meal.id);
    }
  }

  isSelected(meal: Meal): boolean {
    return this.selectedIds.has(meal.id);
  }

  clearSelection(): void {
    this.selectedIds.clear();
  }

  get selectedCount(): number {
    return this.selectedIds.size;
  }

  get selectedMealsList(): Meal[] {
    return this.allMeals.filter(m => this.selectedIds.has(m.id));
  }

  // === Merge flow (Phase 4) ===

  showMergeModal = false;
  mergeStep: 'pick' | 'preview' = 'pick';
  mergeCanonicalId: number | null = null;
  mergePreviewData: MergePreviewResponse | null = null;
  mergePreviewLoading = false;
  mergeExecuting = false;
  mergeError: string | null = null;

  openMergeModal(): void {
    if (this.selectedIds.size < 2) {
      alert('請至少選 2 道菜才能合併。');
      return;
    }
    // Default canonical: first non-archived selected meal (or just first if all archived).
    const selected = this.selectedMealsList;
    const firstActive = selected.find(m => !m.is_archived);
    this.mergeCanonicalId = (firstActive ?? selected[0]).id;
    this.mergeStep = 'pick';
    this.mergePreviewData = null;
    this.mergeError = null;
    this.showMergeModal = true;
  }

  closeMergeModal(): void {
    if (this.mergeExecuting || this.mergePreviewLoading) return;
    this.showMergeModal = false;
    this.mergeCanonicalId = null;
    this.mergePreviewData = null;
    this.mergeError = null;
    this.mergeStep = 'pick';
  }

  setMergeCanonical(id: number): void {
    this.mergeCanonicalId = id;
    this.mergePreviewData = null;
    this.mergeError = null;
  }

  loadMergePreview(): void {
    if (this.mergeCanonicalId == null) {
      this.mergeError = '請先選一個 canonical（保留的菜）。';
      return;
    }
    const canonical = this.allMeals.find(m => m.id === this.mergeCanonicalId);
    if (canonical?.is_archived) {
      this.mergeError = 'canonical 不能是已停用的菜，請先啟用或換選另一道。';
      return;
    }
    const sources = Array.from(this.selectedIds).filter(id => id !== this.mergeCanonicalId);
    if (sources.length === 0) {
      this.mergeError = '需要至少 1 筆 source（canonical 以外的菜）。';
      return;
    }
    this.mergePreviewLoading = true;
    this.mergeError = null;
    this.mealsService.mergePreview(this.mergeCanonicalId, sources).subscribe({
      next: (res) => {
        this.mergePreviewData = res;
        this.mergeStep = 'preview';
        this.mergePreviewLoading = false;
      },
      error: (err) => {
        console.error('[MealAdmin] merge preview failed:', err);
        this.mergeError = err?.error?.detail || err?.message || '預覽失敗';
        this.mergePreviewLoading = false;
      },
    });
  }

  backToPickCanonical(): void {
    this.mergeStep = 'pick';
    this.mergePreviewData = null;
    this.mergeError = null;
  }

  executeMerge(): void {
    if (this.mergeCanonicalId == null || !this.mergePreviewData) return;
    const sources = this.mergePreviewData.sources.map(s => s.id);

    const ok = confirm(
      `最終確認：把 ${sources.length} 道菜合併進「${this.mergePreviewData.canonical.meal_name}」(#${this.mergePreviewData.canonical.id})？\n\n` +
      `會重新指派 ${this.mergePreviewData.impact.reassigned_assignments} 筆住民指派、${this.mergePreviewData.impact.reassigned_intakes} 筆攝取紀錄，` +
      `並永久刪除 ${this.mergePreviewData.impact.sources_to_delete} 道 source 菜色。\n\n此動作無法復原。`
    );
    if (!ok) return;

    this.mergeExecuting = true;
    this.mergeError = null;
    this.mealsService.mergeMeals(this.mergeCanonicalId, sources).subscribe({
      next: (res) => {
        this.mergeExecuting = false;
        this.showMergeModal = false;
        this.clearSelection();
        alert(
          `合併完成：刪除 ${res.deleted_meals} 道 source，` +
          `重新指派 ${res.reassigned_assignments} 筆指派 + ${res.reassigned_intakes} 筆攝取。`
        );
        this.loadAll();
      },
      error: (err) => {
        console.error('[MealAdmin] merge failed:', err);
        this.mergeError = err?.error?.detail || err?.message || '合併失敗';
        this.mergeExecuting = false;
      },
    });
  }

  // === Archive / Unarchive (Phase 2) ===

  archivingIds: Set<number> = new Set();
  deletingIds: Set<number> = new Set();

  isArchiving(meal: Meal): boolean {
    return this.archivingIds.has(meal.id);
  }

  isDeleting(meal: Meal): boolean {
    return this.deletingIds.has(meal.id);
  }

  /**
   * Whether a hard-delete button should be shown for this meal.
   * Two gates:
   *   - No archived rows (archive first, then the "undo" path is clearer)
   *   - Zero FoodIntakes (backend blocks anyway; hiding the button avoids a confusing 409)
   * Rows with assignments but no intakes CAN be deleted — user gets an extra confirm dialog.
   */
  canDelete(meal: Meal): boolean {
    if (meal.is_archived) return false;
    return this.getUsage(meal).intakes === 0;
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

  /**
   * Hard delete (Phase 3). Tiered confirmation:
   *   - intakes > 0: blocked by canDelete() gate, button shouldn't show at all.
   *     Backend also returns 409 if the UI gate somehow lies.
   *   - assignments > 0, intakes == 0: double-confirm. Explain the orphan impact.
   *   - zero usage: single confirm.
   * On success the row is removed from allMeals and the usage map.
   */
  deleteMeal(meal: Meal): void {
    if (this.deletingIds.has(meal.id)) return;

    const usage = this.getUsage(meal);

    if (usage.intakes > 0) {
      // Hard stop — backend would 409 anyway. Should never reach here if canDelete is honored.
      alert(`「${meal.meal_name}」有 ${usage.intakes} 筆攝取紀錄，不能刪除。請改用「停用」隱藏。`);
      return;
    }

    const code = this.getMealCode(meal);

    if (usage.assignments > 0) {
      const ok1 = confirm(
        `⚠️ 「${meal.meal_name}」(${code}) 有 ${usage.assignments} 筆住民指派連結。\n\n` +
        `刪除後這些指派會變成「孤兒」(meal=NULL)，住民那邊會看不到對應菜色。\n\n` +
        `要繼續嗎？（下一步還會再確認一次）`
      );
      if (!ok1) return;

      const ok2 = confirm(
        `再次確認：真的要刪除「${meal.meal_name}」嗎？此動作無法復原。\n\n` +
        `如果只是想隱藏不使用，建議改用「停用」。`
      );
      if (!ok2) return;
    } else {
      const ok = confirm(
        `確定刪除「${meal.meal_name}」(${code})？\n\n此動作無法復原。`
      );
      if (!ok) return;
    }

    this.deletingIds.add(meal.id);
    this.mealsService.deleteMeal(meal.id).subscribe({
      next: (res) => {
        this.allMeals = this.allMeals.filter(m => m.id !== meal.id);
        this.usageByMealId.delete(meal.id);
        this.selectedIds.delete(meal.id);
        this.deletingIds.delete(meal.id);
        this.applyFilter();
        const orphans = res?.orphaned_assignments ?? 0;
        if (orphans > 0) {
          alert(`已刪除。連帶 ${orphans} 筆指派變成孤兒（meal=NULL）。`);
        }
      },
      error: (err) => {
        console.error('[MealAdmin] delete failed:', err);
        this.deletingIds.delete(meal.id);
        const msg = err?.error?.detail || err?.message || '未知錯誤';
        if (err?.status === 409) {
          alert(`刪除被拒：${msg}`);
        } else {
          alert(`刪除失敗：${msg}`);
        }
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
