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
  mealCycle: MealCycle;
  mealTimeRanges: MealTimeRanges;
}

@Injectable({ providedIn: 'root' })
export class SettingsService {

  private _settings: LTCSettings | null = null;

  constructor(private http: HttpClient) {}

  /**
   * Load the LTC settings from backend for the specific careCenterID
   */
  async load(): Promise<void> {
    const id = environment.careCenterID;
    const raw = await firstValueFrom(
      this.http.get<any>(`${environment.apiBaseUrl}/api/settings/${id}/`)
    );

    // Map backend snake_case to frontend camelCase
    this._settings = {
      id: raw.id,
      careCenterName: raw.care_center_name,
      mealCycle: {
        startDate: raw.meal_cycle_start_date,
        cycleLength: raw.meal_cycle_length
      },
      mealTimeRanges: {
        lunch: { start: raw.lunch_start, end: raw.lunch_end },
        dinner: { start: raw.dinner_start, end: raw.dinner_end }
      }
    };
  }

  /**
   * Raw settings object
   */
  get settings(): LTCSettings | null {
    return this._settings;
  }

  /**
   * Convenience getter for care center name
   */
  get careCenterName(): string | undefined {
    return this._settings?.careCenterName;
  }

  /**
   * Convenience getter for meal cycle
   */
  get mealCycle(): MealCycle | undefined {
    return this._settings?.mealCycle;
  }

  /**
   * Convenience getter for meal time ranges
   */
  get mealTimeRanges(): MealTimeRanges | undefined {
    return this._settings?.mealTimeRanges;
  }
}