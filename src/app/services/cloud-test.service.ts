import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CloudTestService {

  constructor(private http: HttpClient) { }

  private patientApiUrl = '/api/get_da_patient_data_1_private.php';
  private foodApiUrl = '/api/get_da_food_data_private.php';
  private mealApiUrl = '/api/get_da_meal_data_private.php';

  //this is post since you need check in key to access data (not public)
  getPatientData(): Observable<any> { 
    const body = { check_in: 'sjj4njc09ajsj123dui' };
    return this.http.post<any>(this.patientApiUrl, body);
  }

  getFoodData(): Observable<any> { 
    const body = { check_in: 'sjj4njc09ajsj123dui' };
    return this.http.post<any>(this.foodApiUrl, body);
  }

  getMealData(patientNumber: string): Observable<any> { 
    const body = { 
      check_in: 'sjj4njc09ajsj123dui',
      patient_number: patientNumber
    };
    return this.http.post<any>(this.mealApiUrl, body);
  }

}
