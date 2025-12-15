import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MealAssignment } from '../models/meal-assignment.mode';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MealAssignmentService {

  private baseUrl = environment.apiBaseUrl;
  private apiUrl = `${this.baseUrl}/api/meal-assignments/`;

  constructor(private http: HttpClient) {}

  // Fetch all meal assignments for a patient
  getAssignmentsByPatient(patientId: number): Observable<MealAssignment[]> {
    return this.http.get<MealAssignment[]>(`${this.apiUrl}?patient=${patientId}`);
  }

  // Optionally, filter by meal type
  getAssignment(patientId: number, mealType: string, dayCycle?: number): Observable<MealAssignment[]> {
    let url = `${this.apiUrl}?patient=${patientId}&meal_type=${mealType}`;
    if (dayCycle) {
      url += `&day_cycle=${dayCycle}`;
    }
    return this.http.get<MealAssignment[]>(url);
  }
}
