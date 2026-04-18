import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ModuleConfig {
  id: number;
  module_key: string;
  display_name: string;
  route_path: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
  is_enabled: boolean;
  is_engineering: boolean;
  is_visible: boolean;
}

export interface EngineeringSession {
  token: string;
  expires_at: string;
  timeout_minutes: number;
  reminder_before_minutes: number;
}

@Injectable({ providedIn: 'root' })
export class EngineeringService {
  private baseUrl = `${environment.apiBaseUrl}/api/eng`;
  private token: string | null = null;
  private expiresAt: Date | null = null;
  private timerInterval: any = null;
  private reminderShown = false;

  modules$ = new BehaviorSubject<ModuleConfig[]>([]);
  isAuthenticated$ = new BehaviorSubject<boolean>(false);
  remainingSeconds$ = new BehaviorSubject<number>(0);
  showReminder$ = new BehaviorSubject<boolean>(false);

  constructor(private http: HttpClient) {
    this.restoreSession();
    this.loadModules();
  }

  private get headers(): HttpHeaders {
    return new HttpHeaders({ 'X-Engineering-Token': this.token || '' });
  }

  // === Modules (public, no auth needed) ===

  async loadModules(): Promise<void> {
    try {
      const modules = await firstValueFrom(
        this.http.get<ModuleConfig[]>(`${this.baseUrl}/module-config/`)
      );
      this.modules$.next(modules);
    } catch (e) {
      console.warn('[Engineering] Failed to load modules:', e);
    }
  }

  isModuleVisible(moduleKey: string): boolean {
    const mod = this.modules$.value.find(m => m.module_key === moduleKey);
    return mod ? mod.is_visible : true;
  }

  isModuleActive(moduleKey: string): boolean {
    const mod = this.modules$.value.find(m => m.module_key === moduleKey);
    return mod ? mod.is_active : true;
  }

  // === Auth ===

  async login(password: string): Promise<EngineeringSession> {
    const res = await firstValueFrom(
      this.http.post<EngineeringSession>(`${this.baseUrl}/login/`, { password })
    );
    this.token = res.token;
    this.expiresAt = new Date(res.expires_at);
    this.reminderShown = false;
    sessionStorage.setItem('eng_token', res.token);
    sessionStorage.setItem('eng_expires', res.expires_at);
    this.isAuthenticated$.next(true);
    this.startTimer(res.timeout_minutes, res.reminder_before_minutes);
    return res;
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${this.baseUrl}/logout/`, {}, { headers: this.headers })
      );
    } catch (e) {}
    this.clearSession();
  }

  async extend(): Promise<void> {
    const res = await firstValueFrom(
      this.http.post<any>(`${this.baseUrl}/extend/`, {}, { headers: this.headers })
    );
    this.expiresAt = new Date(res.expires_at);
    this.reminderShown = false;
    sessionStorage.setItem('eng_expires', res.expires_at);
    this.showReminder$.next(false);
  }

  async verify(): Promise<boolean> {
    try {
      const res = await firstValueFrom(
        this.http.post<any>(`${this.baseUrl}/verify/`, {}, { headers: this.headers })
      );
      return res.valid === true;
    } catch {
      return false;
    }
  }

  // === Config ===

  getConfig(): Observable<any> {
    return this.http.get(`${this.baseUrl}/config/`, { headers: this.headers });
  }

  updateConfig(data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/config/`, data, { headers: this.headers });
  }

  changePassword(oldPassword: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/change-password/`, {
      old_password: oldPassword,
      new_password: newPassword,
    }, { headers: this.headers });
  }

  // === Module control (auth required) ===

  updateModule(id: number, data: Partial<ModuleConfig>): Observable<any> {
    return this.http.patch(`${this.baseUrl}/module-config/${id}/`, data, { headers: this.headers });
  }

  // === Dashboard ===

  getDashboard(): Observable<any> {
    return this.http.get(`${this.baseUrl}/dashboard/`, { headers: this.headers });
  }

  // === Session management ===

  private restoreSession(): void {
    const token = sessionStorage.getItem('eng_token');
    const expires = sessionStorage.getItem('eng_expires');
    if (token && expires) {
      const expDate = new Date(expires);
      if (expDate > new Date()) {
        this.token = token;
        this.expiresAt = expDate;
        this.isAuthenticated$.next(true);
        const remaining = (expDate.getTime() - Date.now()) / 60000;
        this.startTimer(remaining, 10);
      } else {
        this.clearSession();
      }
    }
  }

  private clearSession(): void {
    this.token = null;
    this.expiresAt = null;
    sessionStorage.removeItem('eng_token');
    sessionStorage.removeItem('eng_expires');
    this.isAuthenticated$.next(false);
    this.showReminder$.next(false);
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private startTimer(timeoutMinutes: number, reminderBefore: number): void {
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {
      if (!this.expiresAt) return;

      const remaining = (this.expiresAt.getTime() - Date.now()) / 1000;
      this.remainingSeconds$.next(Math.max(0, Math.floor(remaining)));

      if (remaining <= 0) {
        this.clearSession();
        return;
      }

      if (remaining <= reminderBefore * 60 && !this.reminderShown) {
        this.reminderShown = true;
        this.showReminder$.next(true);
      }
    }, 1000);
  }
}
