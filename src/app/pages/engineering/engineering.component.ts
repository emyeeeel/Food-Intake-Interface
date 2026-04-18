import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { EngineeringService, ModuleConfig } from '../../services/engineering.service';

@Component({
  selector: 'app-engineering',
  imports: [CommonModule, FormsModule],
  templateUrl: './engineering.component.html',
  styleUrl: './engineering.component.scss',
})
export class EngineeringComponent implements OnInit, OnDestroy {
  // Auth
  isAuthenticated = false;
  password = '';
  loginError = '';
  loginLoading = false;

  // Modules
  modules: ModuleConfig[] = [];

  // Dashboard
  dashboard: any = null;
  dashboardLoading = false;

  // Settings
  showSettings = false;
  timeoutMinutes = 180;
  reminderMinutes = 10;
  oldPassword = '';
  newPassword = '';
  confirmPassword = '';
  settingsMessage = '';
  settingsError = '';

  // Session
  remainingSeconds = 0;
  showReminder = false;

  // Tab
  activeTab: 'modules' | 'dashboard' | 'settings' = 'modules';

  private subs: Subscription[] = [];

  constructor(
    public engService: EngineeringService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.engService.isAuthenticated$.subscribe(v => {
        this.isAuthenticated = v;
        if (v) {
          this.loadData();
        }
      }),
      this.engService.remainingSeconds$.subscribe(v => this.remainingSeconds = v),
      this.engService.showReminder$.subscribe(v => this.showReminder = v),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  // === Auth ===

  async onLogin(): Promise<void> {
    this.loginError = '';
    this.loginLoading = true;
    try {
      await this.engService.login(this.password);
      this.password = '';
    } catch (e: any) {
      this.loginError = e?.error?.error || '密碼錯誤';
    } finally {
      this.loginLoading = false;
    }
  }

  async onLogout(): Promise<void> {
    await this.engService.logout();
  }

  async onExtend(): Promise<void> {
    await this.engService.extend();
    this.showReminder = false;
  }

  // === Data loading ===

  async loadData(): Promise<void> {
    await this.engService.loadModules();
    this.modules = this.engService.modules$.value;
    this.loadDashboard();
    this.loadConfig();
  }

  async loadDashboard(): Promise<void> {
    this.dashboardLoading = true;
    this.engService.getDashboard().subscribe({
      next: (data) => { this.dashboard = data; this.dashboardLoading = false; },
      error: () => { this.dashboardLoading = false; },
    });
  }

  loadConfig(): void {
    this.engService.getConfig().subscribe({
      next: (config) => {
        this.timeoutMinutes = config.session_timeout_minutes;
        this.reminderMinutes = config.reminder_before_minutes;
      },
    });
  }

  // === Module control ===

  onToggleActive(mod: ModuleConfig): void {
    const newVal = !mod.is_active;
    console.log(`[ENG] Toggle active: ${mod.module_key} → ${newVal}`);
    mod.is_active = newVal;
    this.engService.updateModule(mod.id, { is_active: newVal }).subscribe({
      next: () => this.engService.loadModules(),
      error: () => { mod.is_active = !newVal; },
    });
  }

  onToggleVisible(mod: ModuleConfig): void {
    if (!mod.is_active || mod.is_engineering) return;
    const newVal = !mod.is_enabled;
    console.log(`[ENG] Toggle visible: ${mod.module_key} → ${newVal}`);
    mod.is_enabled = newVal;
    this.engService.updateModule(mod.id, { is_enabled: newVal }).subscribe({
      next: (res) => { console.log('[ENG] Visible updated:', res); this.engService.loadModules(); },
      error: (err) => { console.error('[ENG] Visible error:', err); mod.is_enabled = !newVal; },
    });
  }

  onToggleEng(mod: ModuleConfig): void {
    if (!mod.is_active) return;
    const newVal = !mod.is_engineering;
    console.log(`[ENG] Toggle eng: ${mod.module_key} → ${newVal}`);
    mod.is_engineering = newVal;
    this.engService.updateModule(mod.id, { is_engineering: newVal }).subscribe({
      next: (res) => { console.log('[ENG] Eng updated:', res); this.engService.loadModules(); },
      error: (err) => { console.error('[ENG] Eng error:', err); mod.is_engineering = !newVal; },
    });
  }

  getModuleStatus(mod: ModuleConfig): string {
    if (!mod.is_active) return '頁面已關閉 (403)';
    if (mod.is_engineering) return '工程模式（使用者不可見）';
    if (mod.is_enabled) return '已啟用';
    return '選單已隱藏';
  }

  getModuleStatusClass(mod: ModuleConfig): string {
    if (!mod.is_active) return 'status-inactive';
    if (mod.is_engineering) return 'status-engineering';
    if (mod.is_enabled) return 'status-enabled';
    return 'status-disabled';
  }

  navigateToModule(mod: ModuleConfig): void {
    this.router.navigate([mod.route_path]);
  }

  // === Settings ===

  saveConfig(): void {
    this.settingsMessage = '';
    this.settingsError = '';
    this.engService.updateConfig({
      session_timeout_minutes: this.timeoutMinutes,
      reminder_before_minutes: this.reminderMinutes,
    }).subscribe({
      next: () => this.settingsMessage = '設定已儲存',
      error: () => this.settingsError = '儲存失敗',
    });
  }

  changePassword(): void {
    this.settingsMessage = '';
    this.settingsError = '';
    if (this.newPassword !== this.confirmPassword) {
      this.settingsError = '新密碼不一致';
      return;
    }
    if (this.newPassword.length < 4) {
      this.settingsError = '密碼至少 4 碼';
      return;
    }
    this.engService.changePassword(this.oldPassword, this.newPassword).subscribe({
      next: () => {
        this.settingsMessage = '密碼已更新';
        this.oldPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
      },
      error: (e) => this.settingsError = e?.error?.error || '更新失敗',
    });
  }

  // === Helpers ===

  formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
}
