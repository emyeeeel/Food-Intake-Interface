import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { FoodGroup } from '../models/food-group.model';
import { catchError, Observable, retry, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FoodGroupService {
  private baseUrl = environment.apiBaseUrl;
  private apiUrl = `${this.baseUrl}/api/food-groups/`;

  constructor(private http: HttpClient) { }

  getFoodGroup(id: number): Observable<FoodGroup> {
      return this.http.get<FoodGroup>(`${this.apiUrl}${id}/`);
  }

  getFoodGroups(): Observable<FoodGroup[]> {
    return this.http.get<FoodGroup[]>(this.apiUrl);
  }
}
