import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Meal } from '../../models/meal.model';
import { Ingredient } from '../../models/ingredient.model';

import { FormsModule } from '@angular/forms';
import { MealsService } from '../../services/meals.service';
import { TagsComponent } from "../tags/tags.component";
import { IngredientsService } from '../../services/ingredients.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DateService } from '../../services/date.service';
import { SettingsService } from '../../services/settings.service';
import { forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AssignMealDialogComponent } from '../assign-meal-dialog/assign-meal-dialog.component';
import { BulkAssignResponse } from '../../services/meal-assignment.service';


@Component({
  selector: 'app-add-meal',
  imports: [FormsModule, TagsComponent, CommonModule, AssignMealDialogComponent],
  templateUrl: './add-meal.component.html',
  styleUrl: './add-meal.component.scss'
})
export class AddMealComponent implements OnInit {
  ngOnInit(): void {
    console.log('AddMealComponent initialized');
    this.loadServeDateOptionsIfNeeded();
    this.loadKnownMealNames();
  }

  /** Pre-fetches all existing meal names so the blur dialog can tell
   *  novel names from existing ones without a per-blur round-trip. */
  private loadKnownMealNames(): void {
    this.mealsService.getMeals().subscribe({
      next: (meals) => {
        this.knownMealNames = new Set(
          meals
            .map(m => (m.meal_name || '').trim())
            .filter((n): n is string => n.length > 0)
        );
      },
      error: () => {
        this.knownMealNames = new Set();
      },
    });
  }

  // New-dish-name confirmation state
  knownMealNames: Set<string> = new Set();
  nameConfirmed = false;
  showNewNameDialog = false;
  pendingNewNameText = '';

