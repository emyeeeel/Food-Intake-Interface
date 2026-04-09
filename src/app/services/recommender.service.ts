import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class RecommenderService {
  private baseUrl = '/recommender-api/api';

  constructor(private http: HttpClient) {}

  /**
   * Summary of patient's meal intake on the current day
   * GET /api/patient/<pk>/meal-intake
   */
  getDailyMealIntakeSummary(patientId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/patient/${patientId}/meal-intake`);
  }

  /**
   * Dietary recommendations based on patient's meal intake on the current day
   * GET /api/recommend/patient/<pk>/daily
   */
  getDailyRecommendations(patientId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/recommend/patient/${patientId}/daily`);
  }

  /**
   * Dietary recommendations based on patient's meal intake on the past 7 days
   * GET /api/recommend/patient/<pk>/weekly
   */
  getWeeklyRecommendations(patientId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/recommend/patient/${patientId}/weekly`);
  }

  /**
   * Dietary recommendations on Macronutrients & Micronutrients based on patient's DRI
   * GET /api/recommend/patient/<pk>/general
   */
  getGeneralNutrientRecommendations(patientId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/recommend/patient/${patientId}/general`);
  }
}