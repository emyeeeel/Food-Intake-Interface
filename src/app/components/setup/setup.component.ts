import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LTCSettings, SettingsService } from '../../services/settings.service';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-setup',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './setup.component.html',
  styleUrl: './setup.component.scss',
})
export class SetupComponent implements OnInit {
  settingsForm!: FormGroup;
  loading = false;
  saving = false;
  error: string | null = null;
  successMessage: string | null = null;

  constructor(private fb: FormBuilder, private settingsService: SettingsService) {}

  async ngOnInit() {
    this.loading = true;
    try {
      await this.settingsService.load();
      const s = this.settingsService.settings as LTCSettings;

      this.settingsForm = this.fb.group({
        careCenterName: [s.careCenterName, Validators.required],
        lunchStart: [s.mealTimeRanges.lunch.start, Validators.required],
        lunchEnd: [s.mealTimeRanges.lunch.end, Validators.required],
        dinnerStart: [s.mealTimeRanges.dinner.start, Validators.required],
        dinnerEnd: [s.mealTimeRanges.dinner.end, Validators.required],
        mealCycleStartDate: [s.mealCycle.startDate, Validators.required],
        mealCycleLength: [s.mealCycle.cycleLength, [Validators.required, Validators.min(1)]],
      });
    } catch (err) {
      console.error(err);
      this.error = 'Failed to load settings.';
    } finally {
      this.loading = false;
    }
  }

  /**
   * Save updated settings
   */
  async saveSettings() {
    if (!this.settingsForm.valid) {
      this.error = 'Please fill in all required fields correctly.';
      return;
    }

    this.saving = true;
    this.error = null;
    this.successMessage = null;

    const formValues = this.settingsForm.value;

    // Map frontend camelCase to backend snake_case
    const updatedSettings = {
      care_center_name: formValues.careCenterName,
      lunch_start: formValues.lunchStart,
      lunch_end: formValues.lunchEnd,
      dinner_start: formValues.dinnerStart,
      dinner_end: formValues.dinnerEnd,
      meal_cycle_start_date: formValues.mealCycleStartDate,
      meal_cycle_length: formValues.mealCycleLength,
    };

    try {
      await this.updateSettings(updatedSettings);
      this.successMessage = 'Settings updated successfully!';
      await this.settingsService.load(); // refresh local cache
    } catch (err) {
      console.error(err);
      this.error = 'Failed to save settings. Please try again.';
    } finally {
      this.saving = false;
    }
  }

  /**
   * PUT the updated settings to backend
   */
  private async updateSettings(data: any) {
    const id = this.settingsService.settings?.id;
    if (!id) throw new Error('Settings not loaded');

    await firstValueFrom(
      this.settingsService['http'].put(`${environment.apiBaseUrl}/api/settings/${id}/`, data)
    );
  }
}
