import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LTCSettings, SettingsService } from '../../services/settings.service';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

// Simple regex that accepts http(s)://host:port or http(s)://host
const MACHINE_IP_PATTERN = /^https?:\/\/[\w.-]+(:\d+)?$/;

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
        careCenterName:     [s.careCenterName, Validators.required],
        // Optional — matches http(s)://host or http(s)://host:port
        machineIp:          [s.machineIp ?? '', Validators.pattern(MACHINE_IP_PATTERN)],
        lunchStart:         [s.mealTimeRanges.lunch.start,  Validators.required],
        lunchEnd:           [s.mealTimeRanges.lunch.end,    Validators.required],
        dinnerStart:        [s.mealTimeRanges.dinner.start, Validators.required],
        dinnerEnd:          [s.mealTimeRanges.dinner.end,   Validators.required],
        mealCycleStartDate: [s.mealCycle.startDate,         Validators.required],
        mealCycleLength:    [s.mealCycle.cycleLength,       [Validators.required, Validators.min(1)]],
      });
    } catch (err) {
      console.error(err);
      this.error = 'Failed to load settings.';
    } finally {
      this.loading = false;
    }
  }

  // Convenience getter for template validation feedback
  get machineIpInvalid(): boolean {
    const ctrl = this.settingsForm?.get('machineIp');
    return !!(ctrl?.invalid && (ctrl.dirty || ctrl.touched));
  }

  async saveSettings() {
    if (!this.settingsForm.valid) {
      this.error = 'Please fill in all required fields correctly.';
      return;
    }

    this.saving = true;
    this.error = null;
    this.successMessage = null;

    const v = this.settingsForm.value;

    const updatedSettings = {
      care_center_name:       v.careCenterName,
      // Send null to backend when field is cleared, not an empty string
      machine_ip:             v.machineIp?.trim() || null,
      lunch_start:            v.lunchStart,
      lunch_end:              v.lunchEnd,
      dinner_start:           v.dinnerStart,
      dinner_end:             v.dinnerEnd,
      meal_cycle_start_date:  v.mealCycleStartDate,
      meal_cycle_length:      v.mealCycleLength,
    };

    try {
      await this.updateSettings(updatedSettings);
      this.successMessage = 'Settings updated successfully!';
      await this.settingsService.load();
    } catch (err) {
      console.error(err);
      this.error = 'Failed to save settings. Please try again.';
    } finally {
      this.saving = false;
    }
  }

  private async updateSettings(data: any) {
    const id = this.settingsService.settings?.id;
    if (!id) throw new Error('Settings not loaded');

    // Uses the publicly exposed http from the service — no private member hack
    await firstValueFrom(
      this.settingsService.http.put(`${environment.apiBaseUrl}/api/settings/${id}/`, data)
    );
  }
}