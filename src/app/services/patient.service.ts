import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { Patient } from '../models/patient.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PatientService {
  private baseUrl = environment.apiBaseUrl;
  private apiUrl = `${this.baseUrl}/api/patients/`;
  

  constructor(private http: HttpClient) {}

  getPatient(id: number): Observable<Patient> {
    return this.http.get<Patient>(`${this.apiUrl}${id}/`);
  }

  getPatientCount(): Observable<number> {
    return this.http.get<Patient[]>(this.apiUrl).pipe(
      map(patients => patients.length)
    );
  }
}
