import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GetAnalysisService {
  private baseUrl = `https://jqh2g82b-8000.asse.devtunnels.ms`;
  private apiUrl = `${this.baseUrl}/api/rag/query/`;

  constructor(private http: HttpClient) { }

  // get analysis pass query
  getAnalysis(query: string) : Observable<{ recommendation: string }> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      // Add any other headers from your Postman request
    });
  
    const body = { query: query };
  
    return this.http.post<{ recommendation: string }>(this.apiUrl, body, { headers });
  }

  testPing(prompt: string){
    const testUrl = `${this.baseUrl}/api/groq/chat`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });
    
    const body = { prompt: prompt }; // Use the actual prompt parameter
    
    return this.http.post<any>(testUrl, body, { headers });
  }
}
