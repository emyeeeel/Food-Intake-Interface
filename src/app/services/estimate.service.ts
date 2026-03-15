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

  constructor(private http: HttpClient) {}

  getResultsByIntakeId(intakeId: number): Observable<EstimationResult[]> {
    return this.http.get<EstimationResult[]>(
      `${environment.apiBaseUrl}/api/estimate/results/by-intake/${intakeId}/`
    );
  }

  runEstimation(intakeId: number): Observable<EstimationResult> {
    return this.http.post<EstimationResult>(
      `${environment.apiBaseUrl}/api/estimate/run/${intakeId}/`,
      {}
    );
  }
}