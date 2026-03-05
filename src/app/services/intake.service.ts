import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { finalize, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SettingsService } from './settings.service';
import { IntakeRecord } from '../models/food-intake.model';
import { MealAssignment } from '../models/meal-assignment.mode';
import { MealAssignmentService } from './meal-assignment.service';

@Injectable({
  providedIn: 'root',
})
export class IntakeService {
  private baseUrl = environment.apiBaseUrl;
  private apiUrl = `${this.baseUrl}/api/food-intakes/`;
  
  constructor(private http: HttpClient, private settingsService: SettingsService, private mealAssignments: MealAssignmentService) {}

  getIntakes(): Observable<IntakeRecord[]> {
    return this.http.get<IntakeRecord[]>(this.apiUrl);
  }

  getIntakeByLtcPatientId(ltcPatientId: number): Observable<IntakeRecord[]> {
    const params = new HttpParams().set('ltc_patient_id', ltcPatientId.toString());

    return this.http.get<IntakeRecord[]>(this.apiUrl, { params });
  }

  createIntake(data: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}`, data);
  }
  
  // createIntake(intake: Partial<IntakeRecord>): Observable<IntakeRecord> {
  //   const formData = new FormData();
  //   formData.append('meal', intake.meal?.toString() || '');
  //   formData.append('ltc_patient', intake.ltc_patient?.toString() || '');
  //   formData.append('weight_g', intake.weight_g?.toString() || '');
  //   formData.append('volume_ml', intake.volume_ml?.toString() || '');
  //   formData.append('recorded_at', intake.recorded_at || '');
  //   formData.append('meal_phase', intake.meal_phase?.toString() || '');
  //   if (intake.image instanceof File) {
  //     formData.append('image', intake.image);
  //   }
  //   if(intake.depth_csv instanceof File){
  //     formData.append('csv', intake.depth_csv);
  //   }
  //   const start = performance.now();

  //   return this.http.post<IntakeRecord>(this.apiUrl, formData).pipe(
  //     finalize(() => {
  //       const end = performance.now();
  //       const latency = end - start;
  //       console.log(`createIntake latency: ${latency.toFixed(2)} ms`);
  //     })
  //   );
  // }
  //method to check if there are entry for food intakes of ltc_patient based on 'lunch' or 'dinner' and recorded date (which should match todays date) filter
  //this will return the filtered list of IntakeRecord[] for the matched records
 getMealPhasesForDate(
  ltcPatientId: number,
  mealPeriod: '午餐' | '晚餐',
  date: Date = new Date()
): Observable<'前' | '後' | 'done' | null> {

  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  return this.getIntakeByLtcPatientId(ltcPatientId).pipe(
    map(records => {
      const existingPhases = new Set<'前' | '後'>();

      records.forEach(record => {
        if (!record.recorded_at) return;

        const recordDate = new Date(record.recorded_at);

        // ✅ Compare calendar date only (ignore time)
        const isSameDate =
          recordDate.getFullYear() === targetDate.getFullYear() &&
          recordDate.getMonth() === targetDate.getMonth() &&
          recordDate.getDate() === targetDate.getDate();

        if (!isSameDate) return;

        // ✅ Only include the records that match the requested mealPeriod
        if (record.meal_detail.meal_time !== mealPeriod) return;

        // Add the meal_phase
        if (record.meal_phase === '前' || record.meal_phase === '後') {
          existingPhases.add(record.meal_phase);
        }
      });

      // Decide return value
      if (existingPhases.has('前') && existingPhases.has('後')) return 'done';
      if (existingPhases.has('前')) return '前';
      if (existingPhases.has('後')) return '後';
      return null;
    })
  );
}

getMealAssignmentID(
  ltcPatientId: number,
  mealPeriod: '午餐' | '晚餐',
  date: Date = new Date()
): Observable<number | 0> {

  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  return this.getIntakeByLtcPatientId(ltcPatientId).pipe(
    map(records => {

      // Find the first intake record matching date AND mealPeriod
      const matchedIntake = records.find(record => {
        if (!record.recorded_at) return false;

        const recordDate = new Date(record.recorded_at);

        const isSameDate =
          recordDate.getFullYear() === targetDate.getFullYear() &&
          recordDate.getMonth() === targetDate.getMonth() &&
          recordDate.getDate() === targetDate.getDate();

        // ✅ match mealPeriod as well
        return isSameDate && record.meal_detail.meal_time === mealPeriod;
      });

      if (!matchedIntake) return null;

      // Assuming IntakeRecord has a reference to MealAssignment
      // For example, if IntakeRecord has "meal_assignment" field
     // return (matchedIntake as any).meal_detail['meal_name'] || null;
      return (matchedIntake as any).meal || 0;
    })
  );
}

// In IntakeService
getIntakesByMealPeriod(
  ltcPatientId: number,
  mealPeriod: '午餐' | '晚餐',
  date: Date = new Date()
): Observable<IntakeRecord[]> {
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  return this.getIntakeByLtcPatientId(ltcPatientId).pipe(
    map(records => {
      return records.filter(record => {
        
        if (!record.recorded_at) return false;

        const recordDate = new Date(record.recorded_at);

        // Compare calendar date only
        const isSameDate =
          recordDate.getFullYear() === targetDate.getFullYear() &&
          recordDate.getMonth() === targetDate.getMonth() &&
          recordDate.getDate() === targetDate.getDate();

        // Only include records for the requested mealPeriod
        // const isMealPeriodMatch = record.meal_detail?.meal_time === mealPeriod;

        return isSameDate;
      });
    })
  );
}

getAssignmentsByMealPeriod(
  ltcPatientId: number,
  mealPeriod: '午餐' | '晚餐' | 0,
  dayCycle: number
): Observable<MealAssignment[]> {

 return this.mealAssignments.getMealAssignmentsByLTCPatient(ltcPatientId).pipe(
  map(records => {

    // console.log("RAW assignments from API:", records);

    return records.filter(record => {
      // console.log("Checking record:", record);

      const isMealPeriodMatch = record.meal_detail?.meal_time === mealPeriod;
      const isDayCycleMatch = record.meal_detail?.day_cycle === dayCycle;

      // console.log(
      //   "meal match:", record.meal_detail?.meal_time,
      //   "==", mealPeriod,
      //   isMealPeriodMatch
      // );

      // console.log(
      //   "day match:", record.meal_detail?.day_cycle,
      //   "==", dayCycle,
      //   isDayCycleMatch
      // );

      return isMealPeriodMatch && isDayCycleMatch;
    });
  })
);
}
}
