import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { IntakeRecord } from '../models/food-intake.model';

@Injectable({
  providedIn: 'root',
})
export class IntakeService {
  private baseUrl = environment.apiBaseUrl;
  private apiUrl = `${this.baseUrl}/api/food-intakes/`;
  
  constructor(private http: HttpClient) {}

  getIntakes(): Observable<IntakeRecord[]> {
    return this.http.get<IntakeRecord[]>(this.apiUrl);
  }

  getIntakeByLtcPatientId(ltcPatientId: number): Observable<IntakeRecord[]> {
    const params = new HttpParams().set('ltc_patient_id', ltcPatientId.toString());

    return this.http.get<IntakeRecord[]>(this.apiUrl, { params });
  }
  
  createIntake(intake: Partial<IntakeRecord>): Observable<IntakeRecord> {
    const formData = new FormData();
    formData.append('meal', intake.meal?.toString() || '');
    formData.append('ltc_patient', intake.ltc_patient?.toString() || '');
    formData.append('weight_g', intake.weight_g?.toString() || '');
    formData.append('volume_ml', intake.volume_ml?.toString() || '');
    formData.append('recorded_at', intake.recorded_at || '');
    formData.append('meal_phase', intake.meal_phase?.toString() || '');
    if (intake.image instanceof File) {
      formData.append('image', intake.image);
    }
    return this.http.post<IntakeRecord>(this.apiUrl, formData);
  }
}
