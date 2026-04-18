import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Meal } from '../models/meal.model';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface MealSummary {
  id: number;
  meal_name: string;
  meal_time: string;
  menu_mode: 'cyclic' | 'open';
  day_cycle: number | null;
  serve_date: string | null;
  plate_type: string | null;
  is_archived: boolean;
}

export interface MergePreviewResponse {
  canonical: MealSummary;
  sources: MealSummary[];
  impact: {
    reassigned_assignments: number;
    reassigned_intakes: number;
    sources_to_delete: number;
  };
  warnings: string[];
}

export interface MergeResponse {
  detail: string;
  canonical_id: number;
  merged_count: number;
  reassigned_assignments: number;
  reassigned_intakes: number;
  deleted_meals: number;
  warnings: string[];
}

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

  deleteMeal(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}${id}/`);
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

  updateMealJson(id: number, data: any): Observable<Meal> {
    return this.http.patch<Meal>(`${this.apiUrl}${id}/`, data);
  }

  /** Phase 2 soft-delete. Returns {id, is_archived: true}. Idempotent. */
  archiveMeal(id: number): Observable<{ id: number; is_archived: boolean }> {
    return this.http.post<{ id: number; is_archived: boolean }>(
      `${this.apiUrl}${id}/archive/`, {}
    );
  }

  /** Phase 2 soft-delete restore. Returns {id, is_archived: false}. Idempotent. */
  unarchiveMeal(id: number): Observable<{ id: number; is_archived: boolean }> {
    return this.http.post<{ id: number; is_archived: boolean }>(
      `${this.apiUrl}${id}/unarchive/`, {}
    );
  }

  /** Phase 4 merge dry-run. Returns impact counts + warnings without mutating anything. */
  mergePreview(canonicalId: number, sourceIds: number[]): Observable<MergePreviewResponse> {
    return this.http.post<MergePreviewResponse>(
      `${this.baseUrl}/api/meals/merge_preview/`,
      { canonical_id: canonicalId, source_ids: sourceIds }
    );
  }

  /** Phase 4 merge. Atomic: re-points assignments + intakes, then deletes sources. */
  mergeMeals(canonicalId: number, sourceIds: number[]): Observable<MergeResponse> {
    return this.http.post<MergeResponse>(
      `${this.baseUrl}/api/meals/merge/`,
      { canonical_id: canonicalId, source_ids: sourceIds }
    );
  }

  updateMealCycle(excelFile: File): Observable<any> {
    const url = `${this.baseUrl}/api/add_ltc_meal_cycle/`;

    const formData = new FormData();
    formData.append('excel_file', excelFile, excelFile.name);

    return this.http.post<any>(url, formData);
  }

  /**
   * Open-mode Excel import. Backend reads 日期/用餐時間/菜色名稱 and writes
   * meals with menu_mode='open' + serve_date=<parsed date>.
   */
  addOpenMealCycle(excelFile: File, replaceExisting = false, serveDate?: string): Observable<any> {
    const url = `${this.baseUrl}/api/add_open_meal_cycle/`;

    const formData = new FormData();
    formData.append('excel_file', excelFile, excelFile.name);
    if (replaceExisting) {
      formData.append('replace_existing', 'true');
    }
    if (serveDate) {
      formData.append('serve_date', serveDate);
    }
    return this.http.post<any>(url, formData);
  }

  /**
   * Generic filtered lookup. Pass any combination of backend filter params
   * (menu_mode, day_cycle, serve_date, serve_date_from/to, meal_time).
   */
  getMealsFiltered(params: { [key: string]: string | number | undefined }): Observable<Meal[]> {
    let httpParams = new HttpParams();
    Object.keys(params).forEach(key => {
      const value = params[key];
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    });
    return this.http.get<Meal[]>(this.apiUrl, { params: httpParams });
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
