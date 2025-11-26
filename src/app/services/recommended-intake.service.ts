import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RecommendedIntake } from '../models/recommended-intake.model';

@Injectable({
  providedIn: 'root'
})
export class RecommendedIntakeService {
  private apiUrl = 'http://127.0.0.1:8000/api/patients/';

  constructor(private http: HttpClient) {}

  getRecommendedIntake(patientId: number): Observable<RecommendedIntake> {
    return this.http.get<RecommendedIntake>(`${this.apiUrl}${patientId}/recommended-intake/`);
  }
}
