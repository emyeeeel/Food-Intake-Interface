import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { Patient } from '../models/patient.model';
import { environment } from '../../environments/environment';
import { LTCPatient } from '../models/ltc-patient.model';

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

  getLTCPatients(): Observable<LTCPatient[]> {
    return this.http.get<LTCPatient[]>(`${this.baseUrl}/api/ltc-patients`);
  }

  postLTCPatient(ltcPatient: LTCPatient): Observable<LTCPatient> {
    return this.http.post<LTCPatient>(`${this.baseUrl}/api/ltc-patients`, ltcPatient);
  }

  getLTCPatient(id: number): Observable<LTCPatient> {
    return this.http.get<LTCPatient>(`${this.baseUrl}/api/ltc-patients/${id}`);
  }

  updateLTCPatient(id: number, ltcPatient: LTCPatient): Observable<LTCPatient> {
    return this.http.put<LTCPatient>(`${this.baseUrl}/api/ltc-patients/${id}`, ltcPatient);
  }

  deleteLTCPatient(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/api/ltc-patients/${id}`);
  }

  uploadResidentExcel(file: File): Observable<{ message: string; filename: string; stored_path: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ message: string; filename: string; stored_path: string }>(
      `${this.baseUrl}/api/ltc-patients/resident-excel/upload`,
      formData
    );
  }

  importResidentExcel(): Observable<{ message: string; summary: { created: number; updated: number; skipped: number }; total_patients: number }> {
    return this.http.post<{ message: string; summary: { created: number; updated: number; skipped: number }; total_patients: number }>(
      `${this.baseUrl}/api/ltc-patients/resident-excel/import`,
      {}
    );
  }

  getLTCPatientCount(): Observable<number> {
    return this.http.get<LTCPatient[]>(`${this.baseUrl}/api/ltc-patients`).pipe(
      map(ltcPatients => ltcPatients.length)
    );
  }
}
