import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MealAssignment, CreateMealAssignment, MealAssignmentRequest } from '../models/meal-assignment.mode';
import { environment } from '../../environments/environment';

export interface BulkAssignResponse {
  detail: string;
  created: number;
  skipped: number;
  meal_count: number;
  patient_count: number;
}

@Injectable({
  providedIn: 'root'
})
export class MealAssignmentService {

  private baseUrl = environment.apiBaseUrl;
  private apiUrl = `${this.baseUrl}/api/meal-assignments/`;

  constructor(private http: HttpClient) {}

  /**
   * Get all meal assignments
   * @returns Observable of all meal assignments
   */
  getAllMealAssignments(): Observable<MealAssignment[]> {
    return this.http.get<MealAssignment[]>(this.apiUrl);
  }

  /**
   * Bulk-create assignments for the cartesian product of mealIds × patients.
   * Pass `null` for ltcPatientIds to assign to all LTCPatients. Idempotent.
   */
  bulkAssign(
    mealIds: number[],
    ltcPatientIds: number[] | null,
  ): Observable<BulkAssignResponse> {
    return this.http.post<BulkAssignResponse>(
      `${this.apiUrl}bulk_assign/`,
      { meal_ids: mealIds, ltc_patient_ids: ltcPatientIds },
    );
  }

  /**
   * Get a specific meal assignment by ID
   * @param id Meal assignment ID
   * @returns Observable of meal assignment
   */
  getMealAssignment(id: number): Observable<MealAssignment> {
    return this.http.get<MealAssignment>(`${this.apiUrl}${id}/`);
  }

  /**
   * Get meal assignments filtered by LTC patient ID
   * @param ltcPatientId LTC patient ID
   * @returns Observable of meal assignments for the LTC patient
   */
  getMealAssignmentsByLTCPatient(ltcPatientId: number): Observable<MealAssignment[]> {
    const params = new HttpParams().set('ltc_patient', ltcPatientId.toString());
    return this.http.get<MealAssignment[]>(this.apiUrl, { params });
  }

  /**
   * Get meal assignments filtered by regular patient ID
   * @param patientId Regular patient ID
   * @returns Observable of meal assignments for the patient
   */
  getMealAssignmentsByPatient(patientId: number): Observable<MealAssignment[]> {
    const params = new HttpParams().set('patient', patientId.toString());
    return this.http.get<MealAssignment[]>(this.apiUrl, { params });
  }

  /**
   * Get meal assignments with multiple filters
   * @param filters Filter parameters
   * @returns Observable of filtered meal assignments
   */
  getMealAssignmentsWithFilters(filters: {
    ltc_patient?: number;
    patient?: number;
    meal_type?: string;
    day_cycle?: number;
    meal?: number;
  }): Observable<MealAssignment[]> {
    let params = new HttpParams();
    
    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof typeof filters];
      if (value !== undefined && value !== null) {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get<MealAssignment[]>(this.apiUrl, { params });
  }

  /**
   * Create a single meal assignment
   * @param assignment Meal assignment data
   * @returns Observable of created meal assignment
   */
  createMealAssignment(assignment: CreateMealAssignment): Observable<MealAssignment> {
    return this.http.post<MealAssignment>(this.apiUrl, assignment);
  }

  /**
   * Create multiple meal assignments for LTC patient
   * @param ltcPatientId LTC patient ID
   * @param mealIds Array of meal IDs to assign
   * @returns Observable of created meal assignments
   */
  createMealAssignmentsForLTCPatient(
    ltcPatientId: number, 
    mealIds: number[]
  ): Observable<MealAssignment[]> {
    const assignments = mealIds.map(mealId => ({
      ltc_patient: ltcPatientId,
      meal: mealId
    }));

    // Create all assignments in parallel
    const requests = assignments.map(assignment => 
      this.http.post<MealAssignment>(this.apiUrl, assignment)
    );

    // Return all created assignments
    return new Observable(observer => {
      Promise.all(requests.map(req => req.toPromise()))
        .then(results => {
          observer.next(results.filter(Boolean) as MealAssignment[]);
          observer.complete();
        })
        .catch(error => {
          observer.error(error);
        });
    });
  }

  /**
   * Create multiple meal assignments for regular patient
   * @param patientId Patient ID
   * @param mealIds Array of meal IDs to assign
   * @returns Observable of created meal assignments
   */
  createMealAssignmentsForPatient(
    patientId: number, 
    mealIds: number[]
  ): Observable<MealAssignment[]> {
    const assignments = mealIds.map(mealId => ({
      patient: patientId,
      meal: mealId
    }));

    const requests = assignments.map(assignment => 
      this.http.post<MealAssignment>(this.apiUrl, assignment)
    );

    return new Observable(observer => {
      Promise.all(requests.map(req => req.toPromise()))
        .then(results => {
          observer.next(results.filter(Boolean) as MealAssignment[]);
          observer.complete();
        })
        .catch(error => {
          observer.error(error);
        });
    });
  }

