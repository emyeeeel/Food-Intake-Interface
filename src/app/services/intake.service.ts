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

  getIntakeByLtcPatientId(ltcPatientId: number): Observable<IntakeRecord[]> {
    const params = new HttpParams().set('ltc_patient_id', ltcPatientId.toString());

    return this.http.get<IntakeRecord[]>(this.apiUrl, { params });
  }
    
}
