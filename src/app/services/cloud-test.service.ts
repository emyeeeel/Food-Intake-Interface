import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CloudTestService {

  constructor(private http: HttpClient) { }

  private apiUrl = '/api/get_da_patient_data_1_private.php';

  //this is post since you need check in key to access data (not public)
  getDaPatientData(): Observable<any> { 
    const body = { check_in: 'sjj4njc09ajsj123dui' };
    return this.http.post<any>(this.apiUrl, body);
  }
}
