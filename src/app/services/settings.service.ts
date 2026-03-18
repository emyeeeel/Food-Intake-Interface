import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface MealCycle {
  startDate: string;
  cycleLength: number;
}

export interface MealTimeRanges {
  lunch: { start: string; end: string };
  dinner: { start: string; end: string };
}

export interface LTCSettings {
  id: number;
  careCenterName: string;
  machineIp: string | null;       // ← added
  mealCycle: MealCycle;
  mealTimeRanges: MealTimeRanges;
}

@Injectable({ providedIn: 'root' })
export class SettingsService {

  private _settings: LTCSettings | null = null;

  // Exposed publicly so components can call PUT without accessing private members
  readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  async load(): Promise<void> {
    const id = environment.machineID;
    try {
      const raw = await firstValueFrom(
        this.http.get<any>(`${environment.apiBaseUrl}/api/settings/${id}/`)
      );

      this._settings = {
        id: raw.id,
        careCenterName: raw.care_center_name,
        machineIp: raw.machine_ip ?? null,    // ← added
        mealCycle: {
          startDate: raw.meal_cycle_start_date,
          cycleLength: raw.meal_cycle_length,
        },
        mealTimeRanges: {
          lunch:  { start: raw.lunch_start,  end: raw.lunch_end  },
          dinner: { start: raw.dinner_start, end: raw.dinner_end },
        },
      };
    } catch (error) {
      console.error('Settings load failed:', error);
      this._settings = null;
    }
  }

  get settings(): LTCSettings | null { return this._settings; }
  get careCenterName(): string | undefined { return this._settings?.careCenterName; }
  get machineIp(): string | null | undefined { return this._settings?.machineIp; }
  get mealCycle(): MealCycle | undefined { return this._settings?.mealCycle; }
  get mealTimeRanges(): MealTimeRanges | undefined { return this._settings?.mealTimeRanges; }
}