import { Component, Input, OnInit, OnChanges, SimpleChanges, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MealsService } from '../../services/meals.service';
import { Meal } from '../../models/meal.model';
import { forkJoin } from 'rxjs';

interface EditableDish {
  id: number | null;
  meal_name: string;
  plate_type: string;
  isNew: boolean;
}

@Component({
  selector: 'app-edit-meal',
  imports: [CommonModule, FormsModule],
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
  dayCycle = 1;
  mealTime = '午餐';

  // All dishes in this meal group (editable)
  dishes: EditableDish[] = [];
  removedIds: number[] = [];

  // Searchable dropdown
  allMealNames: string[] = [];
  mealsByName: Map<string, Meal> = new Map(); // for inheriting plate_type
  activeDropdownIndex: number | null = null;
  searchFiltered: string[] = [];

  plateTypeOptions = ['金属板', '金属碗', '陶瓷碗'];

  constructor(
    private mealsService: MealsService,
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
        this.dayCycle = meal.day_cycle;
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
    forkJoin({
      group: this.mealsService.getMealsByDayCycleAndTime(this.dayCycle, this.mealTime),
      all: this.mealsService.getMeals(),
    }).subscribe({
      next: ({ group, all }) => {
        this.dishes = group.map(m => ({
          id: m.id,
          meal_name: m.meal_name,
          plate_type: m.plate_type || '金属板',
          isNew: false,
        }));

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
    // Auto-fill plate_type from existing dish with same name
    const donor = this.mealsByName.get(name);
    if (donor?.plate_type) {
      this.dishes[index].plate_type = donor.plate_type;
    }
    this.activeDropdownIndex = null;
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
      .map(d => this.mealsService.addMeal({
        meal_name: d.meal_name.trim(),
        meal_time: this.mealTime,
        day_cycle: this.dayCycle,
        plate_type: d.plate_type,
        ingredients: [],
      } as any));

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
        this.error = '儲存失敗: ' + (err?.error?.detail || '部分操作未完成');
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
    return `第 ${this.dayCycle} 天`;
  }

  getMealCode(dish: EditableDish): string {
    if (!dish.id) return 'NEW';
    const letter = this.mealTime === '午餐' ? 'L' : 'D';
    return `${letter}-${this.dayCycle}-${dish.id}`;
  }
}