  onMealNameInput(): void {
    // Any edit invalidates a previous confirmation.
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

  private loadServeDateOptionsIfNeeded(): void {
    if (this.menuMode === 'open') {
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
  }

  serveDateOptions: { value: string; label: string }[] = [];
  loadingServeDates = false;

  meal: Partial<Meal> = {
    meal_name: '',
    meal_time: '',
    day_cycle: undefined,      // meaningful only in cyclic mode
    serve_date: undefined,     // meaningful only in open mode
    plate_type: '',
    ingredients: [] as number[]
  };

  showFullForm = false;
  isLoading = false;
  isSubmitting = false;

  // Store generated ingredients separately for better management
  generatedIngredients: Ingredient[] = [];

  // Dropdown options based on your model
  mealTimeOptions = [
  { value: '午餐', label: '午餐' },
  { value: '晚餐', label: '晚餐' },
  // { value: '點心', label: 'Snack' }
];


  dayCycleOptions = Array.from({ length: 7 }, (_, i) => ({
  value: i + 1,
  label: `第${i + 1}天`
}));


  // Values match backend PLATE_TYPE_CHOICES (stored as simplified Chinese);
  // labels are Taiwan traditional for display.
  plateTypeOptions = [
    { value: '金属板', label: '金屬鐵盤' },
    { value: '金属碗', label: '金屬碗' },
    { value: '陶瓷碗', label: '陶瓷碗' }
  ];


  constructor(
    private mealsService: MealsService,
    private ingredientsService: IngredientsService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private dateService: DateService, // Add this
    private settingsService: SettingsService,
  ) {}

  get menuMode(): 'cyclic' | 'open' {
    return this.dateService.getCurrentMenuMode();
  }

  get menuModeLabel(): string {
    return this.menuMode === 'open' ? '開放模式' : '循環模式';
  }

  private buildTemplateFilename(): string {
    const today = this.dateService.getTodayDate();
    const dateStr =
      today.getFullYear() +
      String(today.getMonth() + 1).padStart(2, '0') +
      String(today.getDate()).padStart(2, '0');
    const center = this.settingsService.careCenterName || '長照中心';
    const modeLabel = this.menuMode === 'open' ? '開放' : '循環';
    return `${center}-菜單-${modeLabel}-${dateStr}.xlsx`;
  }

  mealImage: File | null = null;
  mealImagePreview: string | null = null;

  onImageSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.mealImage = file;

    // Preview
    const reader = new FileReader();
    reader.onload = () => {
      this.mealImagePreview = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  onInitialSubmit(): void {
    if (this.meal.meal_name?.trim()) {
      this.isLoading = true;
      
      // Generate ingredients using MealsService
      this.generateIngredientsFromMeal(this.meal.meal_name).then((response) => {
        this.isLoading = false;
        this.showFullForm = true;
        
        // Process the API response
        if (response && response.ingredients) {
          this.generatedIngredients = response.ingredients;
          // Convert to Ingredient objects if needed
          if (response && response.ingredients) {
            this.generatedIngredients = response.ingredients;
          
            // store ONLY ingredient IDs on the meal
            this.meal.ingredients = response.ingredients.map((ing: any) => ing.id);
          }
          console.log('Generated ingredients:', this.meal.ingredients);
        }
        
        // Process the meal data from API response
        if (response && response.meal) {
          const apiMeal = response.meal;
          
          
          if (apiMeal.meal_time && !this.meal.meal_time) {
            this.meal.meal_time = apiMeal.meal_time;
          }
          
          if (apiMeal.day_cycle && !this.meal.day_cycle) {
            this.meal.day_cycle = apiMeal.day_cycle;
          }

          if (apiMeal.serve_date && !this.meal.serve_date) {
            this.meal.serve_date = apiMeal.serve_date;
          }

          if (apiMeal.plate_type && !this.meal.plate_type) {
            this.meal.plate_type = apiMeal.plate_type;
          }
          
          // Store the meal ID if it was created/updated on the backend
          if (apiMeal.id) {
            this.meal.id = apiMeal.id;
          }
        }

        // 🔹 Fetch the full meal by name using MealsService
        this.mealsService.getMealByName(this.meal.meal_name!).subscribe({
          next: (mealsFromApi: Meal[]) => {
            if (mealsFromApi.length > 0) {
              const apiMeal = mealsFromApi[0];

              this.meal = {
                ...this.meal,
                ...apiMeal,
                ingredients: apiMeal.ingredients // keep IDs
              };

              console.log('Meal fetched from API:', this.meal);
            } else {
              console.warn('No meals found with the given name.');
            }
          },
          error: (err) => {
            console.error('Failed to fetch meal by name:', err);
          }
        });
        
      }).catch((error) => {
        this.isLoading = false;
        console.error('Error generating ingredients:', error);
        // Still show the form even if ingredients generation fails
        this.showFullForm = true;
      });
    }
  }


  // Process the ingredients response from the API
  private processIngredientsResponse(ingredients: any[]): Ingredient[] {
    return ingredients.map(ingredient => ({
      id: ingredient.id, 
      name: ingredient.name,
      food_group: ingredient.food_group,
      nutrients: ingredient.nutrients || [],
      created: ingredient.created || false
    } as Ingredient));
  }

  // Generate ingredients using MealsService
  private generateIngredientsFromMeal(mealName: string): Promise<any> {
    return new Promise((resolve, reject) => {

      const formData = new FormData();

      formData.append('meal_name', mealName);
      formData.append('meal', mealName);

      if (this.meal.meal_time) {
        formData.append('meal_time', this.meal.meal_time);
      }

      if (this.menuMode === 'open' && this.meal.serve_date) {
        formData.append('menu_mode', 'open');
        formData.append('serve_date', this.meal.serve_date);
      } else if (this.meal.day_cycle) {
        formData.append('menu_mode', 'cyclic');
        formData.append('day_cycle', String(this.meal.day_cycle));
      }

      if (this.meal.plate_type) {
        formData.append('plate_type', this.meal.plate_type);
      }

      if (this.mealImage) {
        formData.append('image', this.mealImage, this.mealImage.name);
      }

      this.mealsService.generateIngredientsFromMeal(formData).subscribe({
        next: resolve,
        error: reject
      });
    });
  }


private buildMealFormData(): FormData {
  const formData = new FormData();

  formData.append('meal_name', this.meal.meal_name!);
  formData.append('meal_time', this.meal.meal_time!);
  formData.append('menu_mode', this.menuMode);
  if (this.menuMode === 'open' && this.meal.serve_date) {
    formData.append('serve_date', this.meal.serve_date);
  } else {
    formData.append('day_cycle', String(this.meal.day_cycle!));
  }
  formData.append('plate_type', this.meal.plate_type!);

  console.log('Ingredients List: ', this.generatedIngredients)

  if (this.meal.ingredients?.length) {
    this.meal.ingredients.forEach((id) => {
      formData.append('ingredients', String(id));
    });
  }
  

  if (this.mealImage) {
    formData.append('image', this.mealImage, this.mealImage.name);
  }

  return formData;
}



  /**
   * Dynamic list of dish names entered in this form. The + button inserts
   * a new empty slot below; × removes that slot (disabled when only one
   * slot remains). All non-empty names are submitted in one batch below,
   * sharing the same 餐期 / 天數·日期 / 餐盤 fields.
   */
  mealNames: string[] = [''];

  trackByIndex(index: number): number { return index; }

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
   * Enter in a name field adds a new row below and jumps focus there.
   * Does NOT submit — submit is only via the explicit bottom button so
   * users don't accidentally POST before filling 餐期 / 日期.
   */
  onMealNameEnter(index: number, event: Event): void {
    event.preventDefault();
    // If the last row is already empty, just focus it instead of piling rows.
    const isLast = index === this.mealNames.length - 1;
    const currentEmpty = !(this.mealNames[index] || '').trim();
    if (isLast && currentEmpty) return;
    if (isLast) {
      this.addMealNameAt(index);
    } else {
      // Move focus to the next existing row.
      setTimeout(() => {
        const inputs = document.querySelectorAll<HTMLInputElement>('.meal-name-input');
        inputs[index + 1]?.focus();
      }, 0);
    }
  }

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

  /** Count of non-empty names — used for the submit button label. */
  get filledNameCount(): number {
    return this.mealNames.reduce((acc, n) => acc + ((n || '').trim() ? 1 : 0), 0);
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

  // === Assign-to-residents dialog state (Phase 5) ===

  assignDialogOpen = false;
  assignDialogMeals: Meal[] = [];

  closeAssignDialog(): void {
    this.assignDialogOpen = false;
    this.assignDialogMeals = [];
    // Dialog closed without completing → go back to the catalog.
    this.router.navigate(['/meal-catalog']);
  }

  onAssignCompleted(res: BulkAssignResponse): void {
    this.assignDialogOpen = false;
    this.assignDialogMeals = [];
    alert(`配餐完成：新建 ${res.created} 筆、略過 ${res.skipped} 筆重複。`);
    this.router.navigate(['/meal-catalog']);
  }

  /**
   * Submit: batch-creates one meal per non-empty name, sharing 餐期 / 日期 /
   * 餐盤. Uses forkJoin with per-request catchError so a partial failure
   * still reports what succeeded. On success, immediately opens the
   * assign-to-residents dialog (Phase 5) so the user doesn't have to
   * re-find each meal to configure who eats it.
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
        // Hand the newly-created meals off to the assign dialog so the user
        // can immediately decide who eats them.
        this.assignDialogMeals = success.map(s => s.result);
        this.assignDialogOpen = true;
      }
    });
  }

  onSubmit(): void {
  if (!this.isValidMeal() || !this.meal.id) {
    console.warn('Meal is invalid or missing ID');
    return;
  }

  this.isSubmitting = true;

  const formData = this.buildMealFormData();

  this.mealsService.updateMeal(this.meal.id, formData).subscribe({
    next: (updatedMeal) => {
      this.isSubmitting = false;
      this.meal = updatedMeal;

      console.log('Meal successfully updated:', updatedMeal);
      
      this.router.navigate(['/meal-catalog']);
    },
    error: (error) => {
      this.isSubmitting = false;
      console.error('Failed to update meal:', error);
      alert('Failed to update meal. Please try again.');
    }
  });
}

  

  onCancel(): void {
    this.resetForm();
    this.router.navigate(['/meal-catalog/add']);
  }

  private isValidMeal(): boolean {
    const timeUnitOk =
      this.menuMode === 'open'
        ? !!this.meal.serve_date
        : !!this.meal.day_cycle;
    return !!(
      this.meal.meal_name?.trim() &&
      this.meal.meal_time &&
      timeUnitOk &&
      this.meal.plate_type
    );
  }

  private resetForm(): void {
    this.meal = {
      meal_name: '',
      meal_time: '',
      day_cycle: undefined,
      serve_date: undefined,
      plate_type: '',
      ingredients: []
    };
    this.generatedIngredients = [];
    this.mealImage = null;
    this.mealImagePreview = null;
    this.showFullForm = false;
    this.isLoading = false;
    this.isSubmitting = false;
  }

  // Helper method to get ingredient names for display
  getIngredientNames(): string[] {
    return this.generatedIngredients.map(ing => ing.name);
  }

  isCapturing = false;

  captureMealImage(): void {
    this.isCapturing = true;
  
    this.mealsService.captureMealImage().subscribe({
      next: (blob: Blob) => {
        this.isCapturing = false;
  
        // Convert Blob → File
        const file = new File([blob], 'meal.jpg', { type: blob.type });
        this.mealImage = file;
  
        // Preview
        const reader = new FileReader();
        reader.onload = () => {
          this.mealImagePreview = reader.result as string;
        };
        reader.readAsDataURL(file);
      },
      error: (error) => {
        this.isCapturing = false;
        console.error('Image capture failed:', error);
      }
    });
  }

  // New properties for option selection
  selectedOption: string | null = null;
  
  // Excel upload properties
  selectedFile: File | null = null;
  isDragActive: boolean = false;
  isUploading: boolean = false;
  uploadProgress: number = 0;
  uploadResult: { success: boolean; message: string; details?: string[] } | null = null;

  // Option selection methods
  selectOption(option: 'addMeal' | 'updateCycle'): void {
    this.selectedOption = option;
    console.log('Selected option:', option);
  }

  goBackToOptions(): void {
    this.selectedOption = null;
    this.resetForms();
  }

  resetForms(): void {
    // Reset add meal form
    this.showFullForm = false;
    this.meal = {
      meal_name: '',
      meal_time: '',
      day_cycle: undefined,
      serve_date: undefined,
      plate_type: '',
      image: '',
      ingredients: []
    };
    this.mealImagePreview = null;
    
    // Reset excel upload
    this.selectedFile = null;
    this.uploadResult = null;
    this.uploadProgress = 0;
    this.isDragActive = false;
  }

  // Excel upload methods
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
    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      alert('請選擇有效的Excel檔案 (.xlsx 或 .xls)');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      alert('檔案大小不能超過 10MB');
      return;
    }

    this.selectedFile = file;
    this.uploadResult = null;
    console.log('File selected:', file.name);
  }

  removeFile(event: Event): void {
    event.stopPropagation();
    this.selectedFile = null;
    this.uploadResult = null;
    this.uploadProgress = 0;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  downloadTemplate(): void {
    if (this.menuMode === 'open') {
      this.downloadOpenTemplate();
    } else {
      this.downloadCyclicTemplate();
    }
  }

  private downloadCyclicTemplate(): void {
    const filename = this.buildTemplateFilename();

    // Fetch ALL cyclic meals to build full 7-day cycle template
    this.mealsService.getMealsFiltered({ menu_mode: 'cyclic' }).subscribe({
      next: (allMeals: Meal[]) => {
        const templateData: any[] = [];
        const mealTimeOrder = ['午餐', '晚餐'];

        for (let day = 1; day <= 7; day++) {
          const dateForDay = this.dateService.getDateForCycleDay(day);
          const dateStr = dateForDay.getFullYear() +
            String(dateForDay.getMonth() + 1).padStart(2, '0') +
            String(dateForDay.getDate()).padStart(2, '0');

          for (const mealTime of mealTimeOrder) {
            const dayMeals = allMeals.filter(
              m => String(m.day_cycle) === String(day) && m.meal_time === mealTime
            );
            const names = dayMeals.map(m => m.meal_name).filter(n => n?.trim()).join(', ');

            templateData.push({
              '日期': dateStr,
              '日週期': day,
              '用餐時間': mealTime,
              '菜色名稱': names || '請填入菜色名稱'
            });
          }
        }

        this.exportTemplateExcel(templateData, filename, 'cyclic');
      },
      error: () => {
        const templateData: any[] = [];
        for (let day = 1; day <= 7; day++) {
          for (const mealTime of ['午餐', '晚餐']) {
            templateData.push({
              '日期': '',
              '日週期': day,
              '用餐時間': mealTime,
              '菜色名稱': '請填入菜色名稱'
            });
          }
        }
        this.exportTemplateExcel(templateData, filename, 'cyclic');
      }
    });
  }

  private downloadOpenTemplate(): void {
    const filename = this.buildTemplateFilename();
    // Build next 7 days starting from today as a starter template.
    const today = this.dateService.getTodayDate();
    const templateData: any[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const iso = d.getFullYear() +
        '-' + String(d.getMonth() + 1).padStart(2, '0') +
        '-' + String(d.getDate()).padStart(2, '0');
      for (const mealTime of ['午餐', '晚餐']) {
        templateData.push({
          '日期': iso,
          '用餐時間': mealTime,
          '菜色名稱': '請填入菜色名稱',
        });
      }
    }
    this.exportTemplateExcel(templateData, filename, 'open');
  }

  private exportTemplateExcel(data: any[], filename: string, mode: 'cyclic' | 'open'): void {
    import('xlsx').then(XLSX => {
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(data);
      worksheet['!cols'] = mode === 'open'
        ? [{ wch: 12 }, { wch: 15 }, { wch: 60 }]
        : [{ wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 60 }];
      const sheetName = mode === 'open' ? '開放菜單' : '7天循環菜單';
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

      const buf = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([buf], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      import('file-saver').then(fs => {
        fs.saveAs(blob, filename);
      });
    });
  }

  uploadExcelFile(): void {
    if (!this.selectedFile) return;

    // Initialize upload state
    this.isUploading = true;
    console.log('Starting upload in', this.menuMode, 'mode...');

    const upload$ = this.menuMode === 'open'
      ? this.mealsService.addOpenMealCycle(this.selectedFile)
      : this.mealsService.updateMealCycle(this.selectedFile);

    upload$.subscribe({
      next: (response) => {
        console.log('Upload successful:', response);
        
        this.isUploading = false;

        // Show success alert
        let successMessage = '檔案上傳成功！\n\n';
        successMessage += '餐點週期已更新\n';
        
        if (response.created_count) {
          successMessage += `新增了 ${response.created_count} 個餐點\n`;
        }
        if (response.updated_count) {
          successMessage += `更新了 ${response.updated_count} 個餐點\n`;
        }
        if (response.skipped_count) {
          successMessage += `跳過了 ${response.skipped_count} 個餐點\n`;
        }
        
        const totalProcessed = (response.updated_count || 0) + (response.created_count || 0);
        successMessage += `\n總共處理了 ${totalProcessed} 筆記錄`;
        
        alert(successMessage);

        // Redirect after user closes alert
        setTimeout(() => {
          console.log('Redirecting to meal-catalog...');
          this.router.navigate(['/meal-catalog']);
        }, 1000);
      },
      error: (error) => {
        console.error('Upload error:', error);
        
        this.isUploading = false;
        
        // Show error alert
        let errorMessage = '檔案上傳失敗！\n\n';
        
        if (error.error && error.error.message) {
          errorMessage += error.error.message;
        } else {
          errorMessage += '請檢查檔案格式是否正確\n確保所有必填欄位都已填寫';
        }
        
        alert(errorMessage);
      }
    });
  }

  private async readExcelFile(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          import('xlsx').then(XLSX => {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);
            resolve(jsonData);
          });
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('無法讀取檔案'));
      reader.readAsArrayBuffer(file);
    });
  }
  
}