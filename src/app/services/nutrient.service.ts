import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Nutrient } from '../models/nutrient.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NutrientService {
  private baseUrl = environment.apiBaseUrl;
  private apiUrl = `${this.baseUrl}/api/nutrients/`;

  constructor(private http: HttpClient) { }

  getNutrient(id: number): Observable<Nutrient> {
      return this.http.get<Nutrient>(`${this.apiUrl}${id}/`);
  }

  getNutrients(): Observable<Nutrient[]> {
    return this.http.get<Nutrient[]>(this.apiUrl);
  }
}
