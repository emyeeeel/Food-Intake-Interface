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


@Component({
  selector: 'app-add-meal',
  imports: [FormsModule, TagsComponent, CommonModule],
  templateUrl: './add-meal.component.html',
  styleUrl: './add-meal.component.scss'
})
export class AddMealComponent implements OnInit {
  ngOnInit(): void {
    // Initialization logic can be added here if needed
    console.log('AddMealComponent initialized');
  }
  meal: Partial<Meal> = {
    meal_name: '',
    meal_time: '',
    day_cycle: undefined, // Changed from empty string to undefined
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


  dayCycleOptions = Array.from({ length: 14 }, (_, i) => ({
  value: i + 1,            // ✅ INTEGER
  label: `第${i + 1}天`
}));


  plateTypeOptions = [
  { value: '金属板', label: '金属板' },
  { value: '金属碗', label: '金属碗' },
  { value: '陶瓷碗', label: '陶瓷碗' }
];


  constructor(
    private mealsService: MealsService,
    private ingredientsService: IngredientsService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private dateService: DateService // Add this
  ) {}

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

      if (this.meal.day_cycle) {
        formData.append('day_cycle', String(this.meal.day_cycle)); // Convert number to string for FormData
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
  formData.append('day_cycle', String(this.meal.day_cycle!)); // Convert number to string for FormData
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
    return !!(
      this.meal.meal_name?.trim() &&
      this.meal.meal_time &&
      this.meal.day_cycle &&
      this.meal.plate_type
    );
  }

  private resetForm(): void {
    this.meal = {
      meal_name: '',
      meal_time: '',
      day_cycle: undefined, // Changed from empty string to undefined
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
      day_cycle: undefined, // Changed from empty string to undefined
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
  // Get today's date and cycle day
  const today = this.dateService.getTodayDate();
  const todaysCycleDay = this.dateService.getTodaysCycleDay();
  
  // Format today's date as YYYYMMDD
  const todayFormatted = today.getFullYear() +
    String(today.getMonth() + 1).padStart(2, '0') +
    String(today.getDate()).padStart(2, '0');

  console.log(`Today is cycle day ${todaysCycleDay}, formatted date: ${todayFormatted}`);

  // Fetch meals for today's cycle day using MealsService
  this.mealsService.getMeals().subscribe({
    next: (allMeals: Meal[]) => {
      // Filter meals for today's cycle day
      const todayMeals = allMeals.filter(meal => meal.day_cycle === todaysCycleDay);
      
      console.log('Meals for today:', todayMeals);

      let templateData: any[] = [];

      if (todayMeals.length > 0) {
        // Group meals by meal_time and combine meal names
        const mealGroups = todayMeals.reduce((groups: any, meal) => {
          const mealTime = meal.meal_time || '午餐';
          if (!groups[mealTime]) {
            groups[mealTime] = [];
          }
          groups[mealTime].push(meal.meal_name || '');
          return groups;
        }, {});

        // Create template data with 4 columns including day cycle
        templateData = Object.keys(mealGroups).map(mealTime => ({
          '日期': todayFormatted,
          '日週期': todaysCycleDay, // Add day cycle column
          '用餐時間': mealTime,
          '菜色名稱': mealGroups[mealTime].filter((name: string) => name.trim()).join(', ')
        }));
      } else {
        // Fallback template if no meals found for today - Updated with 4 columns
        templateData = [
          {
            '日期': todayFormatted,
            '日週期': todaysCycleDay, // Add day cycle column
            '用餐時間': '午餐',
            '菜色名稱': '請填入午餐菜色名稱'
          },
          {
            '日期': todayFormatted,
            '日週期': todaysCycleDay, // Add day cycle column
            '用餐時間': '晚餐',
            '菜色名稱': '請填入晚餐菜色名稱'
          }
        ];
        
        console.log('No meals found for today, using fallback template');
      }

      // Create workbook and download - Updated column widths for 4 columns
      import('xlsx').then(XLSX => {
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(templateData);
        
        // Set column widths for better formatting - Updated for 4 columns
        const columnWidths = [
          { wch: 12 },  // 日期 (Date)
          { wch: 10 },  // 日週期 (Day Cycle)
          { wch: 15 },  // 用餐時間 (Meal Time)
          { wch: 60 }   // 菜色名稱 (Meal Names - wider for multiple dishes)
        ];
        worksheet['!cols'] = columnWidths;
        
        XLSX.utils.book_append_sheet(workbook, worksheet, `第${todaysCycleDay}天餐點模板`);
        
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { 
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        
        import('file-saver').then(fileSaver => {
          fileSaver.saveAs(blob, `膳食週期模板-${todayFormatted}.xlsx`); // Meal Cycle Template
        });
      });
    },
    error: (error) => {
      console.error('Error fetching meals:', error);
      
      // Create fallback template on error - Updated with 4 columns
      const fallbackData = [
        {
          '日期': todayFormatted,
          '日週期': todaysCycleDay, // Add day cycle column
          '用餐時間': '午餐',
          '菜色名稱': '請填入午餐菜色名稱'
        },
        {
          '日期': todayFormatted,
          '日週期': todaysCycleDay, // Add day cycle column
          '用餐時間': '晚餐',
          '菜色名稱': '請填入晚餐菜色名稱'
        }
      ];

      // Create workbook and download with fallback data - Updated column widths
      import('xlsx').then(XLSX => {
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(fallbackData);
        
        // Updated column widths for 4 columns
        const columnWidths = [
          { wch: 12 },  // 日期
          { wch: 10 },  // 日週期  
          { wch: 15 },  // 用餐時間
          { wch: 60 }   // 菜色名稱
        ];
        worksheet['!cols'] = columnWidths;
        
        XLSX.utils.book_append_sheet(workbook, worksheet, `第${todaysCycleDay}天餐點模板`);
        
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { 
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        
        import('file-saver').then(fileSaver => {
          fileSaver.saveAs(blob, `膳食週期模板-${todayFormatted}.xlsx`);
        });
      });
    }
  });
}

  uploadExcelFile(): void {
    if (!this.selectedFile) return;

    // Initialize upload state
    this.isUploading = true;
    console.log('Starting upload...');

    // Use MealsService updateMealCycle() to post the Excel file
    this.mealsService.updateMealCycle(this.selectedFile).subscribe({
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