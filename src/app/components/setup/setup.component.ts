import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { LTCSettings, SettingsService } from '../../services/settings.service';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

// Simple regex that accepts http(s)://host:port or http(s)://host
const MACHINE_IP_PATTERN = /^https?:\/\/[\w.-]+(:\d+)?$/;

@Component({
  selector: 'app-setup',
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './setup.component.html',
  styleUrl: './setup.component.scss',
})
export class SetupComponent implements OnInit {
  settingsForm!: FormGroup;
  loading = false;
  saving = false;
  error: string | null = null;
  successMessage: string | null = null;
  deviceId: string | null = null;

  // WLED
  wledExpanded = false;
  wledScanning = false;
  wledDevices: any[] = [];
  wledSelectedIp: string | null = null;
  wledColor = '#ffffff';
  wledBrightness = 178;
  wledOn = true;
  wledError: string | null = null;

  constructor(private fb: FormBuilder, private settingsService: SettingsService, private http: HttpClient) {}

  async ngOnInit() {
    this.loading = true;
    try {
      await this.settingsService.load();
      const s = this.settingsService.settings as LTCSettings;

      this.settingsForm = this.fb.group({
        careCenterName:     [s.careCenterName, Validators.required],
        // Optional — matches http(s)://host or http(s)://host:port
        machineIp:          [s.machineIp ?? '', Validators.pattern(MACHINE_IP_PATTERN)],
        menuMode:           [s.menuMode ?? 'cyclic', Validators.required],
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

    this.loadDeviceId();
  }

  private loadDeviceId(): void {
    const machineIp = this.settingsService.machineIp;
    if (!machineIp) return;
    this.http.get<{ device_id: string }>(`${machineIp}/api/device-info/`).subscribe({
      next: (res) => this.deviceId = res.device_id,
      error: () => this.deviceId = null,
    });
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
      menu_mode:              v.menuMode,
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

    await firstValueFrom(
      this.settingsService.http.put(`${environment.apiBaseUrl}/api/settings/${id}/`, data)
    );
  }

  // === WLED ===

  scanWled(): void {
    const machineIp = this.settingsService.machineIp;
    if (!machineIp) {
      this.wledError = '請先設定機器 IP';
      return;
    }
    this.wledScanning = true;
    this.wledError = null;
    this.wledDevices = [];

    this.http.get<any>(`${machineIp}/api/wled/scan/`).subscribe({
      next: (res) => {
        this.wledDevices = res.devices || [];
        this.wledScanning = false;
        if (this.wledDevices.length === 0) {
          this.wledError = '未找到 WLED 裝置';
        } else {
          const saved = localStorage.getItem('wled_ip');
          const found = this.wledDevices.find((d: any) => d.ip === saved);
          this.wledSelectedIp = found ? found.ip : this.wledDevices[0].ip;
          this.loadWledStatus();
        }
      },
      error: () => {
        this.wledScanning = false;
        this.wledError = '掃描失敗，請確認裝置已連線';
      },
    });
  }

  selectWledDevice(ip: string): void {
    this.wledSelectedIp = ip;
    localStorage.setItem('wled_ip', ip);
    this.loadWledStatus();
  }

  loadWledStatus(): void {
    if (!this.wledSelectedIp) return;
    const machineIp = this.settingsService.machineIp;
    if (!machineIp) return;

    this.http.get<any>(`${machineIp}/api/wled/status/?ip=${this.wledSelectedIp}`).subscribe({
      next: (state) => {
        this.wledOn = state.on ?? true;
        this.wledBrightness = state.bri ?? 128;
        if (state.seg?.[0]?.col?.[0]) {
          const [r, g, b] = state.seg[0].col[0];
          this.wledColor = '#' + [r, g, b].map((c: number) => c.toString(16).padStart(2, '0')).join('');
        }
      },
      error: () => {},
    });
  }

  sendWledCommand(cmd: any): void {
    if (!this.wledSelectedIp) return;
    const machineIp = this.settingsService.machineIp;
    if (!machineIp) return;

    this.http.post(`${machineIp}/api/wled/control/`, { ip: this.wledSelectedIp, ...cmd }).subscribe({
      error: () => this.wledError = '控制指令失敗',
    });
  }

  toggleWled(): void {
    this.wledOn = !this.wledOn;
    this.sendWledCommand({ on: this.wledOn });
  }

  onWledColorChange(): void {
    const r = parseInt(this.wledColor.slice(1, 3), 16);
    const g = parseInt(this.wledColor.slice(3, 5), 16);
    const b = parseInt(this.wledColor.slice(5, 7), 16);
    this.sendWledCommand({ seg: [{ col: [[r, g, b]] }] });
  }

  onWledBrightnessChange(): void {
    this.sendWledCommand({ bri: this.wledBrightness });
  }

  setWledPreset(r: number, g: number, b: number, label: string): void {
    this.wledColor = '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
    this.sendWledCommand({ on: true, seg: [{ col: [[r, g, b]] }] });
    this.wledOn = true;
  }
}