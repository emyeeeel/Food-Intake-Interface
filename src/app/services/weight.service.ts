import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class WeightService {
  // private baseUrl = environment.apiBaseUrl;
  private baseUrl = `https://h3vkhzth-8000.asse.devtunnels.ms`;
  private apiUrl = `${this.baseUrl}/api/weights/get-net-weight/`;

  constructor(private http: HttpClient) {}

  getNetWeight(): Observable<{ net_weight: number; raw_weight: number; container: string }> {
    return this.http.get<{ net_weight: number; raw_weight: number; container: string }>(this.apiUrl);
  }
}
