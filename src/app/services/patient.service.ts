import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { Patient } from '../models/patient.model';

@Injectable({
  providedIn: 'root'
})
export class PatientService {
  private apiUrl = 'http://127.0.0.1:8000/api/patients/';

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
