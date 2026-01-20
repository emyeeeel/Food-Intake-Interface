import { Component, Input, OnInit, OnChanges, SimpleChanges, EventEmitter, Output } from '@angular/core';
import { TagsComponent } from "../tags/tags.component";
import { Meal } from '../../models/meal.model';
import { MealAssignmentService } from '../../services/meal-assignment.service';
import { MealsService } from '../../services/meals.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

interface DailyMenu {
  lunch: string;
  dinner: string;
}

@Component({
  selector: 'app-meal-assignment',
  standalone: true,
  imports: [TagsComponent, FormsModule, CommonModule],
  templateUrl: './meal-assignment.component.html',
  styleUrls: ['./meal-assignment.component.scss']
})
export class MealAssignmentComponent implements OnInit, OnChanges {
  @Input() patientId: number = 1;
  @Input() mealType: 'lunch' | 'dinner' | 'snack' = 'lunch';
  @Input() dayCycle?: number = 1;
  @Input() showCloseButton: boolean = false;

  assignedMeal: Meal | null = null;
  loading: boolean = true;
  error: string | null = null;
  mealId: number | null = null;

  @Output() mealsStatus: EventEmitter<boolean> = new EventEmitter<boolean>();

  private readonly cycleMenu: { [key: number]: DailyMenu } = {
    // Week 1
    1: { lunch: 'Braised Pork Chop (滷肉排)', dinner: 'Braised Fish (滷油干魚)' },
    2: { lunch: 'Mixed Udon (什錦烏龍麵)', dinner: 'Potato Stew (馬鈴薯燉肉)' },
    3: { lunch: 'Braised Chicken Cutlet (滷雞排)', dinner: 'Onion Pork (洋蔥炒豬柳)' },
    4: { lunch: 'Silver Carp (銀斑魚)', dinner: 'Braised Chicken Leg (滷雞腿)' },
    5: { lunch: 'Braised Lion\'s Head (紅燒獅子頭)', dinner: 'Braised Pork Chop (滷肉排)' },
    6: { lunch: 'Rice Bowl (碗粿)', dinner: 'Japanese Pork Chop (日式豬排)' },
    7: { lunch: 'Fried Noodles (古早味炒麵)', dinner: 'Braised Chicken Cutlet (滷雞排)' },
    
    // Week 2
    8: { lunch: 'Braised Fish (滷油干魚)', dinner: 'Sausage (香腸)' },
    9: { lunch: 'Three Cup Chicken (三杯里肌)', dinner: 'Braised Chicken Leg (滷雞腿)' },
    10: { lunch: 'Mixed Rice Noodles (什錦米粉)', dinner: 'Braised Silver Carp (滷銀斑魚)' },
    11: { lunch: 'Satay Chicken Chop (沙茶腿排)', dinner: 'Braised Lion\'s Head (紅燒獅子頭)' },
    12: { lunch: 'Potato Stew (馬鈴薯燉肉)', dinner: 'Fried Boneless Chicken (炸無骨雞排)' },
    13: { lunch: 'Rice Cake (米糕)', dinner: 'Braised Pork Loin (紅燒里肌)' },
    14: { lunch: 'Chicken Rice (雞肉飯)', dinner: 'Braised Silver Carp (滷銀斑魚)' }
  };

  constructor(
    private mealAssignmentService: MealAssignmentService,
    private mealsService: MealsService
  ) {}

  ngOnInit(): void {
    if (this.patientId) {
      this.fetchMealAssignment();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {

    if (changes['dayCycle'] && this.dayCycle) {
      this.loadMockData(this.dayCycle);
    }
    else if (
      (changes['patientId'] || changes['mealType']) &&
      !changes['patientId']?.isFirstChange()
    ) {
      this.fetchMealAssignment();
    }
  }

  private loadMockData(day: number): void {
    this.loading = true;

    setTimeout(() => {
      const safeDay = ((day - 1) % 14) + 1;
      
      const menuForDay = this.cycleMenu[safeDay];

      if (menuForDay) {
        let mockId = 1; 
        let description = menuForDay.lunch;
        
        let image = 'assets/images/meals/meal-1.png'; 

        if (this.mealType === 'dinner') {
          mockId = 2; 
          description = menuForDay.dinner;
          image = 'assets/images/meals/meal-2.png';
        }

        this.assignedMeal = {
          id: mockId, 
          meal_time: this.mealType,
          day_cycle: String(safeDay),
          meal_description: description,
          plate_type: 'ceramic_bowl',
          ingredients: [],
          image: image, 
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      } else {
        this.assignedMeal = null;
      }

      this.updateAssignedMeal(this.assignedMeal);
      this.loading = false;
    }, 300); 
  }

  fetchMealAssignment(): void {
    this.loading = true;
    this.error = null;

    this.mealAssignmentService.getAssignment(this.patientId, this.mealType, this.dayCycle)
      .subscribe({
        next: (assignments) => {
          if (assignments.length > 0) {
            this.mealId = assignments[0].meal;
            if (this.mealId) {
              this.mealsService.getMeal(this.mealId).subscribe({
                next: (meal: Meal) => this.updateAssignedMeal(meal),
                error: (err) => {
                  console.error('Error fetching meal details:', err);
                  // Fallback to Mock if API details fail
                  if (this.dayCycle) this.loadMockData(this.dayCycle);
                }
              });
            } else {
              // Fallback to Mock if ID is missing
              if (this.dayCycle) this.loadMockData(this.dayCycle);
            }
          } else {
            // Fallback to Mock if no assignment exists on server
            if (this.dayCycle) this.loadMockData(this.dayCycle);
          }
        },
        error: (err) => {
          console.error('API connection failed, using mock data:', err);
          // Fallback to Mock on API error
          if (this.dayCycle) this.loadMockData(this.dayCycle);
        }
      });
  }

  private updateAssignedMeal(meal: Meal | null) {
    this.assignedMeal = meal;
    this.mealsStatus.emit(!!meal); 
    this.loading = false;
  }

  get mealCode(): string {
    if (!this.assignedMeal) return '';
    const mealLetter = this.mealType.charAt(0).toUpperCase();
    const dayCycle = this.assignedMeal.day_cycle ?? '';
    const mealId = this.assignedMeal.id ?? '';
    return `${mealLetter}-${dayCycle}-0${mealId}`;
  }
}