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

generateIngredientsFromMeal(mealData: { 
  meal_name: string, 
  meal?: string, 
  meal_time?: string,
  day_cycle?: string,
  plate_type?: string,
  image?: string | File 
}): Observable<any> {
  const url = `${this.baseUrl}/api/generate-ingredients-from-meal/`;
  
  // Create FormData for file upload support
  const formData = new FormData();
  
  formData.append('meal_name', mealData.meal_name);
  
  if (mealData.meal) {
    formData.append('meal', mealData.meal);
  }
  
  if (mealData.meal_time) {
    formData.append('meal_time', mealData.meal_time);
  }
  
  if (mealData.day_cycle) {
    formData.append('day_cycle', mealData.day_cycle);
  }
  
  if (mealData.plate_type) {
    formData.append('plate_type', mealData.plate_type);
  }
  
  if (mealData.image) {
    if (mealData.image instanceof File) {
      formData.append('image', mealData.image);
    } else {
      formData.append('image_url', mealData.image);
    }
  }
  
  return this.http.post<any>(url, formData);
}
}
