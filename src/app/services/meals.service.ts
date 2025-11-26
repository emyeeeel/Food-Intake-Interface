import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Meal } from '../models/meal.model';
import { map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MealsService {

  private apiUrl = 'http://127.0.0.1:8000/api/meals/';

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
}
