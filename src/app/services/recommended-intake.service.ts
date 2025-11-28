import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RecommendedIntakeApiResponse } from '../models/recommended-intake-api.model';

@Injectable({
  providedIn: 'root'
})
export class RecommendedIntakeService {
  private apiUrl = 'http://127.0.0.1:8000/api/patients/';

  constructor(private http: HttpClient) {}

  getRecommendedIntake(patientId: number): Observable<RecommendedIntakeApiResponse> {
    return this.http.get<RecommendedIntakeApiResponse>(`${this.apiUrl}${patientId}/recommended-intake/`);
  }
}