  /**
   * Bulk create meal assignments with detailed structure
   * This method handles the meal assignment request format from add-patient component
   * @param request Meal assignment request with patient info and multiple day assignments
   * @returns Observable of all created meal assignments
   */
  createBulkMealAssignments(request: MealAssignmentRequest): Observable<MealAssignment[]> {
    const assignments: CreateMealAssignment[] = [];

    // Process each day assignment
    request.meal_assignments.forEach(dayAssignment => {
      // Add lunch meals
      if (dayAssignment.lunch_meal_ids && dayAssignment.lunch_meal_ids.length > 0) {
        dayAssignment.lunch_meal_ids.forEach(mealId => {
          assignments.push({
            ltc_patient: request.ltc_patient_id,
            patient: request.patient_id,
            meal: mealId
          });
        });
      }

      // Add dinner meals
      if (dayAssignment.dinner_meal_ids && dayAssignment.dinner_meal_ids.length > 0) {
        dayAssignment.dinner_meal_ids.forEach(mealId => {
          assignments.push({
            ltc_patient: request.ltc_patient_id,
            patient: request.patient_id,
            meal: mealId
          });
        });
      }
    });

    // Create all assignments
    const requests = assignments.map(assignment => 
      this.http.post<MealAssignment>(this.apiUrl, assignment)
    );

    return new Observable(observer => {
      if (requests.length === 0) {
        observer.next([]);
        observer.complete();
        return;
      }

      Promise.all(requests.map(req => req.toPromise()))
        .then(results => {
          observer.next(results.filter(Boolean) as MealAssignment[]);
          observer.complete();
        })
        .catch(error => {
          observer.error(error);
        });
    });
  }

  /**
   * Update a meal assignment
   * @param id Meal assignment ID
   * @param assignment Updated meal assignment data
   * @returns Observable of updated meal assignment
   */
  updateMealAssignment(id: number, assignment: Partial<CreateMealAssignment>): Observable<MealAssignment> {
    return this.http.put<MealAssignment>(`${this.apiUrl}${id}/`, assignment);
  }

  /**
   * Delete a meal assignment
   * @param id Meal assignment ID
   * @returns Observable of deletion result
   */
  deleteMealAssignment(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}${id}/`);
  }

  /**
   * Delete multiple meal assignments
   * @param ids Array of meal assignment IDs to delete
   * @returns Observable of deletion results
   */
  deleteMealAssignments(ids: number[]): Observable<void> {
    const deleteRequests = ids.map(id => 
      this.http.delete<void>(`${this.apiUrl}${id}/`).toPromise()
    );

    return new Observable(observer => {
      Promise.all(deleteRequests)
        .then(() => {
          observer.next();
          observer.complete();
        })
        .catch(error => {
          observer.error(error);
        });
    });
  }

  /**
   * Get meal assignments for a specific day cycle and meal type
   * @param dayCycle Day cycle number
   * @param mealType Meal type ('午餐' or '晚餐')
   * @returns Observable of filtered meal assignments
   */
  getMealAssignmentsByDayAndType(dayCycle: number, mealType: string): Observable<MealAssignment[]> {
    const params = new HttpParams()
      .set('day_cycle', dayCycle.toString())
      .set('meal_type', mealType);
    
    return this.http.get<MealAssignment[]>(this.apiUrl, { params });
  }

  /**
   * Get today's meal assignments for a specific patient
   * @param patientId Patient ID (regular or LTC)
   * @param isLTCPatient Whether this is an LTC patient
   * @param dayCycle Current day cycle
   * @returns Observable of today's meal assignments
   */
  getTodaysMealAssignments(
    patientId: number,
    isLTCPatient: boolean,
    dayCycle: number
  ): Observable<MealAssignment[]> {
    let params = new HttpParams().set('day_cycle', dayCycle.toString());

    if (isLTCPatient) {
      params = params.set('ltc_patient', patientId.toString());
    } else {
      params = params.set('patient', patientId.toString());
    }

    return this.http.get<MealAssignment[]>(this.apiUrl, { params });
  }

  /**
   * Mode-aware lookup. Caller supplies menu_mode filter fields (day_cycle or
   * serve_date) plus the patient filter; this service adds the patient param.
   */
  getMealAssignmentsWithRawFilters(
    filters: { [key: string]: string | number | undefined }
  ): Observable<MealAssignment[]> {
    let params = new HttpParams();
    Object.keys(filters).forEach(key => {
      const value = filters[key];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<MealAssignment[]>(this.apiUrl, { params });
  }
}
