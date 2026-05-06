import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class RecommenderService {
  // private baseUrl = '/recommender-api/api';

  // constructor(private http: HttpClient) {}

  // /**
  //  * Summary of patient's meal intake on the current day
  //  * GET /api/patient/<pk>/meal-intake
  //  */
  // getDailyMealIntakeSummary(patientId: number): Observable<any> {
  //   return this.http.get(`https://fgktksbk-8001.jpe1.devtunnels.ms/api/patient/${patientId}/meal-intake`);
  // }

  // /**
  //  * Dietary recommendations based on patient's meal intake on the current day
  //  * GET /api/recommend/patient/<pk>/daily
  //  */
  // getDailyRecommendations(patientId: number): Observable<any> {
  //   return this.http.get(`${this.baseUrl}/recommend/patient/${patientId}/daily`);
  // }

  // /**
  //  * Dietary recommendations based on patient's meal intake on the past 7 days
  //  * GET /api/recommend/patient/<pk>/weekly
  //  */
  // getWeeklyRecommendations(patientId: number): Observable<any> {
  //   return this.http.get(`${this.baseUrl}/recommend/patient/${patientId}/weekly`);
  // }

  // /**
  //  * Dietary recommendations on Macronutrients & Micronutrients based on patient's DRI
  //  * GET /api/recommend/patient/<pk>/general
  //  */
  // getGeneralNutrientRecommendations(patientId: number): Observable<any> {
  //   return this.http.get(`${this.baseUrl}/recommend/patient/${patientId}/general`);
  // }

  private apiUrl = 'https://fgktksbk-8001.jpe1.devtunnels.ms/api';
  //   private apiUrl = 'https://z76tm28g-8001.asse.devtunnels.ms/api'; - AJ laptop endpoint
  private baseUrl = '/recommender-api/api';

  constructor(private http: HttpClient) { }

  /**
   * Summary of patient's meal intake on the current day
   * GET /api/patient/<pk>/meal-intake
   */
  getDailyMealIntakeSummary(patientId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/patient/${patientId}/meal-intake`);
  }

  // DAILY - By Patient and Date
  getDailyMealIntakeSummaryByDate(patientId: number, date: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/patient/${patientId}/meal-intake/${date}`);
  }

  // DAILY - By Patient
  getDailyNutritionAndFoodRecommendations(patientId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/recommend/nutri-and-food/patient/${patientId}/daily/`);
  }

  // WEEKLY - By Patient
  getWeeklyNutritionAndFoodRecommendations(patientId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/recommend/nutri-and-food/patient/${patientId}/weekly/`);
  }

  // MONTHLY - By Patient
  getMonthlyNutritionAndFoodRecommendations(patientId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/recommend/nutri-and-food/patient/${patientId}/monthly/`);
  }

  // DAILY - By Patient & Date
  getDailyNutritionAndFoodRecommendationsByDate(patientId: number, date: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/recommend/nutri-and-food/patient/${patientId}/daily/${date}/`);
  }

  // WEEKLY - By Patient & Date
  getWeeklyNutritionAndFoodRecommendationsByDate(patientId: number, date: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/recommend/nutri-and-food/patient/${patientId}/weekly/${date}/`);
  }

  // MONTHLY - By Patient & Date
  getMonthlyNutritionAndFoodRecommendationsByDate(patientId: number, date: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/recommend/nutri-and-food/patient/${patientId}/monthly/${date}/`);
  }

}