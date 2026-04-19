import { Component, Input, OnInit, OnChanges, SimpleChanges, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MealsService } from '../../services/meals.service';
import { DateService } from '../../services/date.service';
import { PlateTypeLabelPipe } from '../../pipes/plate-type-label.pipe';
import { Meal } from '../../models/meal.model';
import { forkJoin } from 'rxjs';
import {
  findSlotDuplicates,
  buildSlotDuplicateErrorMessage,
} from '../../policies/meal-creation.policy';

interface EditableDish {
  id: number | null;
  meal_name: string;
  plate_type: string;
  isNew: boolean;
  /** True once the user has acknowledged via dialog that this is a new name.
   * Cleared when meal_name is edited so the user is re-prompted if they change it. */
  nameConfirmed?: boolean;
}

@Component({
  selector: 'app-edit-meal',
  imports: [CommonModule, FormsModule, PlateTypeLabelPipe],
  templateUrl: './edit-meal.component.html',
  styleUrl: './edit-meal.component.scss',
})
export class EditMealComponent implements OnInit, OnChanges {
  @Input() mealId: number | null = null;

  isLoading = true;
  isSaving = false;
  error = '';
  successMessage = '';

  // Meal group info
  dayCycle = 1;                                   // meaningful only in cyclic mode
  serveDate: string | null = null;                // meaningful only in open mode
  currentMenuMode: 'cyclic' | 'open' = 'cyclic';  // derived from the meal being edited
  mealTime = '午餐';

  // All dishes in this meal group (editable)
  dishes: EditableDish[] = [];
  removedIds: number[] = [];

  // Searchable dropdown
  allMealNames: string[] = [];
  mealsByName: Map<string, Meal> = new Map(); // for inheriting plate_type
  allMeals: Meal[] = [];                       // for Rule B slot-duplicate check
  activeDropdownIndex: number | null = null;
  searchFiltered: string[] = [];

  plateTypeOptions = ['金属板', '金属碗', '陶瓷碗'];

  // New-name confirmation dialog state
  showNewNameDialog = false;
  pendingNewNameIndex: number | null = null;
  pendingNewNameText = '';

