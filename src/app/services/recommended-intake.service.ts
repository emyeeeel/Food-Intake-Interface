import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RecommendedIntakeApiResponse } from '../models/recommended-intake-api.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RecommendedIntakeService {
  private baseUrl = environment.apiBaseUrl;
  private apiUrl = `${this.baseUrl}/api/patients/`;

  constructor(private http: HttpClient) {}

  getRecommendedIntake(patientId: number): Observable<RecommendedIntakeApiResponse> {
    return this.http.get<RecommendedIntakeApiResponse>(`${this.apiUrl}${patientId}/recommended-intake/`);
  }
}
