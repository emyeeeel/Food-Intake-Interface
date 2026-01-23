import { Component, OnInit } from '@angular/core';
import { Meal } from '../../models/meal.model';
import { Ingredient } from '../../models/ingredient.model';

import { FormsModule } from '@angular/forms';
import { MealsService } from '../../services/meals.service';
import { TagsComponent } from "../tags/tags.component";
import { IngredientsService } from '../../services/ingredients.service';
import { Router } from '@angular/router';


@Component({
  selector: 'app-add-meal',
  imports: [FormsModule, TagsComponent],
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
    day_cycle: '',
    meal_description: '',
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


  constructor(private mealsService: MealsService, private ingredientsService: IngredientsService, private router: Router) {}

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
          
          // Auto-fill fields from API response if they exist and current fields are empty
          if (apiMeal.meal_description && !this.meal.meal_description?.trim()) {
            this.meal.meal_description = apiMeal.meal_description;
          }
          
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
      formData.append('day_cycle', this.meal.day_cycle);
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
  formData.append('meal_description', this.meal.meal_description!);
  formData.append('meal_time', this.meal.meal_time!);
  formData.append('day_cycle', this.meal.day_cycle!);
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
      this.meal.meal_description?.trim() &&
      this.meal.meal_time &&
      this.meal.day_cycle &&
      this.meal.plate_type
    );
  }

  private resetForm(): void {
    this.meal = {
      meal_name: '',
      meal_time: '',
      day_cycle: '',
      meal_description: '',
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
      day_cycle: '',
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
    // Create a simple Excel template
    const templateData = [
      {
        '餐點名稱': '範例餐點',
        '用餐時間': '早餐',
        '日循環': '1',
        '餐盤類型': '標準',
        '成分': '米飯, 蔬菜, 蛋白質'
      }
    ];

    // Create workbook and download
    import('xlsx').then(XLSX => {
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(templateData);
      XLSX.utils.book_append_sheet(workbook, worksheet, '餐點模板');
      
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      import('file-saver').then(fileSaver => {
        fileSaver.saveAs(blob, 'meal-template.xlsx');
      });
    });
  }

  async uploadExcelFile(): Promise<void> {
    if (!this.selectedFile) return;

    this.isUploading = true;
    this.uploadProgress = 0;

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        this.uploadProgress += 10;
        if (this.uploadProgress >= 90) {
          clearInterval(progressInterval);
        }
      }, 200);

      // Read and process Excel file
      const fileData = await this.readExcelFile(this.selectedFile);
      
      // Here you would typically send the data to your backend
      // For now, we'll simulate the upload
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      clearInterval(progressInterval);
      this.uploadProgress = 100;

      this.uploadResult = {
        success: true,
        message: '檔案上傳成功！',
        details: [
          `處理了 ${fileData.length} 筆餐點記錄`,
          '所有記錄已成功導入系統'
        ]
      };

      // Reset after success
      setTimeout(() => {
        this.selectedFile = null;
        this.uploadProgress = 0;
      }, 3000);

    } catch (error) {
      console.error('Upload error:', error);
      this.uploadResult = {
        success: false,
        message: '檔案上傳失敗',
        details: ['請檢查檔案格式是否正確', '確保所有必填欄位都已填寫']
      };
    } finally {
      this.isUploading = false;
    }
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