import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { MealRecommendationsResponse } from '../models/meal-recommendation.model';

@Injectable({
  providedIn: 'root',
})
export class AlternativeMealsService {
  private readonly apiUrl = `${environment.apiBaseUrl}/api/meals/recommendations/`;

  constructor(private http: HttpClient) {}

  getRecommendations(
    ltcPatientId: number,
    period: 'day' | 'week' | 'month',
    topN?: number
  ): Observable<MealRecommendationsResponse> {
    let params = new HttpParams()
      .set('ltc_patient_id', ltcPatientId.toString())
      .set('period', period);

    if (topN !== undefined) {
      params = params.set('top_n', topN.toString());
    }

    return this.http.get<MealRecommendationsResponse>(this.apiUrl, { params });
  }

  getDayRecommendations(ltcPatientId: number): Observable<MealRecommendationsResponse> {
    return this.getRecommendations(ltcPatientId, 'day');
  }

  getWeekRecommendations(ltcPatientId: number): Observable<MealRecommendationsResponse> {
    return this.getRecommendations(ltcPatientId, 'week');
  }

  getMonthRecommendations(ltcPatientId: number, topN = 5): Observable<MealRecommendationsResponse> {
    return this.getRecommendations(ltcPatientId, 'month', topN);
  }
}
