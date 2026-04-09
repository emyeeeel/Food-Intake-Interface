import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Ingredient } from '../models/ingredient.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class IngredientsService {
  private baseUrl = environment.apiBaseUrl;
  private apiUrl = `${this.baseUrl}/api/ingredients/`;

  constructor(private http: HttpClient) {}

  getIngredient(id: number): Observable<Ingredient> {
    return this.http.get<Ingredient>(`${this.apiUrl}${id}/`);
  }
  
  getIngredients(): Observable<Ingredient[]> {
    return this.http.get<Ingredient[]>(this.apiUrl);
  }
}
