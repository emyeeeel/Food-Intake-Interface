import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { Meal } from '../../models/meal.model';
import {
  MEAL_TIME_OPTIONS,
  DAY_CYCLE_OPTIONS,
  PLATE_TYPE_OPTIONS,
} from '../../models/meal-constants';
import { MealsService } from '../../services/meals.service';
import { DateService } from '../../services/date.service';
import { SettingsService } from '../../services/settings.service';
import { BulkAssignResponse } from '../../services/meal-assignment.service';
import { AssignMealDialogComponent } from '../assign-meal-dialog/assign-meal-dialog.component';

/**
 * Single-/batch-add dish form. The + button inserts a new empty slot below;
 * × removes that slot (disabled when only one remains). All non-empty names
 * submit in one batch sharing the same 餐期 / 天數·日期 / 餐盤 fields, and
 * after success the assign-to-residents dialog opens automatically.
 *
 * Split out of add-meal in Phase 8.
 */
@Component({
  selector: 'app-add-meal-form',
  standalone: true,
  imports: [CommonModule, FormsModule, AssignMealDialogComponent],
  templateUrl: './add-meal-form.component.html',
  styleUrl: './add-meal-form.component.scss',
})
export class AddMealFormComponent implements OnInit {
  @Output() back = new EventEmitter<void>();

  readonly mealTimeOptions = MEAL_TIME_OPTIONS;
  readonly dayCycleOptions = DAY_CYCLE_OPTIONS;
  readonly plateTypeOptions = PLATE_TYPE_OPTIONS;

  meal: Partial<Meal> = {
    meal_name: '',
    meal_time: '',
    day_cycle: undefined,
    serve_date: undefined,
    plate_type: '',
    ingredients: [] as number[],
  };

  mealNames: string[] = [''];
  isSubmitting = false;

  knownMealNames: Set<string> = new Set();
  nameConfirmed = false;
  showNewNameDialog = false;
  pendingNewNameText = '';

  serveDateOptions: { value: string; label: string }[] = [];
  loadingServeDates = false;

  assignDialogOpen = false;
  assignDialogMeals: Meal[] = [];

  constructor(
    private mealsService: MealsService,
    private dateService: DateService,
    private settingsService: SettingsService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadServeDateOptionsIfNeeded();
    this.loadKnownMealNames();
  }

  get menuMode(): 'cyclic' | 'open' {
    return this.dateService.getCurrentMenuMode();
  }

  get menuModeLabel(): string {
    return this.menuMode === 'open' ? '開放模式' : '循環模式';
  }

  get filledNameCount(): number {
    return this.mealNames.reduce((acc, n) => acc + ((n || '').trim() ? 1 : 0), 0);
  }

  trackByIndex(index: number): number { return index; }

  // === Dish-name dynamic list ===

  addMealNameAt(index: number): void {
    this.mealNames.splice(index + 1, 0, '');
    setTimeout(() => {
      const inputs = document.querySelectorAll<HTMLInputElement>('.meal-name-input');
      inputs[index + 1]?.focus();
    }, 0);
  }

  removeMealNameAt(index: number): void {
    if (this.mealNames.length <= 1) return;
    this.mealNames.splice(index, 1);
  }

  /**
   * Enter adds a new row below and jumps focus there. Does NOT submit — submit
   * is only via the explicit bottom button so users don't accidentally POST
   * before filling 餐期 / 日期.
   */
  onMealNameEnter(index: number, event: Event): void {
    event.preventDefault();
    const isLast = index === this.mealNames.length - 1;
    const currentEmpty = !(this.mealNames[index] || '').trim();
    if (isLast && currentEmpty) return;
    if (isLast) {
      this.addMealNameAt(index);
    } else {
      setTimeout(() => {
        const inputs = document.querySelectorAll<HTMLInputElement>('.meal-name-input');
        inputs[index + 1]?.focus();
      }, 0);
    }
  }

  // === New-name confirmation dialog (fires on blur of legacy single-name field) ===

  onMealNameInput(): void {
    this.nameConfirmed = false;
  }

  onMealNameBlur(): void {
    const name = (this.meal.meal_name || '').trim();
    if (!name) return;
    if (this.knownMealNames.has(name)) return;
    if (this.nameConfirmed) return;
    this.pendingNewNameText = name;
    this.showNewNameDialog = true;
  }

