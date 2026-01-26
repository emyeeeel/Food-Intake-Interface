import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Meal } from '../models/meal.model';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MealsService {

  private baseUrl = environment.apiBaseUrl;
  private apiUrl = `${this.baseUrl}/api/meals/`;

  constructor(private http: HttpClient) {}

  getMeal(id: number): Observable<Meal> {
    return this.http.get<Meal>(`${this.apiUrl}${id}/`);
  }

  getMeals(): Observable<Meal[]> {
    return this.http.get<Meal[]>(this.apiUrl);
  }

  getMealCount(): Observable<number> {
    return this.http.get<Meal[]>(this.apiUrl).pipe(
      map(meals => meals.length)
    );
  }

  generateIngredientsFromMeal(formData: FormData): Observable<any> {
    const url = `${this.baseUrl}/api/generate-ingredients-from-meal/`;
    return this.http.post<any>(url, formData);
  }

  captureMealImage() {
    return this.http.get(
      'http://127.0.0.1:8000/api/capture/meal/',
      { responseType: 'blob' }
    );
  }

  getMealByName(mealName: string): Observable<Meal[]> {
    const params = { meal_name: mealName };
    return this.http.get<Meal[]>(this.apiUrl, { params });
  }

  addMeal(meal: Meal): Observable<Meal> {
    return this.http.post<Meal>(this.apiUrl, meal); 
  }

  updateMeal(id: number, data: FormData): Observable<Meal> {
    return this.http.put<Meal>(`${this.apiUrl}${id}/`, data);
  }

  updateMealCycle(excelFile: File): Observable<any> {
    const url = `${this.baseUrl}/api/add_ltc_meal_cycle/`;
    
    const formData = new FormData();
    formData.append('excel_file', excelFile, excelFile.name);
    
    return this.http.post<any>(url, formData);
  }

  /**
   * Get meals filtered by day cycle and meal time
   * @param dayCycle Day cycle number (1-14)
   * @param mealTime Meal time ('午餐' for lunch, '晚餐' for dinner)
   * @returns Observable of filtered meals
   */
  getMealsByDayCycleAndTime(dayCycle: number, mealTime: string): Observable<Meal[]> {
    let params = new HttpParams()
      .set('day_cycle', dayCycle.toString())
      .set('meal_time', mealTime);

    return this.http.get<Meal[]>(this.apiUrl, { params });
  }

  /**
   * Get meals filtered by day cycle only
   * @param dayCycle Day cycle number (1-14)
   * @returns Observable of filtered meals
   */
  getMealsByDayCycle(dayCycle: number): Observable<Meal[]> {
    let params = new HttpParams().set('day_cycle', dayCycle.toString());
    return this.http.get<Meal[]>(this.apiUrl, { params });
  }

  /**
   * Get meals filtered by meal time only
   * @param mealTime Meal time ('午餐' for lunch, '晚餐' for dinner)
   * @returns Observable of filtered meals
   */
  getMealsByTime(mealTime: string): Observable<Meal[]> {
    let params = new HttpParams().set('meal_time', mealTime);
    return this.http.get<Meal[]>(this.apiUrl, { params });
  }

  /**
   * Get lunch meals for a specific day cycle
   * @param dayCycle Day cycle number (1-14)
   * @returns Observable of lunch meals
   */
  getLunchMealsByDay(dayCycle: number): Observable<Meal[]> {
    return this.getMealsByDayCycleAndTime(dayCycle, '午餐');
  }

  /**
   * Get dinner meals for a specific day cycle
   * @param dayCycle Day cycle number (1-14)
   * @returns Observable of dinner meals
   */
  getDinnerMealsByDay(dayCycle: number): Observable<Meal[]> {
    return this.getMealsByDayCycleAndTime(dayCycle, '晚餐');
  }

  /**
   * Get all meals for a specific day (both lunch and dinner)
   * @param dayCycle Day cycle number (1-14)
   * @returns Observable with an object containing lunch and dinner meals
   */
  getMealsForDay(dayCycle: number): Observable<{lunch: Meal[], dinner: Meal[]}> {
    return new Observable(observer => {
      // Get both lunch and dinner meals simultaneously
      const lunchRequest = this.getLunchMealsByDay(dayCycle);
      const dinnerRequest = this.getDinnerMealsByDay(dayCycle);

      // Combine both requests
      Promise.all([
        lunchRequest.toPromise(),
        dinnerRequest.toPromise()
      ]).then(([lunchMeals, dinnerMeals]) => {
        observer.next({
          lunch: lunchMeals || [],
          dinner: dinnerMeals || []
        });
        observer.complete();
      }).catch(error => {
        observer.error(error);
      });
    });
  }
}
