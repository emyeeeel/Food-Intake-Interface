import { HttpClient } from '@angular/common/http';
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

  updateMeal(id: number, meal: Meal): Observable<Meal> {
    return this.http.put<Meal>(`${this.apiUrl}${id}/`, meal);
  }
}