  confirmNewName(): void {
    this.nameConfirmed = true;
    this.closeNewNameDialog();
  }

  rejectNewName(): void {
    this.closeNewNameDialog();
  }

  private closeNewNameDialog(): void {
    this.showNewNameDialog = false;
    this.pendingNewNameText = '';
  }

  /** Pre-fetch existing meal names so blur-dialog avoids per-blur round-trip. */
  private loadKnownMealNames(): void {
    this.mealsService.getMeals().subscribe({
      next: (meals) => {
        this.knownMealNames = new Set(
          meals
            .map(m => (m.meal_name || '').trim())
            .filter((n): n is string => n.length > 0)
        );
      },
      error: () => { this.knownMealNames = new Set(); },
    });
  }

  private loadServeDateOptionsIfNeeded(): void {
    if (this.menuMode !== 'open') return;
    this.loadingServeDates = true;
    this.dateService.getAvailableServeDates().subscribe({
      next: (dates) => {
        this.serveDateOptions = dates;
        this.loadingServeDates = false;
      },
      error: () => {
        this.serveDateOptions = [];
        this.loadingServeDates = false;
      },
    });
  }

  // === Submit ===

  private validateSharedFields(): string | null {
    const names = this.mealNames.map(n => (n || '').trim()).filter(n => n.length > 0);
    if (names.length === 0) return '請至少輸入一道菜名。';
    if (!this.meal.meal_time) return '請選擇餐期。';
    if (this.menuMode === 'cyclic' && (!this.meal.day_cycle || Number(this.meal.day_cycle) < 1)) {
      return '循環模式需要輸入有效的天數（≥1）。';
    }
    if (this.menuMode === 'open' && !this.meal.serve_date) {
      return '開放模式需要選擇日期。';
    }
    return null;
  }

  private buildBasePayload(): any {
    const base: any = {
      meal_time: this.meal.meal_time,
      menu_mode: this.menuMode,
      plate_type: this.meal.plate_type || null,
      ingredients: [],
    };
    if (this.menuMode === 'cyclic') {
      base.day_cycle = Number(this.meal.day_cycle);
      base.serve_date = null;
    } else {
      base.serve_date = this.meal.serve_date;
      base.day_cycle = null;
    }
    return base;
  }

  /**
   * Batch-create one meal per non-empty name; per-request catchError so a
   * partial failure still reports what succeeded. Hands the new meals off to
   * the assign dialog so the user doesn't have to re-find each one.
   */
  submitSingleMeal(): void {
    const err = this.validateSharedFields();
    if (err) { alert(err); return; }

    const names = this.mealNames.map(n => (n || '').trim()).filter(n => n.length > 0);
    const base = this.buildBasePayload();

    this.isSubmitting = true;
    const requests = names.map(name =>
      this.mealsService.addMeal({ ...base, meal_name: name }).pipe(
        map(result => ({ ok: true as const, name, result })),
        catchError((e: any) => of({ ok: false as const, name, err: e })),
      ),
    );

    forkJoin(requests).subscribe(results => {
      this.isSubmitting = false;
      const success = results.filter(r => r.ok);
      const failed = results.filter(r => !r.ok);

      if (failed.length > 0) {
        const failedNames = failed.map(f => f.name).join('、');
        alert(`成功 ${success.length} 道、失敗 ${failed.length} 道：${failedNames}`);
      }

      if (success.length > 0) {
        this.assignDialogMeals = success.map(s => s.result);
        this.assignDialogOpen = true;
      }
    });
  }

  // === Assign dialog ===

  closeAssignDialog(): void {
    this.assignDialogOpen = false;
    this.assignDialogMeals = [];
    this.router.navigate(['/meal-catalog']);
  }

  onAssignCompleted(res: BulkAssignResponse): void {
    this.assignDialogOpen = false;
    this.assignDialogMeals = [];
    alert(`配餐完成：新建 ${res.created} 筆、略過 ${res.skipped} 筆重複。`);
    this.router.navigate(['/meal-catalog']);
  }

  onBackClick(): void {
    this.back.emit();
  }
}