  constructor(
    private mealsService: MealsService,
    private dateService: DateService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.mealId = Number(id);
        this.loadData();
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mealId'] && this.mealId) {
      this.loadData();
    }
  }

  /** Load the target meal, its group, and all meal names for dropdown */
  loadData(): void {
    if (!this.mealId) return;

    this.isLoading = true;
    this.error = '';
    this.successMessage = '';
    this.removedIds = [];

    this.mealsService.getMeal(this.mealId).subscribe({
      next: (meal) => {
        this.currentMenuMode = meal.menu_mode ?? 'cyclic';
        this.dayCycle = meal.day_cycle ?? 1;
        this.serveDate = meal.serve_date ?? null;
        this.mealTime = meal.meal_time;
        this.loadGroupAndNames();
      },
      error: () => {
        this.error = '無法載入餐點資料';
        this.isLoading = false;
      },
    });
  }

  private loadGroupAndNames(): void {
    // Mode-aware group query: cyclic uses (day_cycle, meal_time); open uses (serve_date, meal_time).
    const groupParams: { [key: string]: string | number | undefined } = {
      menu_mode: this.currentMenuMode,
      meal_time: this.mealTime,
    };
    if (this.currentMenuMode === 'open' && this.serveDate) {
      groupParams['serve_date'] = this.serveDate;
    } else {
      groupParams['day_cycle'] = this.dayCycle;
    }

    forkJoin({
      group: this.mealsService.getMealsFiltered(groupParams),
      all: this.mealsService.getMeals(),
    }).subscribe({
      next: ({ group, all }) => {
        this.dishes = group.map(m => ({
          id: m.id,
          meal_name: m.meal_name,
          plate_type: m.plate_type || '金属板',
          isNew: false,
        }));

        this.allMeals = all;

        // Unique meal names for dropdown, sorted; keep first match for plate_type lookup
        this.mealsByName = new Map();
        for (const m of all) {
          if (!this.mealsByName.has(m.meal_name)) {
            this.mealsByName.set(m.meal_name, m);
          }
        }
        this.allMealNames = Array.from(this.mealsByName.keys()).sort((a, b) => a.localeCompare(b, 'zh-Hant'));

        this.isLoading = false;
      },
      error: () => {
        this.error = '無法載入菜色資料';
        this.isLoading = false;
      },
    });
  }

  // --- Searchable dropdown ---

  onSearchInput(index: number, value: string): void {
    this.dishes[index].meal_name = value;
    // Any edit to the name invalidates a previous confirmation,
    // so the blur dialog re-asks if the new value is still novel.
    this.dishes[index].nameConfirmed = false;
    this.activeDropdownIndex = index;
    this.filterNames(value);
  }

  onSearchFocus(index: number): void {
    this.activeDropdownIndex = index;
    this.filterNames(this.dishes[index].meal_name);
  }

  private filterNames(query: string): void {
    const q = query.trim().toLowerCase();
    if (!q) {
      this.searchFiltered = this.allMealNames.slice(0, 20);
    } else {
      this.searchFiltered = this.allMealNames
        .filter(n => n.toLowerCase().includes(q))
        .slice(0, 20);
    }
  }

  selectName(index: number, name: string): void {
    this.dishes[index].meal_name = name;
    // Picking from the dropdown means the name already exists, no confirmation needed.
    this.dishes[index].nameConfirmed = true;
    // Auto-fill plate_type from existing dish with same name
    const donor = this.mealsByName.get(name);
    if (donor?.plate_type) {
      this.dishes[index].plate_type = donor.plate_type;
    }
    this.activeDropdownIndex = null;
  }

  /**
   * Fires when the dish-name input loses focus. If the typed name is neither
   * empty, already in the meal library, nor previously confirmed by the user,
   * pops the confirmation dialog so they can catch typos before a new DB row
   * is silently created at save time.
   */
  onDishNameBlur(index: number): void {
    const dish = this.dishes[index];
    const name = (dish.meal_name || '').trim();
    if (!name) return;
    if (this.mealsByName.has(name)) return;
    if (dish.nameConfirmed) return;
    this.pendingNewNameIndex = index;
    this.pendingNewNameText = name;
    this.showNewNameDialog = true;
  }

  confirmNewName(): void {
    if (this.pendingNewNameIndex !== null) {
      this.dishes[this.pendingNewNameIndex].nameConfirmed = true;
    }
    this.closeNewNameDialog();
  }

  rejectNewName(): void {
    this.closeNewNameDialog();
    // Intentionally do not refocus — user can click back into the input to edit.
  }

  private closeNewNameDialog(): void {
    this.showNewNameDialog = false;
    this.pendingNewNameIndex = null;
    this.pendingNewNameText = '';
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dish-name-cell')) {
      this.activeDropdownIndex = null;
    }
  }

  // --- Add / Remove ---

  addDish(): void {
    this.dishes.push({
      id: null,
      meal_name: '',
      plate_type: '金属板',
      isNew: true,
    });
  }

  removeDish(index: number): void {
    const dish = this.dishes[index];
    if (dish.id && !dish.isNew) {
      if (!confirm(`確定要移除「${dish.meal_name}」？`)) return;
      this.removedIds.push(dish.id);
    }
    this.dishes.splice(index, 1);
  }

  // --- Save ---

  save(): void {
    // Validate: all dishes must have a name
    const emptyIndex = this.dishes.findIndex(d => !d.meal_name.trim());
    if (emptyIndex >= 0) {
      this.error = `第 ${emptyIndex + 1} 道菜尚未輸入菜色名稱`;
      return;
    }

    if (this.dishes.length === 0 && this.removedIds.length === 0) {
      this.error = '至少需要一道菜';
      return;
    }

    // Intra-form duplicate check: two rows in the same form with the same name.
    // Rule B (below) excludes current dish IDs so it can't catch this case.
    const nameSet = new Set<string>();
    for (const d of this.dishes) {
      const n = d.meal_name.trim();
      if (nameSet.has(n)) {
        this.error = `「${n}」在此餐期中出現兩次，請修正後再儲存。`;
        return;
      }
      nameSet.add(n);
    }

    // Rule B: slot-duplicate check for new dishes and renamed existing dishes.
    // excludeIds = ids of dishes already in this slot (self-edit is allowed).
    const existingIds = this.dishes.filter(d => d.id != null).map(d => d.id as number);
    const allNames = this.dishes.map(d => d.meal_name.trim()).filter(n => n.length > 0);
    const slotDupes = findSlotDuplicates(
      allNames,
      this.allMeals,
      this.currentMenuMode,
      this.mealTime,
      this.dayCycle,
      this.serveDate,
      existingIds,
    );
    if (slotDupes.length > 0) {
      this.error = buildSlotDuplicateErrorMessage(slotDupes);
      return;
    }

    this.isSaving = true;
    this.error = '';
    this.successMessage = '';

    const updates$ = this.dishes
      .filter(d => !d.isNew && d.id)
      .map(d => this.mealsService.updateMealJson(d.id!, {
        meal_name: d.meal_name.trim(),
        plate_type: d.plate_type,
      }));

    const creates$ = this.dishes
      .filter(d => d.isNew)
      .map(d => {
        const payload: any = {
          meal_name: d.meal_name.trim(),
          meal_time: this.mealTime,
          plate_type: d.plate_type,
          ingredients: [],
          menu_mode: this.currentMenuMode,
        };
        if (this.currentMenuMode === 'open' && this.serveDate) {
          payload.serve_date = this.serveDate;
        } else {
          payload.day_cycle = this.dayCycle;
        }
        return this.mealsService.addMeal(payload);
      });

    const deletes$ = this.removedIds.map(id => this.mealsService.deleteMeal(id));

    const all$ = [...updates$, ...creates$, ...deletes$];

    if (all$.length === 0) {
      this.successMessage = '沒有變更';
      this.isSaving = false;
      return;
    }

    forkJoin(all$).subscribe({
      next: () => {
        this.successMessage = '儲存成功';
        this.isSaving = false;
        this.removedIds = [];
        // Reload to get fresh IDs for newly created meals
        this.loadData();
      },
      error: (err) => {
        const detail = err?.error?.meal_name?.[0] || err?.error?.detail || '部分操作未完成';
        this.error = `儲存失敗：${detail}`;
        this.isSaving = false;
      },
    });
  }

  // --- Navigation ---

  goBack(): void {
    this.router.navigate(['/meal-catalog/all']);
  }

  // --- Helpers ---

  getMealTimeIcon(): string {
    return this.mealTime === '午餐' ? 'assets/icons/lunch-time.svg' : 'assets/icons/dinner-time.svg';
  }

  getDayLabel(): string {
    if (this.currentMenuMode === 'open' && this.serveDate) {
      return `${this.serveDate} (${this.dateService.getWeekdayLabel(this.serveDate)})`;
    }
    return `第 ${this.dayCycle} 天`;
  }

  getMealCode(dish: EditableDish): string {
    if (!dish.id) return 'NEW';
    const letter = this.mealTime === '午餐' ? 'L' : 'D';
    if (this.currentMenuMode === 'open' && this.serveDate) {
      const compactDate = this.serveDate.replace(/-/g, '');
      return `${letter}-${compactDate}-${dish.id}`;
    }
    return `${letter}-${this.dayCycle}-${dish.id}`;
  }
}
