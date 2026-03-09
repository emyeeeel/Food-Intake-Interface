// src/app/services/estimation.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { EstimationResult } from '../models/estimation.model';

@Injectable({
  providedIn: 'root'
})
export class EstimationService {
  private apiUrl = `${environment.apiBaseUrl}/api/estimate/results/by-intake/`;

  constructor(private http: HttpClient) {}

  getResultsByIntakeId(intakeId: number): Observable<EstimationResult[]> {
    return this.http.get<EstimationResult[]>(`${this.apiUrl}${intakeId}/`);
  }
}